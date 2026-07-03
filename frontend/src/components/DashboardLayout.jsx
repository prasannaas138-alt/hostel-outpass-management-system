import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ title, subtitle, navItems, children, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell dashboard-shell--split">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Hostel OS</p>
          <h2>{title}</h2>
          <p className="muted sidebar-copy">{subtitle}</p>
        </div>

        <div className="sidebar-user">
          <span className="sidebar-user__label">Signed in as</span>
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navItems.map((item) => (
            <a key={item.id} className="sidebar-link" href={`#${item.id}`}>
              <span>{item.label}</span>
              {item.description ? <small>{item.description}</small> : null}
            </a>
          ))}
        </nav>

        <button className="secondary-button sidebar-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Request management</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          {actions ? <div className="dashboard-actions">{actions}</div> : null}
        </header>

        {children}
      </main>
    </div>
  );
}
