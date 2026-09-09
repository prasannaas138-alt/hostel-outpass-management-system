import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import { AuthBrandPanel, PasswordField } from '../components/AuthPanels';
import '../styles/auth.css';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA', 'MCA', 'BBA', 'BCom', 'BA', 'Other'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    registerNumber: '',
    department: 'CSE',
    roomNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const normalizedEmail = form.email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Invalid email address.');
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: normalizedEmail,
        registerNumber: form.registerNumber,
        department: form.department,
        roomNumber: form.roomNumber,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: 'Student',
      };

      await api.post('/auth/register', payload);
      setSuccess('Registration successful.');
      navigate('/login', { replace: true, state: { successMessage: 'Registration successful.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
        <div className="auth-brand-row">
          <img src="/st-joseph-logo.png" alt="St. Joseph's University" onError={(e) => {e.target.style.display='none';}} />
          <div>
            <strong>H.O.M.S — Hostel Outpass Management System</strong>
            <span>St. Joseph&apos;s University · Hostel Portal</span>
          </div>
          <img src="/homs-logo.png" alt="H.O.M.S Logo" onError={(e) => {e.target.style.display='none';}} />
        </div>

        <section className="auth-card auth-card--modern">
          <AuthBrandPanel subtitle="Create Your Account" showSignInLink />

          <form className="auth-form auth-form--modern auth-form--register" onSubmit={handleSubmit}>
            <div className="auth-form-head">
              <h2>Register</h2>
              <p>Set up your portal access</p>
            </div>

            <fieldset className="auth-fieldset">
              <legend>Personal details</legend>
              <div className="auth-stack">
                <label>
                  Full Name
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  College Email ID
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your.name@college.edu"
                    autoComplete="email"
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="auth-fieldset">
              <legend>Hostel details</legend>
              <div className="auth-form-grid">
                <label>
                  Register Number
                  <input
                    name="registerNumber"
                    type="text"
                    value={form.registerNumber}
                    onChange={handleChange}
                    placeholder="Enter your register number"
                    required
                  />
                </label>

                <label>
                  Department
                  <select name="department" value={form.department} onChange={handleChange} required>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Room Number
                <input
                  name="roomNumber"
                  type="text"
                  value={form.roomNumber}
                  onChange={handleChange}
                  placeholder="Room / bed number"
                  required
                />
              </label>
            </fieldset>

            <fieldset className="auth-fieldset">
              <legend>Security</legend>
              <div className="auth-note">
                <strong>For first-time student users</strong>
                <span>Create a separate H.O.M.S password. Do not use or share your Gmail password.</span>
              </div>

              <div className="auth-form-grid">
                <PasswordField
                  label="Create Password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                />

                <PasswordField
                  label="Confirm Password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </fieldset>

            <div className="auth-info-strip">
              <span>Notice:</span>
              <span>Staff accounts are managed by the college administration.</span>
            </div>

            <AlertBanner type="error" message={error} />
            <AlertBanner type="success" message={success} />

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            {loading ? <LoadingState label="Creating your H.O.M.S account..." /> : null}

            <p className="hint">
              Already registered?{' '}
              <Link to="/login" className="secondary-button auth-secondary-cta">
                Sign in instead
              </Link>
            </p>
          </form>
        </section>
      </div>

      <footer className="auth-footer">
        <h4>H.O.M.S — Hostel Outpass Management System</h4>
        <p>St. Joseph&apos;s University</p>
        <p>Making hostel management simple and accessible.</p>
      </footer>
    </main>
  );
}
