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
        <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
      </div>

      {variant === 'slip' ? (
        <div className="slip-grid">
          {renderDetail('Request Date', new Date(item.date).toLocaleDateString())}
          {renderDetail('Out Time', item.outTime)}
          {renderDetail('Return Time', item.returnTime)}
          {renderDetail('Reason', item.reason)}
          {renderDetail('HOD', item.hodStatus)}
          {renderDetail('Sister', item.sisterStatus)}
          {renderDetail('Warden', item.wardenStatus)}
        </div>
      ) : (
        <div className="request-details">
          <span>Date: {new Date(item.date).toLocaleDateString()}</span>
          <span>Time: {item.outTime} - {item.returnTime}</span>
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
          {isBusy ? 'Processing...' : approveLabel}
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
    </article>
  );
}
