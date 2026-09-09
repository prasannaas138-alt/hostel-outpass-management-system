export default function StudentProfile({ user }) {
  const initial = (user?.name || 'S').charAt(0).toUpperCase();
  const rows = [
    { label: 'Full name', value: user?.name },
    { label: 'Email', value: user?.email },
    { label: 'Register number', value: user?.registerNumber },
    { label: 'Role', value: user?.role || 'Student' },
    { label: 'Department', value: user?.department },
    { label: 'Year', value: user?.year },
    { label: 'Hostel block', value: user?.hostelBlock },
    { label: 'Room number', value: user?.roomNumber },
  ];

  return (
    <div className="profile-wrap">
      <div className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <div>
          <p className="eyebrow">Student profile</p>
          <h3>{user?.name || 'Student'}</h3>
          <p className="muted">{user?.email || 'No email available'}</p>
        </div>
        <span className="profile-role">{user?.role || 'Student'}</span>
      </div>

      <div className="profile-sections">
        <section className="profile-card" aria-label="Academic details">
          <h4>Academic details</h4>
          <dl>
            <div><dt>Register number</dt><dd>{user?.registerNumber || '—'}</dd></div>
            <div><dt>Department</dt><dd>{user?.department || '—'}</dd></div>
            <div><dt>Year</dt><dd>{user?.year || '—'}</dd></div>
          </dl>
        </section>

        <section className="profile-card" aria-label="Hostel details">
          <h4>Hostel details</h4>
          <dl>
            <div><dt>Hostel block</dt><dd>{user?.hostelBlock || '—'}</dd></div>
            <div><dt>Room number</dt><dd>{user?.roomNumber || '—'}</dd></div>
          </dl>
        </section>

        <section className="profile-card" aria-label="Account details">
          <h4>Account</h4>
          <dl>
            <div><dt>Full name</dt><dd>{user?.name || '—'}</dd></div>
            <div><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
            <div><dt>Role</dt><dd>{user?.role || 'Student'}</dd></div>
          </dl>
        </section>
      </div>

      <div className="profile-all sr-only">
        {rows.map((row) => (
          <p key={row.label}>{row.label}: {row.value || '—'}</p>
        ))}
      </div>
    </div>
  );
}
