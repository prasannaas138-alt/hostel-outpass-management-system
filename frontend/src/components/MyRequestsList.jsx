import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatTime = (value) => value || '—';

export { formatDate, formatTime };

export default function MyRequestsList(props) {
  const {
    requests, loading, error, statusFilter, onStatusFilterChange,
    search, onSearchChange, onViewDetails, onEdit, onDownload,
  } = props;

  return (
    <div className="requests-wrap">
      <div className="requests-toolbar">
        <div className="requests-filters" role="group" aria-label="Filter by status">
          {['All', 'Pending', 'Approved', 'Rejected', 'Expired'].map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? 'requests-chip requests-chip--active' : 'requests-chip'}
              onClick={() => onStatusFilterChange(status)}
              aria-pressed={statusFilter === status}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="requests-search">
          <span className="sr-only">Search requests</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reason, type, or date"
          />
        </label>
      </div>

      <AlertBanner type="error" message={error} />

      {loading ? (
        <LoadingState label="Loading request history..." />
      ) : requests.length ? (
        <div className="requests-cards">
          {requests.map((request) => (
            <article key={request._id} className="history-card requests-card">
              <div className="history-card__top">
                <div>
                  <strong>{request.requestType}</strong>
                  <p className="muted">{formatDate(request.date)} · {formatTime(request.outTime)}-{formatTime(request.returnTime)}</p>
                </div>
                <span className={`status-badge status-${String(request.status).toLowerCase()}`}>{request.status}</span>
              </div>
              <p className="history-card__reason">{request.reason}</p>
              <div className="history-card__actions">
                <button className="secondary-button requests-details-btn" type="button" onClick={() => onViewDetails(request._id)}>View details</button>
                {request.status === 'Rejected' ? (<button className="link-button" type="button" onClick={() => onEdit(request._id)}>Edit and reapply</button>) : null}
                {request.status === 'Approved' ? (<button className="link-button" type="button" onClick={() => onDownload(request._id)}>Download Outpass</button>) : null}
              </div>
              {request.rejectionReason ? <AlertBanner type="error" message={request.rejectionReason} /> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No requests match this view. Try another filter or apply for a new outpass.</div>
      )}
    </div>
  );
}
