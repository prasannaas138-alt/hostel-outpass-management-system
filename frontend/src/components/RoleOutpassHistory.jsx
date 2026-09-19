import { useMemo, useState } from 'react';
import '../styles/warden-dashboard.css';
import { IconEye, IconSearch } from './WardenIcons';
import StudentProfileModal from './StudentProfileModal';
import { getDisplayStatus } from '../utils/outpassStatus';
import { formatTime12Hour } from '../utils/timeFormat';

const statusMeta = (item) => {
  const display = getDisplayStatus(item);
  if (display === 'Approved') return { label: 'Approved', cls: 'wd-pill--approved' };
  if (display === 'Rejected') return { label: 'Rejected', cls: 'wd-pill--rejected' };
  if (display === 'Approved - Expired' || display === 'Expired') return { label: 'Expired', cls: 'wd-pill--expired' };
  return { label: 'Pending', cls: 'wd-pill--pending' };
};

const serialOf = (item) => {
  if (item?.outpassId) return String(item.outpassId).split('-').pop();
  if (item?.seq != null) return String(item.seq).padStart(3, '0');
  return '—';
};

const dateOf = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const getStudentId = (item) => {
  const student = item?.studentId;
  if (typeof student === 'string') return student;
  return student?._id || item?.student?._id || '';
};

const FILTERS = ['All', 'Pending', 'Approved', 'Expired'];

export default function RoleOutpassHistory({
  id,
  items = [],
  loading = false,
  loadError = '',
  onRetry,
  subtitle = 'View all outpass requests and their current status.',
  emptyMessage = 'No outpasses match this view yet.',
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [profileItem, setProfileItem] = useState(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (term && !String(item.studentName || '').toLowerCase().includes(term)) return false;
      if (filter === 'All') return true;
      return statusMeta(item).label === filter;
    });
  }, [items, search, filter]);

  const countFor = (chip) =>
    chip === 'All'
      ? items.length
      : items.filter((item) => statusMeta(item).label === chip).length;

  return (
    <section id={id} className="wd-panel role-outpass-history" aria-label="Outpass History">
      <div className="wd-panel-head">
        <div>
          <h2 className="wd-panel-title">Outpass History</h2>
          <p className="wd-panel-sub">{subtitle}</p>
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
        <div className="wd-empty">{emptyMessage}</div>
      ) : (
        <>
          <div className="wd-table-wrap">
            <table className="wd-table">
              <colgroup>
                <col className="wd-col-seq" />
                <col className="wd-col-student" />
                <col className="wd-col-room" />
                <col className="wd-col-date" />
                <col className="wd-col-date" />
                <col className="wd-col-time" />
                <col className="wd-col-time" />
                <col className="wd-col-status" />
                <col className="wd-col-profile" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Room No.</th>
                  <th scope="col">Requested On</th>
                  <th scope="col">Return Date</th>
                  <th scope="col">Out Time</th>
                  <th scope="col">Return Time</th>
                  <th scope="col">Status</th>
                  <th scope="col">PROFILE</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const status = statusMeta(item);
                  const studentId = getStudentId(item);
                  return (
                    <tr key={item._id}>
                      <td className="wd-seq">{serialOf(item)}</td>
                      <td>
                        <span className="wd-row-name">{item.studentName || '—'}</span>
                        <small className="wd-panel-sub">{item.requestType} · {item.department || '—'} · Year {item.year || '—'}</small>
                      </td>
                      <td className="wd-mono">{item.roomNumber || '—'}</td>
                      <td className="wd-nowrap">{dateOf(item.date)}</td>
                      <td className="wd-nowrap">{dateOf(item.returnDate || item.date)}</td>
                      <td className="wd-mono wd-nowrap">{item.outTime ? formatTime12Hour(item.outTime) : '—'}</td>
                      <td className="wd-mono wd-nowrap">{item.returnTime ? formatTime12Hour(item.returnTime) : '—'}</td>
                      <td><span className={`wd-pill ${status.cls}`}>{status.label}</span></td>
                      <td>
                        <button
                          className="wd-view-btn"
                          type="button"
                          disabled={!studentId}
                          onClick={() => setProfileItem(item)}
                          aria-label={`View ${item.studentName || 'student'} profile`}
                        >
                          <IconEye size={15} />
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="wd-list">
            {visible.map((item) => {
              const status = statusMeta(item);
              const studentId = getStudentId(item);
              return (
                <article key={item._id} className="wd-list-item">
                  <div className="wd-list-top">
                    <span className="wd-seq">#{serialOf(item)}</span>
                    <span className={`wd-pill ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="wd-list-name">
                    <strong>{item.studentName || '—'}</strong>
                    <span>{item.requestType} · Room {item.roomNumber || '—'} · Year {item.year || '—'}</span>
                  </div>
                  <div className="wd-list-details">
                    <span>Phone <b>{item.phone || '—'}</b></span>
                    <span>Requested <b>{dateOf(item.date)}</b></span>
                    <span>Return date <b>{dateOf(item.returnDate || item.date)}</b></span>
                    <span>Out <b>{item.outTime ? formatTime12Hour(item.outTime) : '—'}</b></span>
                    <span>Return <b>{item.returnTime ? formatTime12Hour(item.returnTime) : '—'}</b></span>
                  </div>
                  <div className="wd-list-foot">
                    <span>{item.department || '—'}</span>
                    <button
                      className="wd-view-btn"
                      type="button"
                      disabled={!studentId}
                      onClick={() => setProfileItem(item)}
                      aria-label={`View ${item.studentName || 'student'} profile`}
                    >
                      <IconEye size={15} />
                      Profile
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {profileItem ? (
        <StudentProfileModal
          studentId={getStudentId(profileItem)}
          studentName={profileItem.studentName}
          onClose={() => setProfileItem(null)}
        />
      ) : null}
    </section>
  );
}
