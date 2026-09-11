import { getDisplayStatus, getStatusClass } from '../utils/outpassStatus';

/* Inline SVG status symbols — this project uses no icon library.
   Tick = approved · Clock = pending/waiting · Cross = rejected ·
   Hourglass = expired. All draw with stroke="currentColor" so the
   shared CSS can paint them white inside the colored symbol circle. */
const CheckSymbol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6.5 9.5 17 4 11.5" />
  </svg>
);

const ClockSymbol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6.5 12 12 15.5 13.5" />
  </svg>
);

const RejectSymbol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
  </svg>
);

const ExpiredSymbol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.5 2.5h11" />
    <path d="M6.5 21.5h11" />
    <path d="M8 2.5v4.5l4 5 4-5V2.5" />
    <path d="M8 21.5V17l4-5 4 5v4.5" />
  </svg>
);

const STATUS_SYMBOLS = {
  approved: CheckSymbol,
  rejected: RejectSymbol,
  expired: ExpiredSymbol,
  pending: ClockSymbol,
  'waiting-sister': ClockSymbol,
  'waiting-warden': ClockSymbol,
};

/**
 * Shared student status badge — renders the same existing
 * .status-badge.status-{class} pill (identical colors, text, wrapping),
 * plus a leading solid status-color circle with a white status symbol,
 * matching the reference image:
 *   ✓ Approved · 🕐 Pending / Waiting for approval · ✕ Rejected ·
 *   ⧗ Expired / Approved - Expired
 *
 * Used wherever student status is shown (My Requests + Outpass History
 * mobile cards and the desktop history table). Status text and colors
 * still come from the existing outpassStatus helpers — no logic changes.
 */
export default function StatusBadge({ request }) {
  const displayStatus = getDisplayStatus(request);
  const statusClass = getStatusClass(request);
  const Symbol = STATUS_SYMBOLS[statusClass] || ClockSymbol;

  return (
    <span className={`status-badge status-${statusClass} status-badge--icon`}>
      <span className="status-badge__symbol" aria-hidden="true">
        <Symbol />
      </span>
      {displayStatus}
    </span>
  );
}