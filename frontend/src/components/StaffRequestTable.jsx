import { useMemo, useState } from 'react';
import { formatTime12Hour as formatTime } from '../utils/timeFormat';

/**
 * StaffRequestTable — compact pending-request list shared by the HOD,
 * Sister and Warden dashboards (reference layout):
 *
 *   # | Student Name | Outing / Home | Date | Details
 *
 * Replaces the old full-size request cards so 30-50 pending applications
 * fit in one scannable table with search, type filter chips (with live
 * counts) and client-side pagination. "View" opens the full detail
 * card via onView(item) — each dashboard passes its own handler.
 */

const PAGE_SIZE = 10;

const formatShortDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function StaffRequestTable({ items, onView, emptyMessage }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = { All: items.length, Home: 0, Outing: 0 };
    items.forEach((item) => {
      if (item.requestType === 'Home') base.Home += 1;
      else if (item.requestType === 'Outing') base.Outing += 1;
    });
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'All' && item.requestType !== filter) return false;
      if (!term) return true;
      const haystack = `${item.studentName || ''} ${item.registerNumber || ''} ${item.roomNumber || ''} ${item.reason || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [items, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const changeFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const rangeLabel = filtered.length
    ? `Showing ${start + 1} - ${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} requests`
    : 'Showing 0 of 0 requests';

  return (
    <div className="staff-requests">
      <div className="staff-requests__toolbar">
        <div className="staff-requests__chips" role="group" aria-label="Filter pending requests by type">
          {['All', 'Home', 'Outing'].map((type) => (
            <button
              key={type}
              type="button"
              className={`staff-chip${filter === type ? ' staff-chip--active' : ''}`}
              onClick={() => changeFilter(type)}
              aria-pressed={filter === type}
            >
              {type} ({counts[type] ?? 0})
            </button>
          ))}
        </div>
        <label className="staff-requests__search">
          <span className="sr-only">Search by student name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search by student name..."
          />
        </label>
      </div>
      {filtered.length ? (
        <>
          <div className="table-wrap staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th scope="col" className="staff-col-sn">#</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Outing / Home</th>
                  <th scope="col">Date</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item, index) => (
                  <tr key={item._id}>
                    <td className="staff-col-sn">{start + index + 1}</td>
                    <td>
                      <div className="staff-student">
                        <span className="staff-avatar" aria-hidden="true">
                          {(item.studentName || 'S').charAt(0).toUpperCase()}
                        </span>
                        <div className="staff-student__meta">
                          <strong>{item.studentName || '—'}</strong>
                          <small>
                            {item.roomNumber ? `Room ${item.roomNumber}` : 'Room —'}
                            {' · '}
                            {item.registerNumber ? `Reg: ${item.registerNumber}` : 'Reg: —'}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`staff-type-badge staff-type-badge--${String(item.requestType || '').toLowerCase()}`}>
                        {item.requestType}
                      </span>
                    </td>
                    <td>
                      <div className="staff-date">
                        <strong>{formatShortDate(item.date)}</strong>
                        <small>{item.outTime ? formatTime(item.outTime) : '—'}</small>
                      </div>
                    </td>
                    <td>
                      <button
                        className="staff-view-btn"
                        type="button"
                        onClick={() => onView(item)}
                        aria-label={`View details for ${item.studentName || 'request'}`}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="staff-pagination">
            <span className="staff-pagination__label">{rangeLabel}</span>
            <div className="staff-pagination__controls">
              <button
                type="button"
                className="staff-page-btn"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter(
                  (candidate) =>
                    totalPages <= 5 ||
                    candidate === 1 ||
                    candidate === totalPages ||
                    Math.abs(candidate - safePage) <= 1,
                )
                .map((candidate, idx, arr) => (
                  <span key={candidate} className="staff-page-group">
                    {idx > 0 && candidate - arr[idx - 1] > 1 ? <span className="staff-page-ellipsis">…</span> : null}
                    <button
                      type="button"
                      className={`staff-page-btn${candidate === safePage ? ' staff-page-btn--active' : ''}`}
                      onClick={() => setPage(candidate)}
                      aria-current={candidate === safePage ? 'page' : undefined}
                    >
                      {candidate}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                className="staff-page-btn"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="wd-empty staff-empty">
          {search || filter !== 'All'
            ? 'No requests match this search or filter.'
            : emptyMessage || 'No pending requests right now.'}
        </div>
      )}
    </div>
  );
}
