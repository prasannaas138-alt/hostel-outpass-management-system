const statusClass = (value) => {
  if (value === 'Approved') {
    return 'approved';
  }

  if (value === 'Rejected') {
    return 'rejected';
  }

  if (value === 'NotRequired') {
    return 'not-required';
  }

  return 'pending';
};

const statusLabel = (value) => {
  if (value === 'NotRequired') {
    return 'Skipped';
  }

  return value;
};

export default function StatusTracker({ request }) {
  if (!request) {
    return null;
  }

  if (request.requestType !== 'Home') {
    return (
      <div className="tracker-card">
        <div className="tracker-card__header">
          <h3>Outing flow</h3>
          <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
        </div>
        <div className="tracker-line tracker-line--single">
          <div className={`tracker-dot tracker-dot--${statusClass(request.wardenStatus)}`} />
          <div className="tracker-step">
            <strong>Warden</strong>
            <span>{statusLabel(request.wardenStatus)}</span>
          </div>
        </div>
        {request.status === 'Approved' ? <div className="tracker-approved">Outpass Approved</div> : null}
      </div>
    );
  }

  const steps = [
    { label: 'HOD', value: request.hodStatus },
    { label: 'Sister', value: request.sisterStatus },
    { label: 'Warden', value: request.wardenStatus },
  ];

  return (
    <div className="tracker-card">
      <div className="tracker-card__header">
        <h3>Home request tracker</h3>
        <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
      </div>

      <div className="tracker-line">
        {steps.map((step, index) => (
          <div key={step.label} className="tracker-step-wrap">
            <div className={`tracker-dot tracker-dot--${statusClass(step.value)}`} />
            <div className="tracker-step">
              <strong>{step.label}</strong>
              <span>{statusLabel(step.value)}</span>
            </div>
            {index < steps.length - 1 ? <span className="tracker-connector" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>

      {request.status === 'Approved' ? <div className="tracker-approved">Outpass Approved</div> : null}
      {request.status === 'Rejected' ? <div className="tracker-rejected">Rejected: {request.rejectionReason || 'No reason provided'}</div> : null}
    </div>
  );
}
