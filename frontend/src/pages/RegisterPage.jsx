import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import '../styles/auth.css';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA', 'MCA', 'BBA', 'BCom', 'BA', 'Other'];
const HOSTEL_BLOCKS = ['A Block', 'B Block', 'C Block', 'Girls Block', 'Boys Block', 'Admin Block', 'Staff Quarters'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    registerNumber: '',
    department: 'CSE',
    hostelBlock: 'A Block',
    roomNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        hostelBlock: form.hostelBlock,
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
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Welcome to St. Joseph's University Hostel Portal</p>
            <h1>H.O.M.S</h1>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontWeight: 500, fontSize: '1.4rem' }}>Create Your Account</h3>
            <p>
              Join the official university portal to apply for hostel permissions, track requests, and manage approvals with ease.
            </p>

            <div className="auth-note">
              <strong>For first-time student users</strong>
              <span>Create a separate H.O.M.S password. Do not use or share your Gmail password.</span>
            </div>
            
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

            <p style={{ marginTop: '2.5rem', fontSize: '0.95rem' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                Sign in to your account
              </Link>
            </p>
          </div>

          <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontSize: '1.6rem' }}>Register</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>Set up your portal access</p>
            </div>

            <label>
              Full Name
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
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

            <div className="auth-form-grid">
              <label>
                Hostel Block
                <select name="hostelBlock" value={form.hostelBlock} onChange={handleChange} required>
                  {HOSTEL_BLOCKS.map((block) => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </select>
              </label>

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
            </div>

            <label>
              Create Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
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

            <label>
              Confirm Password
              <div className="password-field">
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
            </label>

            <div className="auth-info-strip">
              <span>Staff accounts are managed by the college administration.</span>
              <span>Your password is stored securely with bcrypt hashing.</span>
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
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>H.O.M.S — Hostel Outpass Management System</h4>
        <p>St. Joseph's University</p>
        <p>Making hostel management simple and accessible.</p>
      </footer>
    </main>
  );
}
