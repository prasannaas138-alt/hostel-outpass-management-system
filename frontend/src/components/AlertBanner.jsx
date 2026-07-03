export default function AlertBanner({ type = 'info', title, message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`alert-banner alert-banner--${type}`} role="status">
      <div>
        {title ? <strong>{title}</strong> : null}
        <p>{message}</p>
      </div>
      {onClose ? (
        <button className="alert-close" type="button" onClick={onClose} aria-label="Dismiss alert">
          ×
        </button>
      ) : null}
    </div>
  );
}
