import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

export default function AppHeader({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Hostel Control Desk</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="header-actions">
        <div className="user-chip">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
        <button className="secondary-button" onClick={() => setLogoutOpen(true)} type="button">
          Logout
        </button>
      </div>
      {logoutOpen ? (
        <div className="logout-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm logout">
          <div className="logout-confirm-card">
            <h3>Are you sure?</h3>
            <p>You will be signed out of your account.</p>
            <div className="logout-confirm-actions">
              <button className="primary-button" type="button" onClick={confirmLogout}>Yes, logout</button>
              <button className="secondary-button" type="button" onClick={() => setLogoutOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
