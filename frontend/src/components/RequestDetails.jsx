import StatusTracker from './StatusTracker';
import { formatDate, formatTime12Hour as formatTime } from '../utils/timeFormat';
import { getDisplayStatus, getStatusClass } from '../utils/outpassStatus';

export function MyRequestsTable({ requests }) {
  if (!requests.length) return null;
  return (
    <div className="table-wrap requests-table-wrap">
      <table className="requests-table">
        <thead>
          <tr><th scope="col">Type</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Report</th></tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request._id}>
              <td><strong>{request.requestType}</strong></td>
              <td>{formatDate(request.date)}</td>
              <td>{formatTime(request.outTime)}-{formatTime(request.returnTime)}</td>
              {/* Rejected requests show the reviewer's rejection reason; every other status keeps the student's own reason. */}
              <td className="requests-reason-cell">
                {request.status === 'Rejected' && request.rejectionReason ? request.rejectionReason : request.reason}
              </td>
              <td><span className={`status-badge status-${getStatusClass(request)}`}>{getDisplayStatus(request)}</span></td>
              <td><span className="status-badge status-report">{request.report || getDisplayStatus(request)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequestDetailsModal({ detailRequest, onCloseDetails, onEdit }) {
  if (!detailRequest) return null;
  return (
    <div className="requests-modal" role="dialog" aria-modal="true" aria-label="Request details">
      <div className="requests-modal-card">
        <div className="requests-modal-head">
          <div><p className="eyebrow">Request details</p><h3>{detailRequest.requestType} request</h3></div>
          <span className={`status-badge status-${getStatusClass(detailRequest)}`}>{getDisplayStatus(detailRequest)}</span>
        </div>
        <dl className="requests-detail-grid">
          <div><dt>Request/Out date</dt><dd>{formatDate(detailRequest.date)}</dd></div>
          <div><dt>Return date</dt><dd>{formatDate(detailRequest.returnDate || detailRequest.date)}</dd></div>
          <div><dt>Out time</dt><dd>{formatTime(detailRequest.outTime)}</dd></div>
          <div><dt>Return time</dt><dd>{formatTime(detailRequest.returnTime)}</dd></div>
          <div><dt>Destination</dt><dd>{detailRequest.destination || '—'}</dd></div>
          <div><dt>Reason</dt><dd>{detailRequest.reason || '—'}</dd></div>
          <div><dt>HOD</dt><dd>{detailRequest.hodStatus || '—'}</dd></div>
          <div><dt>Sister</dt><dd>{detailRequest.sisterStatus || '—'}</dd></div>
          <div><dt>Warden</dt><dd>{detailRequest.wardenStatus || '—'}</dd></div>
          <div><dt>Report</dt><dd>{detailRequest.report || getDisplayStatus(detailRequest)}</dd></div>
        </dl>
        <StatusTracker request={detailRequest} />
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onCloseDetails}>Close</button>
          {detailRequest.status === 'Rejected' ? (<button className="primary-button" type="button" onClick={() => onEdit(detailRequest._id)}>Edit and reapply</button>) : null}
        </div>
      </div>
    </div>
  );
}
