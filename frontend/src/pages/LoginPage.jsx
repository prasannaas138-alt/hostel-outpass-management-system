import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
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
  const [form, setForm] = useState({ email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <header className="auth-header">
        <div className="auth-header-left"></div>
        <div className="auth-header-center">
          <img src="/st-joseph-logo.png" alt="St. Joseph's University" className="auth-header-logo" onError={(e) => {e.target.style.display='none';}} />
        </div>
        <div className="auth-header-right">
          <img src="/homs-logo.png" alt="H.O.M.S Logo" className="auth-header-brand" onError={(e) => {e.target.style.display='none';}} />
        </div>
      </header>

      <div className="auth-main">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Welcome to St. Joseph's University Hostel Portal</p>
            <h1>H.O.M.S</h1>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontWeight: 500, fontSize: '1.4rem' }}>Hostel Outpass Management System</h3>
            <p>
              Apply for hostel permissions, track requests, and manage approvals with ease.
            </p>
            
            <div className="auth-highlights">
              <div>
                <strong>🎓 Student</strong>
                <span>Apply for hostel leave and track request status.</span>
              </div>
              <div>
                <strong>👩‍🏫 HOD / Sister</strong>
                <span>Review and manage student requests.</span>
              </div>
              <div>
                <strong>🛡️ Warden</strong>
                <span>Approve hostel outpasses and monitor requests.</span>
              </div>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontSize: '1.8rem' }}>Sign In</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>Access your university portal</p>
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
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your.name@sjctni.edu" required />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </label>

            <AlertBanner type="error" message={error} />
            <AlertBanner type="success" message={successMessage} />

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>

            <Link to="/register" className="secondary-button auth-secondary-cta">
              Register Here
            </Link>

            {loading ? <LoadingState label="Connecting to university server..." /> : null}

            <p className="hint" style={{ marginTop: '1rem' }}>
              Don&apos;t have an account?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                create one now
              </Link>
            </p>
          </form>
        </section>
      </div>

      <footer className="auth-footer">
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>H.O.M.S — Hostel Outpass Management System</h4>
        <p>St. Joseph's University</p>
        <p>Making hostel management simple and accessible.</p>
      </footer>
    </main>
  );
}
