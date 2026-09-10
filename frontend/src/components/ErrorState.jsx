// Reusable load-failure state shown when an API request fails.
// Friendly message only — raw technical errors are never exposed.
export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
}) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state-icon" aria-hidden="true">⚠️</span>
      <strong>{title}</strong>
      <p>{message || 'We could not load this data right now. Please try again.'}</p>
      {onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}