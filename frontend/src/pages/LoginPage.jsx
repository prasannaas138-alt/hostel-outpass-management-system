import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import { AuthBrandPanel, PasswordField } from '../components/AuthPanels';
import '../styles/auth.css';

const roleHome = {
  Student: '/student-dashboard',
  HOD: '/hod-dashboard',
  Sister: '/sister-dashboard',
  Warden: '/warden-dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const successMessage = location.state?.successMessage || '';

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);

      if (!data?.success) {
        setError('Login failed. Please check your credentials.');
        return;
      }

      login(data);
      navigate(roleHome[data.user.role], { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <button
        className="auth-hamburger"
        type="button"
        onClick={() => setBrandPanelOpen((open) => !open)}
        aria-label={brandPanelOpen ? 'Close brand panel' : 'Open brand panel'}
        aria-expanded={brandPanelOpen}
      >
        ☰
      </button>

      <header className="auth-header">
        <div className="auth-header-left">
        </div>
        <div className="auth-header-center">
          <img src="/st-joseph-logo.png" alt="St. Joseph's University" className="auth-header-logo" onError={(e) => {e.target.style.display='none';}} />
        </div>
        <div className="auth-header-right">
          <img src="/homs-logo.png" alt="H.O.M.S Logo" className="auth-header-brand" onError={(e) => {e.target.style.display='none';}} />
        </div>
      </header>

      {brandPanelOpen ? (
        <div className="auth-mobile-overlay" onClick={() => setBrandPanelOpen(false)} aria-hidden="true" />
      ) : null}

      <div className={`auth-mobile-brand-panel ${brandPanelOpen ? 'open' : ''}`}>
        <button
          className="auth-mobile-brand-close"
          type="button"
          onClick={() => setBrandPanelOpen(false)}
          aria-label="Close brand panel"
        >
          ✕
        </button>
        <div className="auth-mobile-brand-content">
          <img src="/homs-logo.png" alt="H.O.M.S" className="auth-mobile-brand-logo" onError={(e) => {e.target.style.display='none';}} />
          <h2>H.O.M.S — Hostel Outpass Management System</h2>
          <p>St. Joseph&apos;s University · Hostel Portal</p>
        </div>
        <div className="auth-mobile-brand-body">
          <AuthBrandPanel hideTop subtitle="Hostel Outpass Management System" />
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-brand-row">
          <div>
            <strong>H.O.M.S — Hostel Outpass Management System</strong>
            <span>St. Joseph&apos;s University · Hostel Portal</span>
          </div>
          <img src="/homs-logo.png" alt="H.O.M.S Logo" onError={(e) => {e.target.style.display='none';}} />
        </div>

        <section className="auth-card auth-card--modern">
          <AuthBrandPanel subtitle="Hostel Outpass Management System" />

          <form className="auth-form auth-form--modern" onSubmit={handleSubmit}>
            <div className="auth-form-head">
              <h2>Sign In</h2>
              <p>Access your university portal</p>
            </div>

            <label>
              Choose Your Position
              <select name="role" value={form.role} onChange={handleChange} required>
                <option value="Student">Student</option>
                <option value="HOD">HOD</option>
                <option value="Sister">Sister</option>
                <option value="Warden">Warden</option>
              </select>
            </label>

            <label>
              Email Address
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your.name@sjctni.edu" autoComplete="email" required />
            </label>

            <PasswordField
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Enter your password"
            />

            <AlertBanner type="error" message={error} />
            <AlertBanner type="success" message={successMessage} />

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <Link to="/register" className="secondary-button auth-secondary-cta">
              Register Here
            </Link>

            {loading ? <LoadingState label="Connecting to university server..." /> : null}

            <p className="hint">
              Don&apos;t have an account?{' '}
              <Link to="/register">
                create one now
              </Link>
            </p>
          </form>
        </section>
      </div>

      <footer className="auth-footer">
        <h4>H.O.M.S — Hostel Outpass Management System</h4>
        <p>St. Joseph&apos;s University</p>
        <p>Making hostel outpass management simple and accessible.</p>
      </footer>
    </main>
  );
}
