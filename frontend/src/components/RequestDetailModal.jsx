import { useState } from 'react';
import { formatTime12Hour as formatTime } from '../utils/timeFormat';

/**
 * RequestDetailModal — the full outpass detail card opened when a staff
 * member clicks "View" in the compact StaffRequestTable (shared by HOD,
 * Sister and Warden). Shows every piece of information the old large
 * request cards contained (student, schedule, reason, contacts, hostel,
 * destination) plus the approval indicator pills required to sit ABOVE
 * the Approve/Reject buttons:
 *
 *   Warden + Outing -> Sister - NOT APPROVED / APPROVED, Warden - ...
 *   Warden + Home   -> HOD - ..., Sister - ..., Warden - ...
 *   Sister          -> HOD indicator for Home, own Sister indicator
 *   HOD             -> own HOD indicator (first reviewer)
 *
 * Approve/Reject call the dashboard's EXISTING review handlers — the
 * same endpoints and payloads as before. Rejection keeps the existing
 * reason flow via an inline confirm box.
 */

const indicatorValue = (value) => {
  switch (value) {
    case 'Approved':
      return { text: 'APPROVED', tone: 'staff-indicator--approved' };
    case 'Rejected':
      return { text: 'REJECTED', tone: 'staff-indicator--rejected' };
    case 'NotRequired':
      return { text: 'NOT NEEDED', tone: 'staff-indicator--muted' };
    default:
      return { text: 'NOT APPROVED', tone: 'staff-indicator--pending' };
  }
};

const buildIndicators = (request, role) => {
  const list = [];
  if (request.requestType === 'Home' && (role === 'sister' || role === 'warden')) {
    list.push({ label: 'HOD Approval', value: request.hodStatus });
  }
  if (role !== 'hod') {
    list.push({ label: 'Sister Approval', value: request.sisterStatus });
  }
  if (role === 'warden') {
    list.push({ label: 'Warden Approval', value: request.wardenStatus });
  }
  if (role === 'hod') {
    list.push({ label: 'HOD Approval', value: request.hodStatus });
  }
  if (role === 'sister' && request.requestType === 'Outing') {
    list.push({ label: 'Warden Approval', value: request.wardenStatus });
  }
  return list;
};

const formatShortDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function RequestDetailModal({ request, role, busy, onApprove, onReject, onClose }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const indicators = buildIndicators(request, role);
  const isBusy = Boolean(busy);

  const close = () => {
    setRejecting(false);
    setReason('');
    onClose();
  };

  return (
    <div
      className="staff-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Outpass request details"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="staff-modal__card">
        <div className="staff-modal__head">
          <h3>Outpass Request Details</h3>
          <button className="staff-modal__close" type="button" onClick={close} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="staff-modal__body">
          <div className="staff-modal__student">
            <span className="staff-avatar staff-avatar--lg" aria-hidden="true">
              {(request.studentName || 'S').charAt(0).toUpperCase()}
            </span>
            <div className="staff-modal__student-meta">
              <h4>{request.studentName || '—'}</h4>
              <p>
                {request.roomNumber ? `Room ${request.roomNumber}` : 'Room —'}
                {' · '}
                {request.registerNumber ? `Reg: ${request.registerNumber}` : 'Reg: —'}
              </p>
            </div>
            <span className={`staff-type-badge staff-type-badge--${String(request.requestType || '').toLowerCase()}`}>
              {request.requestType}
            </span>
          </div>

          <div className="staff-schedule">
            <div className="staff-tile">
              <span className="staff-tile__icon staff-tile__icon--blue">📅</span>
              <div>
                <em>Request Date</em>
                <strong>{formatShortDate(request.date)}</strong>
              </div>
            </div>
            <div className="staff-tile">
              <span className="staff-tile__icon staff-tile__icon--blue">🕐</span>
              <div>
                <em>Out Time</em>
                <strong>{request.outTime ? formatTime(request.outTime) : '—'}</strong>
              </div>
            </div>
            <div className="staff-tile">
              <span className="staff-tile__icon staff-tile__icon--blue">🕐</span>
              <div>
                <em>Return Date</em>
                <strong>{formatShortDate(request.returnDate || request.date)}</strong>
              </div>
            </div>
            <div className="staff-tile">
              <span className="staff-tile__icon staff-tile__icon--blue">🕐</span>
              <div>
                <em>Return Time</em>
                <strong>{request.returnTime ? formatTime(request.returnTime) : '—'}</strong>
              </div>
            </div>
          </div>

          <div className="staff-reason">
            <h5>Reason</h5>
            <p>{request.reason || '—'}</p>
          </div>

          <div className="staff-extra">
            <h5>Additional Details</h5>
            <div className="staff-extra__grid">
              <div className="staff-field"><span>Phone</span><strong>{request.phone || '--'}</strong></div>
              <div className="staff-field"><span>Parent/Guardian Name</span><strong>{request.parentGuardianName || '--'}</strong></div>
              <div className="staff-field"><span>Parent/Guardian Number</span><strong>{request.parentPhone || '--'}</strong></div>
              <div className="staff-field"><span>Hostel</span><strong>{request.hostelName || '--'}</strong></div>
              <div className="staff-field"><span>Room</span><strong>{request.roomNumber || '--'}</strong></div>
              <div className="staff-field"><span>Request/Out Date</span><strong>{formatShortDate(request.date)}</strong></div>
              <div className="staff-field"><span>Out Time</span><strong>{request.outTime ? formatTime(request.outTime) : '--'}</strong></div>
              <div className="staff-field"><span>Return Date</span><strong>{formatShortDate(request.returnDate || request.date)}</strong></div>
              <div className="staff-field"><span>Return Time</span><strong>{request.returnTime ? formatTime(request.returnTime) : '--'}</strong></div>
              <div className="staff-field"><span>Destination</span><strong>{request.destination || '--'}</strong></div>
              <div className="staff-field"><span>Department / Year</span><strong>{request.department || '--'}{request.year ? ` · Year ${request.year}` : ''}</strong></div>
            </div>
          </div>

          {request.rejectionReason ? (
            <div className="staff-rejection-note">
              <span>Earlier rejection</span>
              <p>{request.rejectionReason}</p>
            </div>
          ) : null}
        </div>
        <div className="staff-modal__actions">
          <div className="staff-indicators" aria-label="Approval status">
            {indicators.map(({ label, value }) => {
              const { text, tone } = indicatorValue(value);
              return (
                <span key={label} className={`staff-indicator ${tone}`}>
                  <strong>{label}:</strong> {text}
                </span>
              );
            })}
          </div>

          {rejecting ? (
            <div className="staff-reject-box">
              <label htmlFor="staff-reject-reason">Rejection reason</label>
              <textarea
                id="staff-reject-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                placeholder="Reason for rejection (shared with the student)"
              />
              <div className="staff-reject-box__actions">
                <button
                  className="staff-btn staff-btn--danger"
                  type="button"
                  disabled={isBusy}
                  onClick={() => onReject(request._id, reason)}
                >
                  {isBusy ? 'Processing...' : 'Confirm Reject'}
                </button>
                <button
                  className="staff-btn staff-btn--ghost"
                  type="button"
                  disabled={isBusy}
                  onClick={() => setRejecting(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="staff-modal__buttons">
              <button
                className="staff-btn staff-btn--approve"
                type="button"
                disabled={isBusy}
                onClick={() => onApprove(request._id)}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <polyline points="20 6.5 9.5 17 4 11.5" />
                </svg>
                {isBusy ? 'Processing...' : 'Approve'}
              </button>
              <button
                className="staff-btn staff-btn--danger"
                type="button"
                disabled={isBusy}
                onClick={() => setRejecting(true)}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
                  <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
                </svg>
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
