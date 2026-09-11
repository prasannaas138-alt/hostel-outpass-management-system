import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';
import { getDisplayStatus, getStatusClass, canDownloadPdf } from '../utils/outpassStatus';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatTime = (value) => value || '—';

export { formatDate, formatTime };

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function MyRequestsList(props) {
  const {
    requests,
    loading,
    error,
    statusFilter,
    onStatusFilterChange,
    showSearch = false,
    onViewDetails,
    onEdit,
    onDownload,
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
            <article key={request._id} className="history-card requests-card">
              <div className="history-card__top">
                <div>
                  <strong>{request.requestType}</strong>
                  <p className="muted">{formatDate(request.date)} · {formatTime(request.outTime)}-{formatTime(request.returnTime)}</p>
                </div>
                <span className={`status-badge status-${getStatusClass(request)}`}>{getDisplayStatus(request)}</span>
              </div>
              <p className="history-card__reason">{request.reason}</p>
              <div className="history-card__actions">
                <button className="secondary-button requests-details-btn" type="button" onClick={() => onViewDetails(request._id)}>View details</button>
                {request.status === 'Rejected' ? (<button className="link-button" type="button" onClick={() => onEdit(request._id)}>Edit and reapply</button>) : null}
                {canDownloadPdf(request) ? (<button className="link-button" type="button" onClick={() => onDownload(request._id)}>Download Outpass</button>) : null}
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