import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';
import { formatDate, formatTime } from './MyRequestsList';
import { getDisplayStatus, getStatusClass, canDownloadPdf } from '../utils/outpassStatus';

export default function OutpassHistory(props) {
  const {
    requests,
    loading,
    error,
    typeFilter,
    onTypeFilterChange,
    search,
    onSearchChange,
    onViewDetails,
    onDownload,
  } = props;

  return (
    <div className="history-wrap">
      <div className="requests-toolbar">
        <div className="requests-filters" role="group" aria-label="Filter history by type">
          {['All', 'Home', 'Outing'].map((type) => (
            <button
              key={type}
              type="button"
              className={typeFilter === type ? 'requests-chip requests-chip--active' : 'requests-chip'}
              onClick={() => onTypeFilterChange(type)}
              aria-pressed={typeFilter === type}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="requests-search">
          <span className="sr-only">Search history</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reason or date"
          />
        </label>
      </div>

      <AlertBanner type="error" message={error} />

      {loading ? (
        <LoadingState label="Loading outpass history..." />
      ) : requests.length ? (
        <>
          <div className="history-cards">
            {requests.map((request) => (
              <article key={request._id} className="history-card history-compact">
                <div className="history-card__top">
                  <div>
                    <strong>{request.requestType}</strong>
                    <p className="muted">{formatDate(request.date)} · {formatTime(request.outTime)}-{formatTime(request.returnTime)}</p>
                  </div>
                  <span className={`status-badge status-${getStatusClass(request)}`}>{getDisplayStatus(request)}</span>
                </div>
                <p className="history-card__reason">{request.reason}</p>
                <div className="history-card__actions">
                  <button className="secondary-button requests-details-btn" type="button" onClick={() => onViewDetails(request._id)}>
                    View details
                  </button>
                  {canDownloadPdf(request) ? (
                    <button className="link-button" type="button" onClick={() => onDownload(request._id)}>
                      Download Outpass
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="table-wrap history-table-wrap">
            <table className="requests-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id}>
                    <td><strong>{request.requestType}</strong></td>
                    <td>{formatDate(request.date)}</td>
                    <td>{formatTime(request.outTime)}-{formatTime(request.returnTime)}</td>
                    <td className="requests-reason-cell">{request.reason}</td>
                    <td><span className={`status-badge status-${getStatusClass(request)}`}>{getDisplayStatus(request)}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="link-button" type="button" onClick={() => onViewDetails(request._id)}>Details</button>
                        {canDownloadPdf(request) ? (
                          <button className="link-button" type="button" onClick={() => onDownload(request._id)}>PDF</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">No historical outpasses match this view.</div>
      )}
    </div>
  );
}