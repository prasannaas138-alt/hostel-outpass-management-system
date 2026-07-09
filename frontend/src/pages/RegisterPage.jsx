import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const YEARS = ['1', '2', '3', '4'];
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA', 'MCA', 'General'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Student',
    department: 'CSE',
    year: '1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = form.role === 'Student';

  const handleChange = (e) => {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: isStudent ? form.department : 'General',
        year: isStudent ? form.year : 'NA',
      };

      const { data } = await api.post('/auth/register', payload);

      login(data);
      navigate(roleHome[data.user.role], { replace: true });
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

          <form className="auth-form" onSubmit={handleSubmit} style={{ padding: '2.5rem 3rem' }}>
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
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your.name@sjctni.edu"
                required
              />
            </label>

            <label>
              Create Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </label>

            {isStudent && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>
                  Department
                  <select name="department" value={form.department} onChange={handleChange} required>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Year of Study
                  <select name="year" value={form.year} onChange={handleChange} required>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <AlertBanner type="error" message={error} />

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
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
