import { useEffect, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import RequestReviewCard from '../components/RequestReviewCard';
import '../styles/dashboard.css';

export default function SisterDashboard() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});

  const loadItems = async () => {
    setLoading(true);
    const { data } = await api.get('/outpasses/pending/sister');
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadItems().catch((loadError) => {
      setLoading(false);
      setError(loadError.response?.data?.message || 'Failed to load requests');
    });
  }, []);

  const review = async (id, action) => {
    setError('');
    setSuccess('');
    setLoadingId(id);

    try {
      await api.patch(`/outpasses/${id}/sister`, {
        action,
        rejectionReason: reasonById[id] || '',
      });
      setReasonById((current) => ({ ...current, [id]: '' }));
      setActiveRejectId('');
      setSuccess(action === 'approve' ? 'Request moved to Warden review.' : 'Request rejected.');
      await loadItems();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Failed to review request');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <DashboardLayout
      title="Sister Dashboard"
      subtitle="Review only the requests approved by HOD."
      navItems={[{ id: 'hod-approved-requests', label: 'HOD Approved Requests', description: 'Move to Warden' }]}
    >
      <section id="hod-approved-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pending review</p>
            <h2>HOD-approved home requests</h2>
          </div>
        </div>

        <AlertBanner type="error" message={error} />
        <AlertBanner type="success" message={success} />

        {loading ? (
          <LoadingState label="Loading HOD-approved requests..." />
        ) : items.length ? (
          <div className="request-review-grid">
            {items.map((item) => (
              <RequestReviewCard
                key={item._id}
                item={item}
                approveLabel="Approve"
                rejectLabel="Reject"
                activeRejectId={activeRejectId}
                setActiveRejectId={setActiveRejectId}
                reasonById={reasonById}
                setReasonById={setReasonById}
                loadingId={loadingId}
                onApprove={(id) => review(id, 'approve')}
                onReject={(id) => review(id, 'reject')}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">No pending HOD-approved requests for Sister review.</div>
        )}
      </section>
    </DashboardLayout>
  );
}
