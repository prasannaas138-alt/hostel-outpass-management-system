export default function MobileBottomNav({ navItems }) {
  if (!navItems?.length) {
    return null;
  }

  const visible = navItems.slice(0, 4);

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary mobile">
      {visible.map((item) => (
        <a key={item.id} href={`#${item.id}`}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
