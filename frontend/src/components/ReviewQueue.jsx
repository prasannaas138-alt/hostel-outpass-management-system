export default function ReviewQueue({ items, emptyMessage, onApprove, onReject, reasonById, setReasonById }) {
  if (!items.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="grid-list">
      {items.map((item) => (
        <article key={item._id} className="request-card">
          <div className="request-card__top">
            <div>
              <h3>{item.studentName}</h3>
              <p className="muted">
                {item.department} · Year {item.year} · {item.requestType}
              </p>
            </div>
            <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
          </div>

          <div className="request-details">
            <span>Date: {new Date(item.date).toLocaleDateString()}</span>
            <span>Out: {item.outTime}</span>
            <span>Return: {item.returnTime}</span>
            <span>Reason: {item.reason}</span>
            {item.rejectionReason ? <span className="rejection">Rejection: {item.rejectionReason}</span> : null}
          </div>

          <textarea
            className="reason-input"
            rows="3"
            placeholder="Add rejection reason"
            value={reasonById[item._id] || ''}
            onChange={(event) => setReasonById((current) => ({ ...current, [item._id]: event.target.value }))}
          />

          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => onApprove(item._id)}>
              Approve
            </button>
            <button className="danger-button" type="button" onClick={() => onReject(item._id)}>
              Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
