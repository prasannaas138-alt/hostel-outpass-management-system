import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import RequestReviewCard from '../components/RequestReviewCard';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/warden.css';

export default function SisterDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});

  const firstName = (user?.name || 'Sister').split(' ')[0];

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
      <section className="warden-hero" aria-label="Welcome">
        <p className="eyebrow">St. Joseph&apos;s University · Hostel Office</p>
        <h2>Hello, {firstName}!</h2>
        <p>Review the home requests approved by HOD and move them to Warden, or reject them with a reason.</p>
      </section>

      <section id="hod-approved-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pending review</p>
            <h2>HOD-approved home requests</h2>
          </div>
          {!loading && !error ? <span className="mini-summary">{items.length} awaiting review</span> : null}
        </div>

        <AlertBanner type="error" message={error} />
        <AlertBanner type="success" message={success} />

        {loading ? (
          <LoadingState label="Loading HOD-approved requests..." />
        ) : items.length ? (
          <>
            <div className="warden-approvals-cards">
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
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.studentName}</strong>
                        <small>{item.department} · Year {item.year}</small>
                      </td>
                      <td>{item.requestType}</td>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.outTime || '—'}–{item.returnTime || '—'}</td>
                      <td className="warden-reason-cell">{item.reason}</td>
                      <td>
                        <span className={`status-badge status-${String(item.status).toLowerCase()}`}>{item.status}</span>
                      </td>
                      <td>
                        <button
                          className="secondary-button warden-review-btn"
                          type="button"
                          disabled={loadingId === item._id}
                          onClick={() => review(item._id, 'approve')}
                        >
                          {loadingId === item._id ? 'Processing...' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">No pending HOD-approved requests for Sister review.</div>
        )}
      </section>
    </DashboardLayout>
  );
}
