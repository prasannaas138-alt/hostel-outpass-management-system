import { useEffect, useMemo, useState } from 'react';
import '../styles/warden-dashboard.css';
import '../styles/outpass-history.css';
import api from '../services/api';
import { IconCalendar, IconEye, IconSearch } from './WardenIcons';
import StudentProfileModal from './StudentProfileModal';
import Pagination from './Pagination';
import { getDisplayStatus } from '../utils/outpassStatus';
import { formatTime12Hour, todayIST } from '../utils/timeFormat';

// Shared Outpass History for HOD, Sister and Warden (WardenOutpassHistory
// re-exports this component). ONE calendar date at the top filters the whole
// page into two columns:
//   LEFT  - Outing Outpass   (requestType Outing, Out Date = selected date)
//   RIGHT - Home Outpass     (requestType Home)
//             Going Home     (Out Date    = selected date)
//             Returning Home (Return Date = selected date)
// Each of the three sections paginates independently at 15 records per page.
const PAGE_SIZE = 15;

const statusMeta = (item) => {
  const display = getDisplayStatus(item);
  if (display === 'Approved') return { label: 'Approved', cls: 'wd-pill--approved' };
  if (display === 'Rejected') return { label: 'Rejected', cls: 'wd-pill--rejected' };
  if (display === 'Approved - Expired' || display === 'Expired') return { label: 'Expired', cls: 'wd-pill--expired' };
  return { label: 'Pending', cls: 'wd-pill--pending' };
};

const getStudentId = (item) => {
  const student = item?.studentId;
  if (typeof student === 'string') return student;
  return student?._id || item?.student?._id || '';
};

const pad2 = (value) => String(value).padStart(2, '0');

// "YYYY-MM-DD" IST calendar day of any stored date shape (Date object,
// "YYYY-MM-DD", or full ISO string): shift +05:30, then read the UTC parts -
// the exact convention of the backend's toDateOnlyString, so selecting
// 24/09/2026 can never match 23/09/2026 or 25/09/2026 in any browser zone.
const dateOnlyIST = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
  }
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value).trim());
  return match ? `${match[1]}-${pad2(match[2])}-${pad2(match[3])}` : '';
};

// DD/MM/YYYY display (the reference format), always derived from the IST
// calendar day above - never a raw toLocaleDateString() of the ISO string.
const displayDate = (value) => {
  const day = dateOnlyIST(value);
  if (!day) return '\u2014';
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
};

// Deterministic order for a selected-date view: time ascending (24-hour
// "HH:MM" strings compare correctly), student name as tie-break. The API
// returns newest-created first; a calendar-date view must not rely on that.
const byTimeThenName = (timeKey) => (a, b) =>
  String(a[timeKey] || '').localeCompare(String(b[timeKey] || '')) ||
  String(a.studentName || '').localeCompare(String(b.studentName || ''));

const FILTERS = ['All', 'Pending', 'Approved', 'Expired'];

export default function RoleOutpassHistory({
  id,
  endpoint = '',
  items = [],
  loading = false,
  loadError = '',
  onRetry,
}) {
  // The single calendar at the top controls EVERYTHING below it.
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [reloadKey, setReloadKey] = useState(0);
  const [records, setRecords] = useState([]);
  const [fetching, setFetching] = useState(Boolean(endpoint));
  const [fetchError, setFetchError] = useState('');

  // One search bar per main column; the Home search covers BOTH Home
  // sub-sections while keeping them separate.
  const [outingSearch, setOutingSearch] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [filter, setFilter] = useState('All');
  // Three independent pagination states - one per section.
  const [outingPage, setOutingPage] = useState(1);
  const [goingPage, setGoingPage] = useState(1);
  const [returningPage, setReturningPage] = useState(1);
  const [profileItem, setProfileItem] = useState(null);

  // Refetch whenever the selected date changes. The backend receives the
  // day as ?date= and returns only records whose Out Date or Return Date
  // matches it; the same rule is re-checked below as a client-side
  // safeguard, so a previous date's records can never remain on screen.
  useEffect(() => {
    if (!endpoint) return undefined;
    let cancelled = false;
    setFetching(true);
    setFetchError('');
    api
      .get(endpoint, { params: { date: selectedDate } })
      .then(({ data }) => {
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRecords([]);
          setFetchError(err.response?.data?.message || 'Failed to load outpass history.');
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, selectedDate, reloadKey]);

  // endpoint mode = self-fetched, date-filtered data; without an endpoint
  // the legacy `items` prop still works exactly as before.
  const source = endpoint ? records : items;
  const busy = endpoint ? fetching : loading;
  const error = endpoint ? fetchError : loadError;
  const retry = endpoint ? () => setReloadKey((key) => key + 1) : onRetry;

  // ----- classify the selected date's records from ACTUAL stored dates ----
  const dayRecords = useMemo(
    () =>
      source.filter(
        (item) =>
          dateOnlyIST(item.date) === selectedDate ||
          dateOnlyIST(item.returnDate) === selectedDate
      ),
    [source, selectedDate]
  );

  const outingAll = useMemo(
    () =>
      dayRecords
        .filter(
          (item) =>
            item.requestType === 'Outing' && dateOnlyIST(item.date) === selectedDate
        )
        .sort(byTimeThenName('outTime')),
    [dayRecords, selectedDate]
  );

  const goingAll = useMemo(
    () =>
      dayRecords
        .filter(
          (item) =>
            item.requestType === 'Home' && dateOnlyIST(item.date) === selectedDate
        )
        .sort(byTimeThenName('outTime')),
    [dayRecords, selectedDate]
  );

  const returningAll = useMemo(
    () =>
      dayRecords
        .filter(
          (item) =>
            item.requestType === 'Home' &&
            dateOnlyIST(item.returnDate) === selectedDate
        )
        .sort(byTimeThenName('returnTime')),
    [dayRecords, selectedDate]
  );

  // ----- search + status filter (applied INSIDE the selected date only) ----
  const matchesFilter = (item) =>
    filter === 'All' || statusMeta(item).label === filter;
  const matchesName = (item, term) =>
    !term || String(item.studentName || '').toLowerCase().includes(term);

  const outingTerm = outingSearch.trim().toLowerCase();
  const homeTerm = homeSearch.trim().toLowerCase();

  const outingVisible = useMemo(
    () => outingAll.filter((item) => matchesName(item, outingTerm) && matchesFilter(item)),
    [outingAll, outingTerm, filter]
  );
  const goingVisible = useMemo(
    () => goingAll.filter((item) => matchesName(item, homeTerm) && matchesFilter(item)),
    [goingAll, homeTerm, filter]
  );
  const returningVisible = useMemo(
    () => returningAll.filter((item) => matchesName(item, homeTerm) && matchesFilter(item)),
    [returningAll, homeTerm, filter]
  );

  // Changing the date/search/filter returns the affected sections to page 1.
  useEffect(() => {
    setOutingPage(1);
  }, [selectedDate, filter, outingSearch]);
  useEffect(() => {
    setGoingPage(1);
    setReturningPage(1);
  }, [selectedDate, filter, homeSearch]);

  // Each section slices its OWN list at 15 records per page.
  const paginate = (list, page) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    return {
      totalPages,
      currentPage,
      pageItems: list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    };
  };

  const outing = paginate(outingVisible, outingPage);
  const going = paginate(goingVisible, goingPage);
  const returning = paginate(returningVisible, returningPage);

  // Status-chip counts are scoped to the selected date as well.
  const countFor = (chip) =>
    chip === 'All'
      ? dayRecords.length
      : dayRecords.filter((item) => statusMeta(item).label === chip).length;

  const serialFor = (page, index) => (page - 1) * PAGE_SIZE + index + 1;

  const emptyFor = (hasNarrowing, base) =>
    hasNarrowing ? 'No records match this search or filter.' : base;

  const nameCell = (item) => (
    <>
      <span className="wd-row-name">{item.studentName || '—'}</span>
      <small className="wd-panel-sub">
        Room {item.roomNumber || '—'} · {item.department || '—'} · Year{' '}
        {item.year || '—'}
      </small>
    </>
  );

  const profileButton = (item) => {
    const studentId = getStudentId(item);
    return (
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
    );
  };
  return (
    <section
      id={id}
      className="wd-panel role-outpass-history"
      aria-label="Outpass History"
    >
      {/* Header: title + the selected-date calendar that drives the page. */}
      <div className="wd-panel-head">
        <div>
          <h2 className="wd-panel-title">Outpass History</h2>
          <p className="wd-panel-sub">
            View and manage outpass records for a selected date.
          </p>
        </div>
        <label className="oh-datepick">
          <IconCalendar size={17} aria-hidden="true" />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (event.target.value) setSelectedDate(event.target.value);
            }}
            aria-label="Select date for outpass history"
          />
        </label>
      </div>

      {/* Summary counts - always for the SELECTED date, never a fixed today. */}
      <div className="oh-summary" role="group" aria-label="Selected date summary">
        <article className="oh-stat">
          <span className="oh-stat__icon oh-stat__icon--green" aria-hidden="true">
            👤
          </span>
          <div className="oh-stat__body">
            <p className="oh-stat__label">Students Going Home Today</p>
            <p className="oh-stat__value oh-stat__value--green">{goingAll.length}</p>
          </div>
        </article>
        <article className="oh-stat">
          <span className="oh-stat__icon oh-stat__icon--blue" aria-hidden="true">
            👤
          </span>
          <div className="oh-stat__body">
            <p className="oh-stat__label">Students Need to Return Home Today</p>
            <p className="oh-stat__value oh-stat__value--blue">
              {returningAll.length}
            </p>
          </div>
        </article>
        <article className="oh-stat">
          <span className="oh-stat__icon oh-stat__icon--purple" aria-hidden="true">
            ⏱️
          </span>
          <div className="oh-stat__body">
            <p className="oh-stat__label">Total Outing (Today)</p>
            <p className="oh-stat__value oh-stat__value--purple">{outingAll.length}</p>
          </div>
        </article>
      </div>

      {/* Existing status chips - now counted within the selected date. */}
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

      {busy ? (
        <div className="wd-empty">Loading outpass history…</div>
      ) : error ? (
        <div className="wd-empty">
          {error}
          {retry ? (
            <button className="wd-btn wd-btn--ghost" type="button" onClick={retry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        <div className="oh-columns">
          {/* ---------------------------------------------- LEFT: OUTING */}
          <section className="oh-column" aria-label="Outing Outpass">
            <div className="oh-col-head">
              <span className="oh-col-icon oh-col-icon--outing" aria-hidden="true">
                🚶
              </span>
              <div>
                <h3>Outing Outpass</h3>
                <p>Students who are going out for outing (not to home).</p>
              </div>
            </div>

            <label className="wd-search">
              <IconSearch size={17} />
              <input
                type="search"
                placeholder="Search by student name..."
                aria-label="Search outing outpasses by student name"
                value={outingSearch}
                onChange={(event) => setOutingSearch(event.target.value)}
              />
            </label>

            {outingVisible.length === 0 ? (
              <div className="wd-empty">
                {emptyFor(
                  Boolean(outingTerm) || filter !== 'All',
                  'No outing outpasses for this date.'
                )}
              </div>
            ) : (
              <div className="wd-table-wrap">
                <table className="wd-table oh-table--outing">
                  <colgroup>
                    <col className="oh-col-no" />
                    <col className="oh-col-name" />
                    <col className="oh-col-date" />
                    <col className="oh-col-date" />
                    <col className="oh-col-time" />
                    <col className="oh-col-time" />
                    <col className="oh-col-status" />
                    <col className="oh-col-profile" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">S.NO</th>
                      <th scope="col">Name</th>
                      <th scope="col">Outing Date</th>
                      <th scope="col">Return Date</th>
                      <th scope="col">Out Time</th>
                      <th scope="col">Return Time</th>
                      <th scope="col">Status</th>
                      <th scope="col">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outing.pageItems.map((item, index) => {
                      const status = statusMeta(item);
                      return (
                        <tr key={item._id}>
                          <td className="wd-seq">
                            {serialFor(outing.currentPage, index)}
                          </td>
                          <td>{nameCell(item)}</td>
                          <td className="wd-nowrap">{displayDate(item.date)}</td>
                          <td className="wd-nowrap">
                            {displayDate(item.returnDate || item.date)}
                          </td>
                          <td className="wd-mono wd-nowrap">
                            {formatTime12Hour(item.outTime)}
                          </td>
                          <td className="wd-mono wd-nowrap">
                            {formatTime12Hour(item.returnTime)}
                          </td>
                          <td>
                            <span className={`wd-pill ${status.cls}`}>
                              {status.label}
                            </span>
                          </td>
                          <td>{profileButton(item)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={outing.currentPage}
              totalPages={outing.totalPages}
              onChange={setOutingPage}
              total={outingVisible.length}
              pageSize={PAGE_SIZE}
              label="Outing outpass pages"
            />
          </section>
          {/* ------------------------------------------- RIGHT: HOME -- */}
          <section className="oh-column" aria-label="Home Outpass">
            <div className="oh-col-head">
              <span className="oh-col-icon oh-col-icon--home" aria-hidden="true">
                🏠
              </span>
              <div>
                <h3>Home Outpass</h3>
                <p>Students who are going to home or need to return home.</p>
              </div>
            </div>

            {/* One search bar shared by BOTH Home sub-sections; each keeps
                its own table and pagination below. */}
            <label className="wd-search">
              <IconSearch size={17} />
              <input
                type="search"
                placeholder="Search by student name..."
                aria-label="Search home outpasses by student name"
                value={homeSearch}
                onChange={(event) => setHomeSearch(event.target.value)}
              />
            </label>

            {/* HOME 1 - Out Date = selected date (green style). */}
            <div className="oh-subsection">
              <div className="oh-subhead oh-subhead--going">
                <span className="oh-sub-icon" aria-hidden="true">
                  🏡
                </span>
                <h4>Students who are going to Home today</h4>
                <span className="oh-date-chip">
                  Out Date: {displayDate(selectedDate)}
                </span>
              </div>

              {goingVisible.length === 0 ? (
                <div className="wd-empty">
                  {emptyFor(
                    Boolean(homeTerm) || filter !== 'All',
                    'No students are going home on this date.'
                  )}
                </div>
              ) : (
                <div className="wd-table-wrap">
                  <table className="wd-table oh-table--home">
                    <colgroup>
                      <col className="oh-hcol-no" />
                      <col className="oh-hcol-name" />
                      <col className="oh-hcol-date" />
                      <col className="oh-hcol-status" />
                      <col className="oh-hcol-profile" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">S.NO</th>
                        <th scope="col">Name</th>
                        <th scope="col">Out Date</th>
                        <th scope="col">Status</th>
                        <th scope="col">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {going.pageItems.map((item, index) => {
                        const status = statusMeta(item);
                        return (
                          <tr key={item._id}>
                            <td className="wd-seq">
                              {serialFor(going.currentPage, index)}
                            </td>
                            <td>{nameCell(item)}</td>
                            <td className="wd-nowrap">{displayDate(item.date)}</td>
                            <td>
                              <span className={`wd-pill ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                            <td>{profileButton(item)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <Pagination
                page={going.currentPage}
                totalPages={going.totalPages}
                onChange={setGoingPage}
                total={goingVisible.length}
                pageSize={PAGE_SIZE}
                label="Going home pages"
              />
            </div>

            {/* HOME 2 - Return Date = selected date (red/return style). */}
            <div className="oh-subsection">
              <div className="oh-subhead oh-subhead--returning">
                <span className="oh-sub-icon" aria-hidden="true">
                  🔁
                </span>
                <h4>Students who need to return Home today</h4>
                <span className="oh-date-chip">
                  Return Date: {displayDate(selectedDate)}
                </span>
              </div>

              {returningVisible.length === 0 ? (
                <div className="wd-empty">
                  {emptyFor(
                    Boolean(homeTerm) || filter !== 'All',
                    'No students need to return home on this date.'
                  )}
                </div>
              ) : (
                <div className="wd-table-wrap">
                  <table className="wd-table oh-table--home">
                    <colgroup>
                      <col className="oh-hcol-no" />
                      <col className="oh-hcol-name" />
                      <col className="oh-hcol-date" />
                      <col className="oh-hcol-status" />
                      <col className="oh-hcol-profile" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">S.NO</th>
                        <th scope="col">Name</th>
                        <th scope="col">Return Date</th>
                        <th scope="col">Status</th>
                        <th scope="col">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returning.pageItems.map((item, index) => {
                        const status = statusMeta(item);
                        return (
                          <tr key={item._id}>
                            <td className="wd-seq">
                              {serialFor(returning.currentPage, index)}
                            </td>
                            <td>{nameCell(item)}</td>
                            <td className="wd-nowrap">
                              {displayDate(item.returnDate || item.date)}
                            </td>
                            <td>
                              <span className={`wd-pill ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                            <td>{profileButton(item)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <Pagination
                page={returning.currentPage}
                totalPages={returning.totalPages}
                onChange={setReturningPage}
                total={returningVisible.length}
                pageSize={PAGE_SIZE}
                label="Returning home pages"
              />
            </div>
          </section>
        </div>
      )}

      {/* Existing student profile modal - unchanged behavior. */}
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