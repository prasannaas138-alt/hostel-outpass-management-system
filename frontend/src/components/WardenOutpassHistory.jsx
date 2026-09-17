import { useMemo, useState } from 'react';
import { IconSearch, IconEye } from './WardenIcons';
import { getDisplayStatus } from '../utils/outpassStatus';
import '../styles/warden-dashboard.css';

// Status pill class for the Warden view. Approved→green, Expired→red,
// Pending→amber, Rejected→grey. Uses the shared student expiry helper so the
// approved→expired transition follows the ONE existing expiry rule.
const statusMeta = (item) => {
  const display = getDisplayStatus(item);
  if (display === 'Approved') return { label: 'Approved', cls: 'wd-pill--approved' };
  if (display === 'Rejected') return { label: 'Rejected', cls: 'wd-pill--rejected' };
  if (display === 'Approved - Expired' || display === 'Expired') return { label: 'Expired', cls: 'wd-pill--expired' };
  return { label: 'Pending', cls: 'wd-pill--pending' };
};

// Permanent serial: the record's own Outpass ID (HOMS-SJU-004 → 004). It is
// stored on the document in the database, so it never changes when the list
// is reordered or filtered — display order is newest-first, serial stays.
const serialOf = (item) => {
  if (item?.outpassId) return String(item.outpassId).split('-').pop();
  if (item?.seq != null) return String(item.seq).padStart(3, '0');
  return '—';
};

const dateOf = (item) => (item?.date ? new Date(item.date).toLocaleDateString() : '—');

const FILTERS = ['All', 'Pending', 'Approved', 'Expired'];

export default function WardenOutpassHistory({ items, loading, loadError, onRetry, onView }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  // Newest-first is already the API sort (createdAt desc); search filters by
  // student name, chips by status. Serial stays bound to each record.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (term && !String(item.studentName || '').toLowerCase().includes(term)) return false;
      if (filter === 'All') return true;
      const { label } = statusMeta(item);
      return label === filter;
    });
  }, [items, search, filter]);

  const countFor = (chip) =>
    chip === 'All'
      ? items.length
      : items.filter((item) => statusMeta(item).label === chip).length;

  return (
    <section className="wd-panel" aria-label="Outpass History">
      <div className="wd-panel-head">
        <div>
          <h2 className="wd-panel-title">Outpass History</h2>
          <p className="wd-panel-sub">View all outpass requests and their current status.</p>
        </div>
        <label className="wd-search">
          <IconSearch size={17} />
          <input
            type="search"
            placeholder="Search by student name..."
            aria-label="Search by student name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="wd-chips" role="group" aria-label="Filter outpasses by status">
        {FILTERS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={filter === chip ? 'wd-chip wd-chip--active' : 'wd-chip'}
            onClick={() => setFilter(chip)}
            aria-pressed={filter === chip}
          >
            {chip}
            <span className="wd-chip-count">{countFor(chip)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="wd-empty">Loading outpass history…</div>
      ) : loadError ? (
        <div className="wd-empty">
          {loadError}
          {onRetry ? (
            <button className="wd-btn wd-btn--ghost" type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <div className="wd-empty">No outpasses match this view yet.</div>
      ) : (
        <>
          {/* Desktop table — shown from 980px up (CSS media query). */}
          <div className="wd-table-wrap">
            <table className="wd-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Reg. No.</th>
                  <th scope="col">Room No</th>
                  <th scope="col">Phone No</th>
                  <th scope="col">Requested On</th>
                  <th scope="col">Out Time</th>
                  <th scope="col">Return Time</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const status = statusMeta(item);
                  return (
                    <tr key={item._id}>
                      <td className="wd-seq">{serialOf(item)}</td>
                      <td>
                        <span className="wd-row-name">{item.studentName}</span>
                        <small className="wd-panel-sub">{item.requestType} · {item.department} · Year {item.year}</small>
                      </td>
                      <td className="wd-mono">{item.registerNumber || '—'}</td>
                      <td className="wd-mono">{item.roomNumber || '—'}</td>
                      <td className="wd-mono">{item.phone || '—'}</td>
                      <td className="wd-nowrap">{dateOf(item)}</td>
                      <td className="wd-mono wd-nowrap">{item.outTime || '—'}</td>
                      <td className="wd-mono wd-nowrap">{item.returnTime || '—'}</td>
                      <td><span className={`wd-pill ${status.cls}`}>{status.label}</span></td>
                      <td>
                        <button className="wd-view-btn" type="button" onClick={() => onView?.(item)}>
                          <IconEye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — shown below 980px. No horizontal overflow. */}
          <div className="wd-list">
            {visible.map((item) => {
              const status = statusMeta(item);
              return (
                <article key={item._id} className="wd-list-item">
                  <div className="wd-list-top">
                    <span className="wd-seq">#{serialOf(item)}</span>
                    <span className={`wd-pill ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="wd-list-name">
                    <strong>{item.studentName}</strong>
                    <span>{item.registerNumber || '—'} · Room {item.roomNumber || '—'}</span>
                  </div>
                  <div className="wd-list-times">
                    <span>Out <b>{item.outTime || '—'}</b></span>
                    <span>Return <b>{item.returnTime || '—'}</b></span>
                  </div>
                  <div className="wd-list-foot">
                    <span>{dateOf(item)} · {item.requestType}</span>
                    <button className="wd-view-btn" type="button" onClick={() => onView?.(item)}>
                      <IconEye size={15} />
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
