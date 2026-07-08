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
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Hostel Outpass Management System</p>
          <h1>Create your account.</h1>
          <p>
            Register with your role to get started. Each role gives you a dedicated dashboard — students can apply for outpasses, while HOD, Sister, and Warden can review and approve them.
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Student</strong>
              <span>Apply, track &amp; reapply for outpass requests</span>
            </div>
            <div>
              <strong>HOD / Sister</strong>
              <span>Review and approve home leave requests</span>
            </div>
            <div>
              <strong>Warden</strong>
              <span>Final approval authority for all outpasses</span>
            </div>
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Sign in here
            </Link>
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            Role
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
              placeholder="your@email.com"
              required
            />
          </label>

          <label>
            Password
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
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {isStudent && (
            <>
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
            </>
          )}

          <AlertBanner type="error" message={error} />

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {loading && <LoadingState label="Setting up your account..." />}

          <p className="hint">
            Your account is tied to your selected role. You can register the same email under multiple roles if needed.
          </p>
        </form>
      </section>
    </main>
  );
}
