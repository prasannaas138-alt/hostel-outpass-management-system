import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import {
  connectMovementSocket,
  disconnectMovementSocket,
  subscribeToMovementUpdates,
} from '../services/movementSocket';
import { todayIST } from '../utils/timeFormat';
import '../styles/staff-live-movements.css';

const movementKey = (movement) => movement?.movementId || movement?._id;

// The two values a Warden may save manually. The automatic Report can instead
// resolve to the derived movement status (e.g. 'Late Returned'), which is never
// a valid manual value, so the editor must never treat it as one.
const MANUAL_REPORT_VALUES = ['Returned', 'Not Returned'];
const pad2 = (value) => String(value).padStart(2, '0');

const dateOnlyIST = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
};

const formatInstant = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatDateLabel = (value) => {
  if (!value) return '—';
  const [year, month, date] = String(value).split('-');
  return `${date}/${month}/${year}`;
};

// The backend resolves the human readable movement status — including the
// derived 'Late Returned' — and ships it with every snapshot row and realtime
// event, so the wording and the colour key stay defined in ONE place on the
// server (server/utils/movementStatus.js). The `state` fallbacks below only
// cover payloads built before those two fields existed.
const statusLabel = (movement) => {
  if (movement?.movementStatus) return movement.movementStatus;
  if (movement?.state === 'OUTSIDE') return 'Outside';
  if (movement?.state === 'RETURNED') return 'Returned';
  return movement?.state || '—';
};

// 'outside' | 'returned' | 'late-returned' — selects the pill colour
// (amber / green / red) without duplicating the status mapping here.
const statusKey = (movement) => movement?.movementStatusKey || String(movement?.state || '').toLowerCase();

const mergeByMovementId = (rows, incoming) => {
  const next = new Map(rows.filter((row) => movementKey(row)).map((row) => [movementKey(row), row]));
  incoming.forEach((row) => {
    const key = movementKey(row);
    if (key) next.set(key, { ...next.get(key), ...row });
  });
  return [...next.values()];
};

const MovementTable = ({ rows, emptyMessage, canEditReport, onEditReport }) => (
  <div className="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Type</th>
          <th>Outpass</th>
          <th>Exit time</th>
          <th>Expected return</th>
          <th>Actual return</th>
          <th>Status</th>
          <th>Report</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((movement) => (
          <tr key={movementKey(movement)}>
            <td>
              <div className="table-copy">
                <strong>{movement.studentName || '—'}</strong>
                <span>{movement.phone || 'No phone number'}</span>
              </div>
            </td>
            <td>{movement.requestType || '—'}</td>
            <td>{movement.outpassId || '—'}</td>
            <td>{formatInstant(movement.actualExitAt)}</td>
            <td>{formatInstant(movement.expectedReturnAt)}</td>
            <td>{formatInstant(movement.actualReturnAt)}</td>
            <td>
              <span className={`movement-status movement-status--${statusKey(movement)}`}>
                {statusLabel(movement)}
              </span>
            </td>
            <td>
              <span className="movement-report-value">{movement.report || '—'}</span>
              {canEditReport ? (
                <button
                  className="movement-report-edit"
                  type="button"
                  aria-label="Edit report"
                  onClick={() => onEditReport(movement)}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {!rows.length ? <p className="staff-live-movements__empty">{emptyMessage}</p> : null}
  </div>
);

export default function LiveMovementsView({ role = 'Warden' }) {
  const [movements, setMovements] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reportMovement, setReportMovement] = useState(null);
  const [reportValue, setReportValue] = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState('');
  const bufferedEvents = useRef(new Map());

  // Students read their own JWT-scoped snapshot; staff keep the shared staff
  // endpoint. The realtime subscription, the layout and the row renderer are
  // identical for both roles — only the source snapshot is scoped.
  const isStudent = role === 'Student';
  const snapshotEndpoint = isStudent ? '/movements/my/live' : '/movements/staff/live';

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const loadSnapshot = async () => {
      try {
        const { data } = await api.get(snapshotEndpoint);
        if (!active) return;
        const snapshot = Array.isArray(data?.movements) ? data.movements : [];
        const buffered = [...bufferedEvents.current.values()];
        bufferedEvents.current.clear();
        setMovements(mergeByMovementId(snapshot, buffered));
        setLoadError('');
      } catch (error) {
        if (active) setLoadError(error.response?.data?.message || 'Unable to load live movements.');
      } finally {
        if (active) setLoading(false);
      }
    };

    connectMovementSocket();
    unsubscribe = subscribeToMovementUpdates((event) => {
      if (!active || !movementKey(event)) return;
      // The existing event calls the authoritative state `movementState`,
      // while the initial snapshot and row renderer use `state`. Normalize
      // the same event into the existing row shape before reconciling it.
      const realtimeMovement = {
        ...event,
        state: event.state ?? event.movementState,
      };
      bufferedEvents.current.set(movementKey(realtimeMovement), realtimeMovement);
      setMovements((current) => mergeByMovementId(current, [realtimeMovement]));
    });
    loadSnapshot();

    return () => {
      active = false;
      unsubscribe();
      disconnectMovementSocket();
    };
  }, [snapshotEndpoint]);

  const openReportEditor = (movement) => {
    setReportMovement(movement);
    setReportValue(MANUAL_REPORT_VALUES.includes(movement.report) ? movement.report : '');
    setReportError('');
  };

  const saveReport = async () => {
    if (!reportMovement || !MANUAL_REPORT_VALUES.includes(reportValue)) return;
    setReportSaving(true);
    setReportError('');
    try {
      const { data } = await api.patch(`/movements/${movementKey(reportMovement)}/report`, { report: reportValue });
      setMovements((current) => mergeByMovementId(current, [{
        ...reportMovement,
        report: data.report,
      }]));
      setReportMovement(null);
    } catch (error) {
      setReportError(error.response?.data?.message || 'Unable to save report.');
    } finally {
      setReportSaving(false);
    }
  };

  const visible = useMemo(() => movements.filter((movement) => {
    const actualExitDate = dateOnlyIST(movement.actualExitAt);
    const actualReturnDate = dateOnlyIST(movement.actualReturnAt);
    const expectedReturnDate = dateOnlyIST(movement.expectedReturnAt);
    return actualExitDate === selectedDate || actualReturnDate === selectedDate ||
      (movement.requestType === 'Home' && movement.state === 'OUTSIDE' && expectedReturnDate === selectedDate);
  }), [movements, selectedDate]);

  const outing = visible.filter((movement) => movement.requestType === 'Outing');
  const homeGoing = visible.filter((movement) => movement.requestType === 'Home' && dateOnlyIST(movement.actualExitAt) === selectedDate);
  const homeNeedReturn = visible.filter((movement) => movement.requestType === 'Home' && movement.state === 'OUTSIDE' && dateOnlyIST(movement.expectedReturnAt) === selectedDate);

  return (
    <section className="staff-live-movements" aria-label={isStudent ? 'My live movements' : 'Live student movements'}>
      <div className="staff-live-movements__heading">
        <div>
          <p className="staff-live-movements__eyebrow">Live movement</p>
          <h2>{isStudent ? 'My movements' : 'Student movements'}</h2>
          <p className="staff-live-movements__description">
            {isStudent
              ? 'Your own EXIT and RETURN records for a selected date.'
              : 'View actual EXIT and RETURN records for a selected date.'}
          </p>
        </div>
        <div className="staff-live-movements__controls">
          <label className="staff-live-movements__date">Movement date
            <input type="date" value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} />
          </label>
          <span className="staff-live-movements__badge">Live</span>
        </div>
      </div>

      {loadError ? <p className="staff-live-movements__error">{loadError}</p> : null}
      {loading ? <p className="staff-live-movements__empty">Loading movements…</p> : null}

      <section className="lm-card lm-card--outing">
        <div className="lm-card__head">
          <div className="lm-card__title-wrap">
            <span className="lm-card__icon lm-card__icon--outing" aria-hidden="true">🚶</span>
            <div>
              <h3>Outing</h3>
              <p>{isStudent ? 'Your outing movements (not to home).' : 'Students who are going out for outing (not to home).'}</p>
            </div>
          </div>
          <span className="lm-card__count">{outing.length}</span>
        </div>
        <MovementTable rows={outing} emptyMessage="No outing movement records for this date." canEditReport={role === 'Warden'} onEditReport={openReportEditor} />
      </section>

      <section className="lm-card lm-card--home">
        <div className="lm-card__head">
          <div className="lm-card__title-wrap">
            <span className="lm-card__icon lm-card__icon--home" aria-hidden="true">🏠</span>
            <div>
              <h3>Home Movement</h3>
              <p>{isStudent ? 'Your home movements and expected returns.' : 'Students who are going home or need to return home.'}</p>
            </div>
          </div>
        </div>

        <section className="lm-subsection lm-subsection--going">
          <div className="lm-subsection__head">
            <div className="lm-subsection__title-wrap">
              <span className="lm-subsection__icon" aria-hidden="true">🏡</span>
              <h4>{isStudent ? 'Going Home Today' : 'Students Going Home Today'}</h4>
            </div>
            <div className="lm-subsection__meta">
              <span className="lm-date-chip">Out Date: {formatDateLabel(selectedDate)}</span>
              <span className="lm-card__count">{homeGoing.length}</span>
            </div>
          </div>
          <MovementTable rows={homeGoing} emptyMessage={isStudent ? 'No home movement records for this date.' : 'No students are going home on this date.'} canEditReport={role === 'Warden'} onEditReport={openReportEditor} />
        </section>

        <section className="lm-subsection lm-subsection--return">
          <div className="lm-subsection__head">
            <div className="lm-subsection__title-wrap">
              <span className="lm-subsection__icon" aria-hidden="true">🔁</span>
              <h4>{isStudent ? 'Need to Return Home Today' : 'Students Who Need to Return Home Today'}</h4>
            </div>
            <div className="lm-subsection__meta">
              <span className="lm-date-chip">Return Date: {formatDateLabel(selectedDate)}</span>
              <span className="lm-card__count">{homeNeedReturn.length}</span>
            </div>
          </div>
          <MovementTable rows={homeNeedReturn} emptyMessage={isStudent ? 'No return-home records for this date.' : 'No students need to return home on this date.'} canEditReport={role === 'Warden'} onEditReport={openReportEditor} />
        </section>
      </section>

      {reportMovement ? (
        <div className="movement-report-overlay" role="dialog" aria-modal="true" aria-label="Edit report">
          <div className="movement-report-modal">
            <h3>Edit Report</h3>
            <p>Set the Warden verification for this movement.</p>
            <label>
              <input
                type="radio"
                name="movement-report"
                value="Returned"
                checked={reportValue === 'Returned'}
                onChange={(event) => setReportValue(event.target.value)}
              />
              Returned
            </label>
            <label>
              <input
                type="radio"
                name="movement-report"
                value="Not Returned"
                checked={reportValue === 'Not Returned'}
                onChange={(event) => setReportValue(event.target.value)}
              />
              Not Returned
            </label>
            {reportError ? <p className="movement-report-error" role="alert">{reportError}</p> : null}
            <div className="movement-report-actions">
              <button type="button" className="secondary-button" onClick={() => setReportMovement(null)} disabled={reportSaving}>Cancel</button>
              <button type="button" className="primary-button" onClick={saveReport} disabled={reportSaving || !reportValue}>
                {reportSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
