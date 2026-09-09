import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

const STUDENT_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '#dashboard' },
  { id: 'apply-new-outpass', label: 'Apply', icon: '📝', href: '#apply-new-outpass' },
  { id: 'request-history', label: 'Requests', icon: '📋', href: '#request-history' },
  { id: 'outpass-history', label: 'History', icon: '🕘', href: '#outpass-history' },
  { id: 'profile', label: 'Profile', icon: '👤', href: '#profile' },
];

export default function StudentLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const firstName = (user?.name || 'Student').split(' ')[0];

  return (
    <div className="student-shell">
      <a className="homs-skip-link" href="#student-main">
        Skip to main content
      </a>

      <aside className="student-sidebar" aria-label="Student primary">
        <div className="student-brand">
          <img src="/homs-logo.png" alt="H.O.M.S" onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <strong>H.O.M.S</strong>
            <span>St. Joseph&apos;s University</span>
          </div>
        </div>

        <div className="student-user">
          <span className="student-avatar" aria-hidden="true">
            {(user?.name || 'S').charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user?.name || 'Student'}</strong>
            <span>{user?.role || 'Student'}</span>
          </div>
        </div>

        <nav className="student-nav" aria-label="Student sections">
          <a className="student-link student-link--active" href="#dashboard">
            <span aria-hidden="true">🏠</span>
            <span>Dashboard</span>
          </a>
          <a className="student-link" href="#apply-new-outpass">
            <span aria-hidden="true">📝</span>
            <span>Apply for Outpass</span>
          </a>
          <a className="student-link" href="#request-history">
            <span aria-hidden="true">📋</span>
            <span>My Requests</span>
          </a>
          <a className="student-link" href="#outpass-history">
            <span aria-hidden="true">🕘</span>
            <span>Outpass History</span>
          </a>
          <a className="student-link" href="#profile">
            <span aria-hidden="true">👤</span>
            <span>Profile</span>
          </a>
        </nav>

        <button className="secondary-button student-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <div className="student-content">
        <header className="student-topbar">
          <div className="student-topbar-brand">
            <img src="/homs-logo.png" alt="H.O.M.S" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <strong>H.O.M.S</strong>
              <span>St. Joseph&apos;s University</span>
            </div>
          </div>
          <div className="student-topbar-user">
            <span aria-hidden="true">👋</span>
            <strong>Hello, {firstName}!</strong>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-main student-main" id="student-main">
          <header className="dashboard-topbar">
            <div>
              <p className="eyebrow">Student portal</p>
              <h1>{title}</h1>
              <p className="muted">{subtitle}</p>
            </div>
            {actions ? <div className="dashboard-actions">{actions}</div> : null}
          </header>

          {children}
        </main>

        <nav className="student-bottomnav" aria-label="Student mobile">
          {STUDENT_NAV.map((item) => (
            <a key={item.id} href={item.href}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
