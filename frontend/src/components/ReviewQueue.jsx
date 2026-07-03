import RequestReviewCard from './RequestReviewCard';

export default function ReviewQueue({
  items,
  emptyMessage,
  onApprove,
  onReject,
  reasonById,
  setReasonById,
  activeRejectId,
  setActiveRejectId,
  loadingId,
  variant = 'review',
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
}) {
  if (!items.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="request-review-grid">
      {items.map((item) => (
        <RequestReviewCard
          key={item._id}
          item={item}
          variant={variant}
          approveLabel={approveLabel}
          rejectLabel={rejectLabel}
          activeRejectId={activeRejectId}
          setActiveRejectId={setActiveRejectId}
          reasonById={reasonById}
          setReasonById={setReasonById}
          loadingId={loadingId}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
