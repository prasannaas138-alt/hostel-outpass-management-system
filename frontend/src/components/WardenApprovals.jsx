import { useState } from 'react';
import AlertBanner from './AlertBanner';
import LoadingState from './LoadingState';
import RequestReviewCard from './RequestReviewCard';
import WardenStudentDetails from './WardenStudentDetails';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatTime = (value) => value || '—';

export default function WardenApprovals({
  items,
  loading,
  error,
  success,
  typeFilter,
  onTypeFilterChange,
  loadingId,
  activeRejectId,
  setActiveRejectId,
  reasonById,
  setReasonById,
  onApprove,
  onReject,
}) {
  const [detailId, setDetailId] = useState(null);
  const [studentDetailId, setStudentDetailId] = useState(null);
  const detailItem = items.find((item) => item._id === detailId) || null;
  const studentDetail = items.find((item) => item._id === studentDetailId) || null;

  const visibleItems = typeFilter === 'All'
    ? items
    : items.filter((item) => item.requestType === typeFilter);

  const openReview = (id) => {
    setStudentDetailId(null);
    setDetailId(id);
  };

  const openStudent = (id) => {
    setDetailId(null);
    setStudentDetailId(id);
  };

  const closeDetails = () => {
    setDetailId(null);
    setStudentDetailId(null);
    setActiveRejectId('');
  };

  return (
    <div className="warden-approvals">
      <div className="requests-filters" role="group" aria-label="Filter approvals by type">
        {['All', 'Outing', 'Home'].map((type) => (
          <button
            key={type}
            type="button"
            className={typeFilter === type ? 'requests-chip requests-chip--active' : 'requests-chip'}
            onClick={() => onTypeFilterChange(type)}
            aria-pressed={typeFilter === type}
          >
            {type}
          </button>
        ))}
      </div>

      <AlertBanner type="error" message={error} />
      <AlertBanner type="success" message={success} />

      {loading ? (
        <LoadingState label="Loading pending requests..." />
      ) : visibleItems.length ? (
        <>
          <div className="warden-approvals-cards">
            {visibleItems.map((item) => (
              <div key={item._id} className="warden-approvals-card">
                <RequestReviewCard
                  item={item}
                  variant="slip"
                  approveLabel="Approve Outpass"
                  rejectLabel="Reject"
                  activeRejectId={activeRejectId}
                  setActiveRejectId={setActiveRejectId}
                  reasonById={reasonById}
                  setReasonById={setReasonById}
                  loadingId={loadingId}
                  onApprove={onApprove}
                  onReject={onReject}
                />
                <button className="secondary-button warden-student-info-btn" type="button" onClick={() => openStudent(item._id)}>
                  Student info
                </button>
              </div>
            ))}
          </div>

          <div className="table-wrap warden-table-wrap">
            <table className="warden-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Request</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.studentName}</strong>
                      <small>{item.department} · Year {item.year}</small>
                      <button className="link-button" type="button" onClick={() => openStudent(item._id)}>
                        Student info
                      </button>
                    </td>
                    <td>{item.requestType}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{formatTime(item.outTime)}–{formatTime(item.returnTime)}</td>
                    <td className="warden-reason-cell">{item.reason}</td>
                    <td>
                      <span className={`status-badge status-${String(item.status).toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td>
                      <button className="secondary-button warden-review-btn" type="button" onClick={() => openReview(item._id)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detailItem ? (
            <div className="requests-modal" role="dialog" aria-modal="true" aria-label="Request review details">
              <div className="requests-modal-card">
                <div className="requests-modal-head">
                  <div>
                    <p className="eyebrow">Final review</p>
                    <h3>{detailItem.studentName}</h3>
                    <p className="muted">
                      {detailItem.department} · Year {detailItem.year} · {detailItem.requestType}
                    </p>
                  </div>
                  <span className={`status-badge status-${String(detailItem.status).toLowerCase()}`}>
                    {detailItem.status}
                  </span>
                </div>

                <RequestReviewCard
                  item={detailItem}
                  variant="slip"
                  approveLabel="Approve Outpass"
                  rejectLabel="Reject"
                  activeRejectId={activeRejectId}
                  setActiveRejectId={setActiveRejectId}
                  reasonById={reasonById}
                  setReasonById={setReasonById}
                  loadingId={loadingId}
                  onApprove={onApprove}
                  onReject={onReject}
                />

                <div className="button-row">
                  <button className="secondary-button" type="button" onClick={closeDetails}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          {typeFilter === 'All'
            ? 'No pending requests for Warden review. New requests will appear here when they are ready.'
            : `No pending ${typeFilter.toLowerCase()} requests right now.`}
        </div>
      )}
    </div>
  );
}