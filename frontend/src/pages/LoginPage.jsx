import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
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
          <h1>Role-based outpass workflow</h1>
          <p>
            Students apply for outpasses, reviewers process requests in sequence, and approved passes can be downloaded as PDF.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>

          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="hint">
            Create demo users with the backend register endpoint or the included seed script.
          </p>
        </form>
      </section>
    </main>
  );
}
