import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/student.css';

const WARDEN_NAV = [
  { id: 'warden-requests', label: 'Review Queue', icon: '📥', href: '#warden-requests' },
  { id: 'physical-slip', label: 'Outpass Slip', icon: '📄', href: '#physical-slip' },
];

const wardenActiveId = () => {
  const hash = window.location.hash || '';
  if (hash.includes('physical-slip')) return 'physical-slip';
  return 'warden-requests';
};

export default function WardenLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeId = wardenActiveId();
  const firstName = (user?.name || 'Warden').split(' ')[0];

  return (
    <div className="student-shell student-shell--warden">
      <a className="homs-skip-link" href="#warden-main">
        Skip to main content
      </a>

      <aside className="warden-sidebar" aria-label="Warden primary">
        <div className="warden-brand">
          <img src="/homs-logo.png" alt="H.O.M.S" onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <strong>H.O.M.S</strong>
            <span>St. Joseph&apos;s University</span>
          </div>
        </div>

        <div className="warden-user">
          <span className="warden-avatar" aria-hidden="true">
            {(user?.name || 'W').charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user?.name || 'Warden'}</strong>
            <span>{user?.role || 'Warden'}</span>
          </div>
        </div>

        <nav className="warden-nav" aria-label="Warden sections">
          <a className={`student-link warden-link ${activeId === 'warden-requests' ? 'warden-link--active' : ''}`} href="#warden-requests">
            <span aria-hidden="true">📥</span>
            <span>Review Queue</span>
          </a>
          <a className={`student-link warden-link ${activeId === 'physical-slip' ? 'warden-link--active' : ''}`} href="#physical-slip">
            <span aria-hidden="true">📄</span>
            <span>Outpass Slip</span>
          </a>
        </nav>

        <button className="secondary-button warden-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <div className="warden-content">
        <header className="warden-topbar">
          <div className="warden-topbar-brand">
            <img src="/homs-logo.png" alt="H.O.M.S" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <strong>H.O.M.S</strong>
              <span>St. Joseph&apos;s University</span>
            </div>
          </div>
          <div className="warden-topbar-user">
            <span aria-hidden="true">👋</span>
            <strong>Hello, {firstName}!</strong>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="warden-main" id="warden-main">
          <header className="dashboard-topbar">
            <div>
              <p className="eyebrow">Warden portal</p>
              <h1>{title}</h1>
              <p className="muted">{subtitle}</p>
            </div>
            {actions ? <div className="dashboard-actions">{actions}</div> : null}
          </header>

          {children}
        </main>

        <nav className="warden-bottomnav warden-bottomnav--active" aria-label="Warden mobile">
          {WARDEN_NAV.map((item) => (
            <a key={item.id} className={activeId === item.id ? 'warden-link--active' : ''} href={item.href}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}