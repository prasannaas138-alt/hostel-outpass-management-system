import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppHeader({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
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
        <button className="secondary-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
