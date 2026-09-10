import { formatDate, formatTime } from './MyRequestsList';

export default function WardenStudentDetails({ request, onClose }) {
  if (!request) {
    return null;
  }

  const initial = (request.studentName || 'S').charAt(0).toUpperCase();

  return (
    <div className="requests-modal" role="dialog" aria-modal="true" aria-label="Student and outpass details">
      <div className="requests-modal-card warden-student-modal">
        <div className="warden-student-head">
          <span className="warden-student-avatar" aria-hidden="true">
            {initial}
          </span>
          <div>
            <p className="eyebrow">Student details</p>
            <h3>{request.studentName}</h3>
            <p className="muted">
              {request.department} · Year {request.year} · {request.requestType}
            </p>
          </div>
          <span className={`status-badge status-${String(request.status).toLowerCase()}`}>
            {request.status}
          </span>
        </div>

        <section className="warden-student-section" aria-label="Student information">
          <h4>Student information</h4>
          <dl>
            <div><dt>Name</dt><dd>{request.studentName || '—'}</dd></div>
            <div><dt>Department</dt><dd>{request.department || '—'}</dd></div>
            <div><dt>Year</dt><dd>{request.year || '—'}</dd></div>
          </dl>
        </section>

        <section className="warden-student-section" aria-label="Outpass request details">
          <h4>Outpass request</h4>
          <dl>
            <div><dt>Request type</dt><dd>{request.requestType || '—'}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(request.date)}</dd></div>
            <div><dt>Out time</dt><dd>{formatTime(request.outTime)}</dd></div>
            <div><dt>Return time</dt><dd>{formatTime(request.returnTime)}</dd></div>
            <div><dt>Reason</dt><dd>{request.reason || '—'}</dd></div>
          </dl>
        </section>

        <section className="warden-student-section" aria-label="Approval trail">
          <h4>Approval trail</h4>
          <dl>
            <div><dt>HOD</dt><dd>{request.hodStatus || '—'}</dd></div>
            <div><dt>Sister</dt><dd>{request.sisterStatus || '—'}</dd></div>
            <div><dt>Warden</dt><dd>{request.wardenStatus || '—'}</dd></div>
          </dl>
          {request.rejectionReason ? (
            <div className="inline-note inline-note--warning">Rejected: {request.rejectionReason}</div>
          ) : null}
        </section>

        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onClose}>
            Back to queue
          </button>
        </div>
      </div>
    </div>
  );
}