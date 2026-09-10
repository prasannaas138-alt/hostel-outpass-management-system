import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from './NotificationBell';
import '../styles/layout.css';
import '../styles/notifications.css';

export default function DashboardLayout({ title, subtitle, navItems, children, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showBell = user?.role === 'Sister' || user?.role === 'Warden';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell dashboard-shell--split">
      <Sidebar
        title={title}
        subtitle={subtitle}
        navItems={navItems}
        userName={user?.name}
        userRole={user?.role}
        onLogout={handleLogout}
      />

      <main className="dashboard-main" id="main-content">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Request management</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          {actions ? <div className="dashboard-actions">{actions}</div> : null}
          {showBell ? <NotificationBell /> : null}
        </header>

        {children}
        <MobileBottomNav navItems={navItems} />
      </main>
    </div>
  );
}
