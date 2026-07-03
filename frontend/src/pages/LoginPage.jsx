import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import '../styles/auth.css';

const roleHome = {
  Student: '/student',
  HOD: '/hod',
  Sister: '/sister',
  Warden: '/warden',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post('/auth/login', form);

      if (data.user.role !== form.role) {
        setError(`This account is registered as ${data.user.role}, not ${form.role}.`);
        return;
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
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </label>

          <AlertBanner type="error" message={error} />
          <AlertBanner type="success" message={success} />

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          {loading ? <LoadingState label="Checking credentials..." /> : null}

          <p className="hint">Use the seeded demo accounts or register custom users through the API.</p>
        </form>
      </section>
    </main>
  );
}
