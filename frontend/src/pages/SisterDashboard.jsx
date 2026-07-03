import { useEffect, useState } from 'react';
import api from '../services/api';
import AppHeader from '../components/AppHeader';
import ReviewQueue from '../components/ReviewQueue';
import '../styles/dashboard.css';

export default function SisterDashboard() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [reasonById, setReasonById] = useState({});

  const loadItems = async () => {
    const { data } = await api.get('/outpasses/pending/sister');
    setItems(data);
  };

  useEffect(() => {
    loadItems().catch((loadError) => setError(loadError.response?.data?.message || 'Failed to load requests'));
  }, []);

  const review = async (id, action) => {
    await api.patch(`/outpasses/${id}/sister`, {
      action,
      rejectionReason: reasonById[id] || '',
    });
    setReasonById((current) => ({ ...current, [id]: '' }));
    await loadItems();
  };

  return (
    <div className="dashboard-shell">
      <AppHeader title="Sister Dashboard" subtitle="Review only the requests approved by HOD." />
      {error ? <div className="error-banner">{error}</div> : null}
      <ReviewQueue
        items={items}
        emptyMessage="No pending HOD-approved requests for Sister review."
        onApprove={(id) => review(id, 'approve')}
        onReject={(id) => review(id, 'reject')}
        reasonById={reasonById}
        setReasonById={setReasonById}
      />
    </div>
  );
}
