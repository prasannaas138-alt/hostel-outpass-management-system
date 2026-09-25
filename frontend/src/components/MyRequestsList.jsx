import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';
import StudentRequestCard from './StudentRequestCard';
import { formatDate, formatTime12Hour as formatTime } from '../utils/timeFormat';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function MyRequestsList(props) {
  const {
    requests,
    loading,
    error,
    counts,
    statusFilter,
    onStatusFilterChange,
    showSearch = false,
    onEdit,
  } = props;

  return (
    <div className="requests-wrap">
      <div className="requests-toolbar">
        <div className="requests-filters" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? 'requests-chip requests-chip--active' : 'requests-chip'}
              onClick={() => onStatusFilterChange(status)}
              aria-pressed={statusFilter === status}
            >
              {status}
              {counts ? <span className="chip-count">{counts[status] ?? 0}</span> : null}
            </button>
          ))}
        </div>
        {showSearch ? (
          <label className="requests-search">
            <span className="sr-only">Search requests</span>
            <input
              type="search"
              value={props.search || ''}
              onChange={(event) => props.onSearchChange?.(event.target.value)}
              placeholder="Search reason, type, or date"
            />
          </label>
        ) : null}
      </div>

      <AlertBanner type="error" message={error} />

      {loading ? (
        <LoadingState label="Loading request history..." />
      ) : requests.length ? (
        <div className="requests-cards">
          {requests.map((request) => (
            <StudentRequestCard
              key={request._id}
              request={request}
              variant="requests-card"
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">👉 🎟️ Apply & Grab Your New Outpass!<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f483_1f3fb/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f483_1f3fb/512.gif" alt="💃" width="32" height="32"/>
</picture></div>
      )}
    </div>
  );
}