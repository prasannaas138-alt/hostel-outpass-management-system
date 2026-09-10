import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WardenLayout from '../components/WardenLayout';
import WardenApprovals from '../components/WardenApprovals';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import RequestReviewCard from '../components/RequestReviewCard';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/warden.css';

export default function WardenDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});
  const [typeFilter, setTypeFilter] = useState('All');

  const firstName = useMemo(() => (user?.name || 'Warden').split(' ')[0], [user]);
  const outingCount = useMemo(() => items.filter((item) => item.requestType === 'Outing').length, [items]);
  const homeCount = useMemo(() => items.filter((item) => item.requestType === 'Home').length, [items]);

  // Self-contained loader: owns its loading/error lifecycle so a failed
  // initial load shows a retry state instead of an unhandled rejection.
  const loadItems = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/outpasses/pending/warden');
      setItems(data);
    } catch (loadError) {
      setLoadError(loadError.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
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

  const showStats = !loading && !error;

  return (
    <WardenLayout
      title="Warden Dashboard"
      subtitle="Final review for all weekend outing requests and fully approved home requests."
    >
      <section className="warden-hero" aria-label="Welcome">
        <p className="eyebrow">St. Joseph&apos;s University · Hostel Office</p>
        <h2>Hello, {firstName}!</h2>
        <p>Welcome back. Review the latest outpass requests waiting for your final approval.</p>
      </section>

      <section className="panel" aria-label="Warden statistics">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Real-time overview</p>
            <h2>Warden queue</h2>
          </div>
          {showStats ? <span className="mini-summary">{items.length} awaiting review</span> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading statistics..." />
        ) : error ? (
          <div className="empty-state">Queue statistics are unavailable right now.</div>
        ) : (
          <div className="warden-stats">
            <div className="warden-stat">
              <strong>{items.length}</strong>
              <span>Awaiting review</span>
            </div>
            <div className="warden-stat">
              <strong>{outingCount}</strong>
              <span>Outing requests</span>
            </div>
            <div className="warden-stat">
              <strong>{homeCount}</strong>
              <span>Home requests</span>
            </div>
          </div>
        )}
      </section>

      <section className="warden-quick" aria-label="Quick actions">
        <a className="warden-quick-card" href="#warden-requests">
          <span className="warden-quick-icon" aria-hidden="true">📥</span>
          <strong>Review Queue</strong>
          <span>Approve or reject pending requests.</span>
        </a>
        <a className="warden-quick-card" href="#physical-slip">
          <span className="warden-quick-icon" aria-hidden="true">📄</span>
          <strong>Outpass Slip</strong>
          <span>View the physical slip preview.</span>
        </a>
      </section>

      <section id="warden-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Final approval</p>
            <h2>Pending warden requests</h2>
          </div>
          {showStats ? <span className="mini-summary">{items.length} total</span> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading pending requests..." />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => loadItems()}
            retryLabel="Reload queue"
          />
        ) : (
          <WardenApprovals
            items={items}
            loading={loading}
            error={error}
          success={success}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          loadingId={loadingId}
          activeRejectId={activeRejectId}
          setActiveRejectId={setActiveRejectId}
          reasonById={reasonById}
          setReasonById={setReasonById}
          onApprove={(id) => review(id, 'approve')}
          onReject={(id) => review(id, 'reject')}
          />
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
    </WardenLayout>
  );
}
