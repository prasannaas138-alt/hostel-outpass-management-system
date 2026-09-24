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

const statusLabel = (state) => {
  if (state === 'OUTSIDE') return 'Outside';
  if (state === 'RETURNED') return 'Returned';
  return state || '—';
};

const mergeByMovementId = (rows, incoming) => {
  const next = new Map(rows.filter((row) => movementKey(row)).map((row) => [movementKey(row), row]));
  incoming.forEach((row) => {
    const key = movementKey(row);
    if (key) next.set(key, { ...next.get(key), ...row });
  });
  return [...next.values()];
};

const MovementTable = ({ rows, emptyMessage }) => (
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
              <span className={`movement-status movement-status--${String(movement.state || '').toLowerCase()}`}>
                {statusLabel(movement.state)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {!rows.length ? <p className="staff-live-movements__empty">{emptyMessage}</p> : null}
  </div>
);

export default function LiveMovementsView() {
  const [movements, setMovements] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const bufferedEvents = useRef(new Map());

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const loadSnapshot = async () => {
      try {
        const { data } = await api.get('/movements/staff/live');
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
      bufferedEvents.current.set(movementKey(event), event);
      setMovements((current) => mergeByMovementId(current, [event]));
    });
    loadSnapshot();

    return () => {
      active = false;
      unsubscribe();
      disconnectMovementSocket();
    };
  }, []);

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
  const homeReturned = visible.filter((movement) => movement.requestType === 'Home' && dateOnlyIST(movement.actualReturnAt) === selectedDate);


  return (
    <section className="staff-live-movements" aria-label="Live student movements">
      <div className="staff-live-movements__heading">
        <div>
          <p className="staff-live-movements__eyebrow">Live movement</p>
          <h2>Student movements</h2>
          <p className="staff-live-movements__description">View actual EXIT and RETURN records for a selected date.</p>
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

      <div className="staff-live-movements__section">
        <div className="staff-live-movements__section-head"><h3>Outing</h3><span>{outing.length}</span></div>
        <MovementTable rows={outing} emptyMessage="No Outing movement records for this date." />
      </div>
      <div className="staff-live-movements__section">
        <div className="staff-live-movements__section-head"><h3>Students Going Home Today</h3><span>{homeGoing.length}</span></div>
        <MovementTable rows={homeGoing} emptyMessage="No Home EXIT records for this date." />
      </div>
      <div className="staff-live-movements__section">
        <div className="staff-live-movements__section-head"><h3>Students Who Need to Return Home Today</h3><span>{homeNeedReturn.length}</span></div>
        <MovementTable rows={homeNeedReturn} emptyMessage="No Home students are currently due to return on this date." />
      </div>
      <div className="staff-live-movements__section">
        <div className="staff-live-movements__section-head"><h3>Students Who Returned Home</h3><span>{homeReturned.length}</span></div>
        <MovementTable rows={homeReturned} emptyMessage="No Home RETURN records for this date." />
      </div>
    </section>
  );
}
