import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  IconMenu,
  IconClose,
  IconHome,
  IconHistory,
  IconBuilding,
  IconClock,
  IconUser,
  IconLogout,
} from './WardenIcons';
import '../styles/warden-dashboard.css';
import '../styles/notifications.css';

// Sidebar / drawer / bottom-nav entries. `id` doubles as the active view key
// used by WardenDashboard, so navigation stays in React state (no hash links,
// no page reloads) exactly like the redesigned reference layout.
export const WARDEN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: IconHome },
  { id: 'history', label: 'Outpass History', icon: IconHistory, path: '/warden/history' },
  { id: 'gates', label: 'Gate Administration', icon: IconBuilding, path: '/warden/gates' },
  { id: 'live', label: 'Live Movement', icon: IconClock, path: '/warden/movement' },
  { id: 'profile', label: 'Profile', icon: IconUser },
];

export default function WardenLayout({ view = 'dashboard', onNavigate, navItems = WARDEN_NAV, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Real authenticated identity: the avatar letter and the name/role shown in
  // the sidebar, mobile header and profile all come from the logged-in user.
  const userName = user?.name || 'Warden';
  const userRole = user?.role || 'Warden';
  const initial = userName.charAt(0).toUpperCase();

  const go = (id) => {
    setDrawerOpen(false);
    const item = navItems.find((navItem) => navItem.id === id);
    if (item?.path) {
      navigate(item.path);
      return;
    }
    onNavigate?.(id);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="wd-shell">
      <a className="homs-skip-link" href="#wd-main">Skip to main content</a>

      {drawerOpen ? (
        <button
          className="wd-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside className={drawerOpen ? 'wd-sidebar wd-sidebar--open' : 'wd-sidebar'} aria-label="Warden navigation">
        <div className="wd-side-brand">
          <img
            src="/st-joseph-logo.png"
            alt="St. Joseph University"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <strong>St. Joseph University</strong>
            <span>Hostel Office</span>
          </div>
        </div>

        <div className="wd-side-user">
          <span className="wd-avatar" aria-hidden="true">{initial}</span>
          <div className="wd-user-meta">
            <strong>{userName}</strong>
            <span>{userRole}</span>
          </div>
        </div>

        <nav className="wd-nav" aria-label="Portal sections">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'wd-nav-item wd-nav-item--active' : 'wd-nav-item'}
              onClick={() => go(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="wd-side-logout" type="button" onClick={() => setLogoutOpen(true)}>
          <IconLogout size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="wd-body">
        <header className="wd-topbar">
          <div className="wd-topbar-main">
            <img
              className="wd-topbar-logo"
              src="/st-joseph-logo.png"
alt="St. Joseph University"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="wd-topbar-brand">
<strong>St. Joseph University</strong>
              <span>Hostel Office · H.O.M.S</span>
            </div>
            <button
              className="wd-burger"
              type="button"
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>

          <div className="wd-topbar-user">
            <span className="wd-avatar" aria-hidden="true">{initial}</span>
            <div className="wd-user-meta">
              <strong>{userName}</strong>
              <span>{userRole}</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="wd-main" id="wd-main">
          {children}
        </main>

        <nav className="wd-bottomnav" aria-label="Mobile navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'wd-bottomnav-item wd-bottomnav-item--active' : 'wd-bottomnav-item'}
              onClick={() => go(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {logoutOpen ? (
        <div className="wd-overlay" role="dialog" aria-modal="true" aria-label="Confirm logout">
          <div className="wd-modal wd-modal--sm">
            <h3>Are you sure?</h3>
            <p className="wd-panel-sub">You will be signed out of your account.</p>
            <div className="wd-modal-actions">
              <button className="wd-btn wd-btn--dark" type="button" onClick={confirmLogout}>Yes, logout</button>
              <button className="wd-btn wd-btn--ghost" type="button" onClick={() => setLogoutOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
