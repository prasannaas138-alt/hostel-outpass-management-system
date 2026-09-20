/**
 * ProfileChangeRequests — HOD-only compact approval list for protected
 * student profile fields (register number, phone, parent/guardian number,
 * parent/guardian name, department). One compact row per request:
 * Student Name - "Changed X (old -> new)" - Approve - Reject - timestamp.
 */
const relativeTime = (value) => {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const describeChanges = (changes = []) =>
  changes
    .map((change) => `Changed ${change.label} (${change.oldValue || '—'} → ${change.newValue || '—'})`)
    .join(', ');

export default function ProfileChangeRequests({ requests = [], busyId = '', onReview, sectionId = 'profile-change-requests' }) {
  const pendingCount = requests.length;

  return (
    <section id={sectionId} className="wd-panel pcr-card" aria-label="Profile change requests">
      <div className="pcr-head">
        <div className="pcr-head-main">
          <span className="pcr-bell" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
          <div>
            <h2 className="pcr-title">Profile Change Requests</h2>
            <p className="pcr-sub">Students have requested to change their profile information. Please review and take action.</p>
          </div>
        </div>
        {pendingCount > 0 ? <span className="pcr-count">{pendingCount} pending</span> : null}
      </div>

      {pendingCount === 0 ? (
        <div className="pcr-empty">No pending profile change requests.</div>
      ) : (
        <ul className="pcr-list">
          {requests.map((request) => {
            const name = request.student?.name || 'Student';
            const initial = name.charAt(0).toUpperCase();
            const busy = busyId === request._id;
            return (
              <li className="pcr-row" key={request._id}>
                <span className="pcr-avatar" aria-hidden="true">{initial}</span>
                <strong className="pcr-name">{name}</strong>
                <span className="pcr-desc">{describeChanges(request.changes)}</span>
                <div className="pcr-actions">
                  <button
                    className="pcr-btn pcr-btn--approve"
                    type="button"
                    disabled={busy}
                    onClick={() => onReview(request._id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="pcr-btn pcr-btn--reject"
                    type="button"
                    disabled={busy}
                    onClick={() => onReview(request._id, 'reject')}
                  >
                    Reject
                  </button>
                </div>
                <span className="pcr-time">{relativeTime(request.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}