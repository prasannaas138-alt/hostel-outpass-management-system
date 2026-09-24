import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
  connectMovementSocket,
  disconnectMovementSocket,
  subscribeToMovementUpdates,
} from '../services/movementSocket';
import '../styles/staff-live-movements.css';

const movementKey = (movement) => movement?.movementId || movement?._id;

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

export default function StaffLiveMovements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const bufferedEvents = useRef(new Map());

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const applyBufferedEvents = (snapshot) => {
      const buffered = [...bufferedEvents.current.values()];
      bufferedEvents.current.clear();
      return mergeByMovementId(snapshot, buffered);
    };

    const loadSnapshot = async () => {
      try {
        const { data } = await api.get('/movements/staff/live');
        if (!active) return;
        const snapshot = Array.isArray(data?.movements) ? data.movements : [];
        setMovements(applyBufferedEvents(snapshot));
        setLoadError('');
      } catch (error) {
        if (!active) return;
        setLoadError(error.response?.data?.message || 'Unable to load live movements.');
      } finally {
        if (active) setLoading(false);
      }
    };

    // Register the listener before the snapshot completes so an event cannot be
    // lost between the initial request and socket setup. Events are reconciled by
    // movementId when the snapshot arrives.
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

  return (
    <section className="staff-live-movements" aria-label="Live student movements">
      <div className="staff-live-movements__heading">
        <div>
          <p className="staff-live-movements__eyebrow">Live movement</p>
          <h2>Student movements</h2>
        </div>
        <span className="staff-live-movements__badge">Live</span>
      </div>

      {loadError ? <p className="staff-live-movements__error">{loadError}</p> : null}
      {loading ? <p className="staff-live-movements__empty">Loading movements…</p> : null}
      {!loading && !loadError && movements.length === 0 ? (
        <p className="staff-live-movements__empty">No movement records yet.</p>
      ) : null}

      {movements.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Outpass</th>
                <th>Exit time</th>
                <th>Expected return</th>
                <th>Actual return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movementKey(movement)}>
                  <td>
                    <div className="table-copy">
                      <strong>{movement.studentName || '—'}</strong>
                      <span>{movement.registerNumber || movement.hostelName || '—'}</span>
                    </div>
                  </td>
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
        </div>
      ) : null}
    </section>
  );
}
