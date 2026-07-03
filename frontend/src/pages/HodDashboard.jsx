import { useEffect, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import RequestReviewCard from '../components/RequestReviewCard';
import '../styles/dashboard.css';

export default function HodDashboard() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});

  const loadItems = async () => {
    setLoading(true);
    const { data } = await api.get('/outpasses/pending/hod');
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
      await api.patch(`/outpasses/${id}/hod`, {
      action,
      rejectionReason: reasonById[id] || '',
    });
      setReasonById((current) => ({ ...current, [id]: '' }));
      setActiveRejectId('');
      setSuccess(action === 'approve' ? 'Home request approved.' : 'Home request rejected.');
      await loadItems();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Failed to review request');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <DashboardLayout
      title="HOD Dashboard"
      subtitle="Review Home requests before they move to the Sister queue."
      navItems={[
        { id: 'pending-home-requests', label: 'Pending Home Requests', description: 'Approve or reject' },
      ]}
    >
      <section id="pending-home-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pending review</p>
            <h2>Home requests</h2>
          </div>
        </div>

        <AlertBanner type="error" message={error} />
        <AlertBanner type="success" message={success} />

        {loading ? (
          <LoadingState label="Loading pending Home requests..." />
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
          <div className="empty-state">No pending Home requests for HOD review.</div>
        )}
      </section>
    </DashboardLayout>
  );
}
