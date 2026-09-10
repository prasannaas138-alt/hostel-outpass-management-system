export default function Sidebar({ title, subtitle, navItems, userName, userRole, onLogout }) {
  const activeId = window.location.hash.replace('#', '');

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <p className="eyebrow">H.O.M.S · Hostel Portal</p>
        <h2>{title}</h2>
        {subtitle ? <p className="muted sidebar-copy">{subtitle}</p> : null}
      </div>

      <div className="sidebar-user">
        <span className="sidebar-user__label">Signed in as</span>
        <strong>{userName}</strong>
        <span>{userRole}</span>
      </div>

      {navItems?.length ? (
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navItems.map((item) => (
            <a
              key={item.id}
              className={`sidebar-link${activeId === item.id ? ' sidebar-link--active' : ''}`}
              href={`#${item.id}`}
              aria-current={activeId === item.id ? 'true' : undefined}
            >
              <span>{item.label}</span>
              {item.description ? <small>{item.description}</small> : null}
            </a>
          ))}
        </nav>
      ) : null}

      <button className="secondary-button sidebar-logout" type="button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}
