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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Submitting login request:', { email: form.email, role: form.role });
      const { data } = await api.post('/auth/login', form);

      console.log('Login response:', data);

      if (!data?.success) {
        setError('Login failed.');
        return;
      }

      if (data.user.role !== form.role) {
        console.log('Role mismatch on frontend, using backend role for redirect:', {
          selectedRole: form.role,
          backendRole: data.user.role,
        });
      }

      login(data);
      setSuccess('Login successful. Redirecting to dashboard...');
      navigate(roleHome[data.user.role], { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Hostel Outpass Management System</p>
          <h1>Simple, role-aware outpass control.</h1>
          <p>
            A single login sends students and staff into focused dashboards with approval flow tracking, rejection reasons, and downloadable PDFs.
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Student</strong>
              <span>Apply, track, reapply</span>
            </div>
            <div>
              <strong>HOD / Sister</strong>
              <span>Approve home requests in sequence</span>
            </div>
            <div>
              <strong>Warden</strong>
              <span>Final approval for outing and home</span>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
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
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <AlertBanner type="error" message={error} />
          <AlertBanner type="success" message={success} />

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          {loading ? <LoadingState label="Checking credentials..." /> : null}

          <p className="hint">
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Register here
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
