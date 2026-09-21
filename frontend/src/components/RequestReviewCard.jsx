import { formatTime12Hour as formatTime } from '../utils/timeFormat';

export default function RequestReviewCard({
  item,
  variant = 'review',
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  activeRejectId,
  setActiveRejectId,
  reasonById,
  setReasonById,
  loadingId,
  onApprove,
  onReject,
}) {
  const isRejecting = activeRejectId === item._id;
  const isBusy = loadingId === item._id;

  const handleReject = () => {
    if (isRejecting) {
      onReject(item._id);
      return;
    }

    setActiveRejectId(item._id);
  };

  const approvalDot = (value, pendingLabel) => {
    const v = String(value || 'Pending');
    const cls = v === 'Approved' ? 'approval-dot approval-dot--approved' : 'approval-dot approval-dot--not';
    const label = v === 'Approved' ? 'APPROVED' : v === 'Rejected' ? 'REJECTED' : (pendingLabel || 'NOT APPROVED');
    return (<span className="approval-state"><span className={cls} />{label}</span>);
  };
  const renderDetail = (label, value) => (
    <div className="detail-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  return (
    <article className={`request-card ${variant === 'slip' ? 'request-card--slip' : ''}`}>
      <div className="request-card__top">
        <div>
          <h3>{item.studentName}</h3>
          <p className="muted">
            {item.department} · Year {item.year} · {item.requestType}
          </p>
        </div>
        <span className={`status-badge status-${String(item.status).toLowerCase()}`}>{item.status}</span>
      </div>

      {variant === 'slip' ? (
        <div className="slip-grid">
          {renderDetail('Reg. No', item.registerNumber || '-'+'-')}
          {renderDetail('Room', item.roomNumber || '-'+'-')}
          {renderDetail('Phone', item.phone || '-'+'-')}
          {renderDetail('Parent/Guardian', item.parentPhone || '-'+'-')}
          {renderDetail('Hostel', item.hostelName || '-'+'-')}
          {renderDetail('Request/Out Date', item.date ? new Date(item.date).toLocaleDateString() : '-'+'-')}
          {renderDetail('Out Day', item.outDay || '-'+'-')}
          {renderDetail('Out Time', item.outTime ? formatTime(item.outTime) : '-'+'-')}
          {renderDetail('Return Date', item.returnDate ? new Date(item.returnDate).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '-'+'-'))}
          {renderDetail('Return Day', item.returnDay || '-'+'-')}
          {renderDetail('Return Time', item.returnTime ? formatTime(item.returnTime) : '-'+'-')}
          {renderDetail('Destination', item.destination || '-'+'-')}
          {renderDetail('Reason', item.reason)}
          <div className='approval-row'>
            <span>HOD Approval</span>
            {approvalDot(item.hodStatus)}
          </div>
          <div className='approval-row'>
            <span>Sister Approval</span>
            {approvalDot(item.sisterStatus)}
          </div>
          <div className='approval-row'>
            <span>Warden Approval</span>
            {approvalDot(item.wardenStatus, 'APPROVAL NEEDED')}
          </div>
        </div>
      ) : (
        <div className="request-details">
          <span>Reg. No: {item.registerNumber || '—'}</span>
          <span>Room: {item.roomNumber || '—'}</span>
          <span>Phone: {item.phone || '—'}</span>
          <span>Parent/Guardian: {item.parentPhone || '—'}</span>
          <span>Hostel: {item.hostelName || '—'}</span>
          <span>Request/Out Date: {item.date ? new Date(item.date).toLocaleDateString() : '—'}</span>
          <span>Out Day: {item.outDay || '—'}</span>
          <span>Return Date: {item.returnDate ? new Date(item.returnDate).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '—')}</span>
          <span>Return Day: {item.returnDay || '—'}</span>
          <span>Time: {item.outTime ? formatTime(item.outTime) : '-'+'-'} - {item.returnTime ? formatTime(item.returnTime) : '-'+'-'}</span>
          <span>Destination: {item.destination || '—'}</span>
          <span>Reason: {item.reason}</span>
          <span>Department: {item.department}</span>
          <span>Year: {item.year}</span>
          {item.rejectionReason ? <span className="rejection">Rejection: {item.rejectionReason}</span> : null}
        </div>
      )}

      {isRejecting ? (
        <label className="reject-box">
          Rejection reason
          <textarea
            className="reason-input"
            rows="3"
            placeholder="Explain why the request is rejected"
            value={reasonById[item._id] || ''}
            onChange={(event) => setReasonById((current) => ({ ...current, [item._id]: event.target.value }))}
          />
        </label>
      ) : null}

      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => onApprove(item._id)} disabled={isBusy}>
          {isBusy ? 'Recording approval...' : approveLabel}
        </button>

        {isRejecting ? (
          <>
            <button className="danger-button" type="button" onClick={() => onReject(item._id)} disabled={isBusy}>
              {rejectLabel}
            </button>
            <button className="secondary-button" type="button" onClick={() => setActiveRejectId('')}>
              Cancel
            </button>
          </>
        ) : (
          <button className="danger-button" type="button" onClick={handleReject} disabled={isBusy}>
            {rejectLabel}
          </button>
        )}
      </div>

      <p className="approve-note" role="note">
        {isBusy
          ? '⏳ Your approval is being recorded. Do not close this page.'
          : 'ℹ️ Approving records your approval for this request. Rejection still requires a reason.'}
      </p>
    </article>
  );
}
