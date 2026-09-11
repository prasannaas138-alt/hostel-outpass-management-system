import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

const STUDENT_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '#dashboard' },
  { id: 'apply-new-outpass', label: 'Apply for Outpass', icon: '📝', href: '#apply-new-outpass' },
  { id: 'request-history', label: 'My Requests', icon: '📋', href: '#request-history' },
  { id: 'outpass-history', label: 'Outpass History', icon: '🕘', href: '#outpass-history' },
  { id: 'profile', label: 'Profile', icon: '👤', href: '#profile' },
];

export default function StudentLayout({ title, subtitle, actions, children, onNavSelected }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const mainRef = useRef(null);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const firstName = (user?.name || 'Student').split(' ')[0];

  useEffect(() => {
    const hash = window.location.hash?.replace('#', '') || 'dashboard';
    setActiveSection(hash);
    const onHashChange = () => {
      const h = window.location.hash?.replace('#', '') || 'dashboard';
      setActiveSection(h);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavClick = (event, id) => {
    event.preventDefault();
    setActiveSection(id);
    setMobileNavOpen(false);
    onNavSelected?.(id);
    // Profile is a modal overlay managed by the dashboard — it is not a
    // scroll section, so skip fragment lookup / URL hash fallback.
    if (id === 'profile') {
      return;
    }
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = id;
    }
  };

  return (
    <div className="student-shell">
      <a className="homs-skip-link" href="#student-main">
        Skip to main content
      </a>

      <button
        className="student-hamburger"
        type="button"
        onClick={() => setMobileNavOpen((open) => !open)}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
      >
        ☰
      </button>

      {mobileNavOpen ? (
        <div className="student-mobile-overlay" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      ) : null}

      <aside className={`student-sidebar ${mobileNavOpen ? 'open' : ''}`} aria-label="Student primary">
        <div className="student-brand">
          <img src="/st-joseph-logo.png" alt="St. Joseph's University" onError={(e) => { e.target.style.display = 'none'; }} />
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
          {STUDENT_NAV.map((item) => (
            <a
              key={item.id}
              className={`student-link ${activeSection === item.id ? 'student-link--active' : ''}`}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <button className="secondary-button student-logout" type="button" onClick={() => setLogoutOpen(true)}>
          Logout
        </button>
      </aside>

      <div className="student-content">
        <header className="student-topbar">
          <div className="student-topbar-brand">
            <img src="/st-joseph-logo.png" alt="St. Joseph's University" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <strong>H.O.M.S</strong>
              <span>St. Joseph&apos;s University</span>
            </div>
          </div>
          <div className="student-topbar-mobile-logo" aria-hidden="true">
            <img src="/st-joseph-logo.png" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div className="student-topbar-user">
            <span aria-hidden="true">👋</span>
            <strong>Hello, {firstName}!</strong>
            <button className="secondary-button" type="button" onClick={() => setLogoutOpen(true)}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-main student-main" id="student-main" ref={mainRef}>
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
          {STUDENT_NAV.slice(0, 4).map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={activeSection === item.id ? 'student-bottomnav-active' : ''}
              onClick={(e) => handleNavClick(e, item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

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
      </div>
    </div>
  );
}
