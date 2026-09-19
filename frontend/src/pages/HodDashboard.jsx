import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WardenLayout from '../components/WardenLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import RequestReviewCard from '../components/RequestReviewCard';
import WardenProfile from '../components/WardenProfile';
import RoleOutpassHistory from '../components/RoleOutpassHistory';
import { IconUsers, IconClock, IconCheck, IconAlert } from '../components/WardenIcons';
import { formatTime12Hour as formatTime } from '../utils/timeFormat';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/warden.css';
import '../styles/sister-dashboard.css';

export default function HodDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});

  const firstName = (user?.name || 'HOD').split(' ')[0];

  // Self-contained loader: owns its loading/error lifecycle so a failed
  // initial load shows a retry state instead of an unhandled rejection.
  const loadItems = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/outpasses/pending/hod');
      setItems(data);
    } catch (loadError) {
      setLoadError(loadError.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try { const { data } = await api.get('/outpasses/history/hod'); setHistory(data); }
    catch { setHistory([]); }
  };

  useEffect(() => {
    loadItems();
    loadHistory();
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
      await loadHistory();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Failed to review request');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <WardenLayout view={view} onNavigate={setView}>
      {view === 'profile' ? <section className="wd-panel"><WardenProfile /></section> : <>
      <section className="warden-hero" aria-label="Welcome">
        <p className="eyebrow">St. Joseph University · Hostel Office</p>
        <h2>Hello, {firstName}!</h2>
        <p>Review the Home requests from your department and move them to the Sister queue, or reject them with a reason.</p>
      </section>

      <div className="wd-cards">
        {[
          ['Total Students', new Set(history.map((item) => item.studentId || item.registerNumber)).size, 'Students with outpasses', IconUsers, 'wd-card-icon--green'],
          ['Pending Approvals', items.length, 'Need your attention', IconClock, 'wd-card-icon--amber'],
          ['Approved Today', history.filter((item) => item.hodStatus === 'Approved' && new Date(item.updatedAt || item.date).toDateString() === new Date().toDateString()).length, 'Home requests approved', IconCheck, 'wd-card-icon--green'],
          ['Expired Outpasses', history.filter((item) => String(item.status).toLowerCase() === 'expired').length, 'Not returned yet', IconAlert, 'wd-card-icon--red'],
        ].map(([label, value, sub, Icon, tone]) => <article className="wd-card" key={label}><span className={`wd-card-icon ${tone}`}><Icon size={20} /></span><p className="wd-card-label">{label}</p><p className="wd-card-value">{value}</p><p className="wd-card-sub">{sub}</p></article>)}
      </div>

      <section id="pending-home-requests" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pending review</p>
            <h2>Home requests</h2>
          </div>
          {!loading && !error && !loadError ? <span className="mini-summary">{items.length} awaiting review</span> : null}
        </div>

        <AlertBanner type="error" message={error} />
        <AlertBanner type="success" message={success} />

        {loading ? (
          <LoadingState label="Loading pending Home requests..." />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => loadItems()}
            retryLabel="Reload queue"
          />
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
                      <td>{formatTime(item.outTime)}–{formatTime(item.returnTime)}</td>
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
          <div className="empty-state">No pending Home requests for HOD review.</div>
        )}
      </section>
      <RoleOutpassHistory
        id="hod-history"
        items={history}
        subtitle="Students who received or requested a Home Outpass."
        emptyMessage="No Home Outpass history is available."
      />
      </>}
    </WardenLayout>
  );
}
