import { useEffect, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import RequestReviewCard from '../components/RequestReviewCard';
import '../styles/dashboard.css';

export default function WardenDashboard() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});

  const loadItems = async () => {
    setLoading(true);
    const { data } = await api.get('/outpasses/pending/warden');
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
      await api.patch(`/outpasses/${id}/warden`, {
        action,
        rejectionReason: reasonById[id] || '',
      });
      setReasonById((current) => ({ ...current, [id]: '' }));
      setActiveRejectId('');
      setSuccess(action === 'approve' ? 'Outpass approved successfully.' : 'Outpass rejected.');
      await loadItems();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Failed to review request');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <DashboardLayout
      title="Warden Dashboard"
      subtitle="Final review for all weekend outing requests and fully approved home requests."
      navItems={[
        { id: 'warden-requests', label: 'Review Queue', description: 'Final approval' },
        { id: 'physical-slip', label: 'Outpass Slip', description: 'Detailed view' },
      ]}
    >
      <section id="warden-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Final approval</p>
            <h2>Pending warden requests</h2>
          </div>
        </div>

        <AlertBanner type="error" message={error} />
        <AlertBanner type="success" message={success} />

        {loading ? (
          <LoadingState label="Loading pending requests..." />
        ) : items.length ? (
          <div className="request-review-grid">
            {items.map((item) => (
              <RequestReviewCard
                key={item._id}
                item={item}
                variant="slip"
                approveLabel="Approve Outpass"
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
          <div className="empty-state">No pending requests for Warden review.</div>
        )}
      </section>

      {items[0] ? (
        <section id="physical-slip" className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Slip preview</p>
              <h2>Physical outpass slip</h2>
            </div>
          </div>
          <RequestReviewCard
            item={items[0]}
            variant="slip"
            approveLabel="Approve Outpass"
            rejectLabel="Reject"
            activeRejectId={activeRejectId}
            setActiveRejectId={setActiveRejectId}
            reasonById={reasonById}
            setReasonById={setReasonById}
            loadingId={loadingId}
            onApprove={(id) => review(id, 'approve')}
            onReject={(id) => review(id, 'reject')}
          />
        </section>
      ) : null}
    </DashboardLayout>
  );
}
