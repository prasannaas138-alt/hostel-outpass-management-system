import { useEffect, useState } from 'react';
import '../styles/outpass-details.css';

/* Inline SVG glyphs — this project uses no icon library. */
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6.5 12 12 15.5 13.5" />
  </svg>
);

const ReasonIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const ForwardIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 4 12 12 4 20" />
    <line x1="12" y1="12" x2="21" y2="12" />
    <polyline points="18 7 21 12 18 17" />
  </svg>
);

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6.5 9.5 17 4 11.5" />
  </svg>
);

const RejectIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
  </svg>
);

import { formatTime12Hour as formatTime, formatOutpassDate } from '../utils/timeFormat';

/* Expiry moment: backend-computed `expiresAt` is the source of truth;
   date + returnTime is only a fallback. Display-only — this never
   changes approval data. */
const getExpiryMoment = (request) => {
  if (request.expiresAt) {
    return new Date(request.expiresAt).getTime();
  }
  if ((request.returnDate || request.date) && request.returnTime) {
    const [hours, minutes] = String(request.returnTime).split(':').map(Number);
    const dateStr = (request.returnDate || request.date).split('T')[0];
    // Build ISO string with explicit IST offset (+05:30) for correct UTC conversion
    const isoString = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`;
    return new Date(isoString).getTime();
  }
  return null;
};

const approvalLabel = (value) => (value === 'NotRequired' ? 'Not Required' : value || '—');

const approvalClass = (value) => {
  switch (value) {
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'NotRequired':
      return 'not-required';
    default:
      return 'pending';
  }
};

/**
 * Student Outpass Details — matches the reference image:
 * large circular college logo with the OUTPASS ID pill below it,
 * "OUTPASS SLIP / {Type} request" heading, an icon-row info list
 * (Date / Out Time / Return Time / Reason / HOD / Sister / Warden) and a
 * large centered status banner — GREEN "APPROVED" while valid, RED
 * "EXPIRED" once the return time passes (client timer, no refresh, and
 * the database is never touched from here). This screen IS the outpass:
 * there is intentionally no download button and no way to alter data.
 */
export default function OutpassDetails({ request, user, onBack, onEdit }) {
  // Lightweight heartbeat: flips the green banner to red automatically
  // when the return time passes while the page stays open.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const expiryMoment = getExpiryMoment(request);
  const timeIsUp = expiryMoment !== null && now >= expiryMoment;
  const isApprovedValid = request.status === 'Approved' && !timeIsUp;
  const isExpired = timeIsUp || request.status === 'Expired';

  const approvals = [
    { label: 'HOD', value: request.hodStatus, icon: <ForwardIcon /> },
    { label: 'Sister', value: request.sisterStatus === 'NotRequired' ? 'Pending' : request.sisterStatus, icon: <PersonIcon /> },
    { label: 'Warden', value: request.wardenStatus, icon: <ShieldIcon /> },
  ];

  const studentLine = [
    request.studentName || user?.name,
    user?.registerNumber ? `Reg. No. ${user.registerNumber}` : null,
    request.department,
    request.year,
  ].filter(Boolean).join(' · ');

  return (
    <section className="outpass-details" aria-label="Outpass details">
      <button className="outpass-details__back" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to My Requests
      </button>

      <article className="outpass-card">
        <header className="outpass-card__header">
          {/* The logo IS the branding — large, centered, no separate text.
              The ID pill is the next item in normal column flow, so it can
              never overlap the logo at any width. */}
          <img
            src="/st-joseph-logo.png"
            alt="St. Joseph University"
            className="outpass-card__logo"
            onError={(event) => { event.target.style.display = 'none'; }}
          />
          <div className="outpass-card__idpill">
            <strong>{request.outpassId || 'HOMS-SJU-—'}</strong>
            <span>Outpass ID</span>
          </div>
        </header>

        <div className="outpass-card__body">
          <p className="outpass-card__eyebrow">Outpass slip</p>
          <h1 className="outpass-card__title">{request.requestType} request</h1>
          {studentLine ? <p className="outpass-card__student">{studentLine}</p> : null}
          <hr className="outpass-card__rule" />

          <div className="outpass-card__info">
            <div className="info-row">
              <span className="info-row__icon info-row__icon--date"><CalendarIcon /></span>
              <span className="info-row__text">
                <em>Request/Out Date</em>
                <strong>{formatOutpassDate(request.date)}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--out"><ClockIcon /></span>
              <span className="info-row__text">
                <em>Out Time</em>
                <strong>{request.outTime ? formatTime(request.outTime) : '—'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--out"><ClockIcon /></span>
              <span className="info-row__text">
                <em>Out Day</em>
                <strong>{request.outDay || '--'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--return"><ClockIcon /></span>
              <span className="info-row__text">
                <em>Return Date</em>
                <strong>{formatOutpassDate(request.returnDate || request.date)}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--return"><ClockIcon /></span>
              <span className="info-row__text">
                <em>Return Day</em>
                <strong>{request.returnDay || '--'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--return"><ClockIcon /></span>
              <span className="info-row__text">
                <em>Return Time</em>
                <strong>{request.returnTime ? formatTime(request.returnTime) : '—'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--reason"><ReasonIcon /></span>
              <span className="info-row__text">
                <em>Destination</em>
                <strong>{request.destination || '—'}</strong>
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__icon info-row__icon--reason"><ReasonIcon /></span>
              <span className="info-row__text">
                <em>Reason</em>
                <strong>{request.reason || '—'}</strong>
              </span>
            </div>
            {approvals.map((item, index) => (
              <div className={`info-row ${index === 0 ? 'approval-labels' : ''}`} key={item.label}>
                <span className="info-row__icon info-row__icon--approval">{item.icon}</span>
                <span className="info-row__text">
                  <em>{item.label}</em>
                  <strong className={`info-value--${approvalClass(item.value)}`}>{approvalLabel(item.value)}</strong>
                </span>
              </div>
            ))}
            <div className="info-row outpass-report-row">
              <span className="info-row__icon info-row__icon--report" aria-hidden="true">✓</span>
              <span className="info-row__text">
                <em>Report</em>
                <strong>{request.report || '—'}</strong>
              </span>
            </div>
          </div>

          {isApprovedValid ? (
            <div className="outpass-card__final outpass-card__final--approved" role="status">
              <span className="outpass-card__glyph"><CheckIcon /></span>
              <strong className="outpass-status-word">APPROVED</strong>
              <p>You are allowed to go out.</p>
            </div>
          ) : isExpired ? (
            <div className="outpass-card__final outpass-card__final--expired" role="status">
              <span className="outpass-card__glyph"><RejectIcon /></span>
              <strong className="outpass-status-word">EXPIRED</strong>
              <p>This outpass has expired.</p>
            </div>
          ) : request.status === 'Rejected' ? (
            <div className="outpass-card__final outpass-card__final--rejected" role="status">
              <span className="outpass-card__glyph"><RejectIcon /></span>
              <strong>REJECTED</strong>
              <p>{request.rejectionReason || 'This outpass was not approved.'}</p>
              {onEdit ? (
                <button className="outpass-card__retry" type="button" onClick={() => onEdit(request._id)}>
                  Edit and reapply
                </button>
              ) : null}
            </div>
          ) : (
            <div className="outpass-card__final outpass-card__final--pending" role="status">
              <span className="outpass-card__glyph outpass-card__glyph--clock"><ClockIcon /></span>
              <strong>NOT YET APPROVED</strong>
              <p>This outpass is not valid for gate exit yet.</p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
