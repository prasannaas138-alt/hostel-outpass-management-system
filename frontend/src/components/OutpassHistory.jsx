import { useEffect, useMemo, useState } from 'react';
import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';
import StudentRequestCard from './StudentRequestCard';
import StatusBadge from './StatusBadge';
import Pagination from './Pagination';
import { formatDate, formatTime12Hour as formatTime } from '../utils/timeFormat';

// Outpass History pagination — exactly 30 records per page, newest first.
// Pages are computed dynamically from the currently filtered list.
const PAGE_SIZE = 30;

const byNewestFirst = (a, b) =>
  String(b.createdAt || '').localeCompare(String(a.createdAt || '')) ||
  String(b.date || '').localeCompare(String(a.date || ''));

export default function OutpassHistory(props) {
  const {
    requests,
    loading,
    error,
    counts,
    typeFilter,
    onTypeFilterChange,
    search,
    onSearchChange,
    onViewDetails,
  } = props;

  const [page, setPage] = useState(1);

  // Newest -> oldest, computed dynamically from the currently filtered list.
  const sorted = useMemo(() => [...requests].sort(byNewestFirst), [requests]);

  // Changing the type filter or search always returns to Page 1.
  useEffect(() => {
    setPage(1);
  }, [typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRequests = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  return (
    <div className="history-wrap">
      <div className="requests-toolbar">
        <div className="requests-filters" role="group" aria-label="Filter history by type">
          {['All', 'Home', 'Outing'].map((type) => (
            <button
              key={type}
              type="button"
              className={typeFilter === type ? 'requests-chip requests-chip--active' : 'requests-chip'}
              onClick={() => onTypeFilterChange(type)}
              aria-pressed={typeFilter === type}
            >
              {type}
              {counts ? <span className="chip-count">{counts[type] ?? 0}</span> : null}
            </button>
          ))}
        </div>
        <label className="requests-search">
          <span className="sr-only">Search history</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reason or date"
          />
        </label>
      </div>

      <AlertBanner type="error" message={error} />

      {loading ? (
        <LoadingState label="Loading outpass history..." />
      ) : requests.length ? (
        <>
          <div className="history-cards">
            {pageRequests.map((request) => (
              <StudentRequestCard
                key={request._id}
                request={request}
                variant="history-compact"
                onViewDetails={onViewDetails}
              />
            ))}
          </div>

          <div className="table-wrap history-table-wrap">
            <table className="requests-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRequests.map((request) => (
                  <tr key={request._id}>
                    <td><strong>{request.requestType}</strong></td>
                    <td>{formatDate(request.date)}</td>
                    <td>{formatTime(request.outTime)}-{formatTime(request.returnTime)}</td>
                    <td className="requests-reason-cell">{request.reason}</td>
                    <td><StatusBadge request={request} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="link-button" type="button" onClick={() => onViewDetails(request._id)}>Outpass</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
        <div className="empty-state">No historical outpasses match this view.</div>
      )}
    </div>
  );
}