import AlertBanner from './AlertBanner';
import { formatDate, formatTime } from './MyRequestsList';
import { getDisplayStatus, getStatusClass, canDownloadPdf } from '../utils/outpassStatus';

/* Small inline SVG icons — this project uses no icon library, so the
   reference-image card keeps its own tiny SVG set. */
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* Tinted leading icon — Outing (bell) vs Home (house). Both keep the
   existing blue design language via .ref-card__icon. */
const TypeIcon = ({ requestType }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {requestType === 'Home' ? (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </>
    ) : (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    )}
  </svg>
);

/**
 * Student Portal request card — matches the reference-image design:
 *
 * ┌──────────────────────────────────────┐
 * │ [icon]  Outing            APPROVED   │
 * │         📅 09/13/2026 · 08:30–16:30  │
 * │         👤 Leave / Outing         ›  │
 * │ ──────────────────────────────────── │
 * │ [ View details ]  [ Download Outpass]│
 * └──────────────────────────────────────┘
 *
 * Renders only below 980px (desktop shows the request tables), and keeps
 * the existing status-badge classes + canDownloadPdf expiry rule.
 */
export default function StudentRequestCard({ request, variant = '', onViewDetails, onEdit, onDownload }) {
  const displayStatus = getDisplayStatus(request);
  const statusClass = getStatusClass(request);
  const downloadAllowed = canDownloadPdf(request);

  return (
    <article className={`history-card ref-card ${variant}`.trim()}>
      <div className="history-card__top ref-card__head">
        <span className="ref-card__icon" aria-hidden="true">
          <TypeIcon requestType={request.requestType} />
        </span>

        <div className="ref-card__info">
          <strong>{request.requestType}</strong>
          <p className="ref-card__meta">
            <CalendarIcon />
            <span>{formatDate(request.date)} · {formatTime(request.outTime)}–{formatTime(request.returnTime)}</span>
          </p>
          <p className="ref-card__category">
            <UserIcon />
            <span>Leave / {request.requestType}</span>
          </p>
        </div>

        <span className="ref-card__right">
          <span className={`status-badge status-${statusClass}`}>{displayStatus}</span>
          <span className="ref-card__chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </span>
      </div>

      <div className="history-card__actions ref-card__actions">
        <button className="secondary-button requests-details-btn" type="button" onClick={() => onViewDetails(request._id)}>
          View details
        </button>
        {request.status === 'Rejected' && onEdit ? (
          <button className="link-button" type="button" onClick={() => onEdit(request._id)}>
            Edit and reapply
          </button>
        ) : null}
        {downloadAllowed && onDownload ? (
          <button className="link-button" type="button" onClick={() => onDownload(request._id)}>
            Download Outpass
          </button>
        ) : null}
      </div>

      {request.rejectionReason ? <AlertBanner type="error" message={request.rejectionReason} /> : null}
    </article>
  );
}