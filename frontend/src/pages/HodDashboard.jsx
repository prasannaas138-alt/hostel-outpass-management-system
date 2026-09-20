import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WardenLayout, { WARDEN_NAV } from '../components/WardenLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import RequestReviewCard from '../components/RequestReviewCard';
import StaffRequestTable from '../components/StaffRequestTable';
import RequestDetailModal from '../components/RequestDetailModal';
import WardenProfile from '../components/WardenProfile';
import RoleOutpassHistory from '../components/RoleOutpassHistory';
import ProfileChangeRequests from '../components/ProfileChangeRequests';
import HodStudentsProfile from '../components/HodStudentsProfile';
import { IconUsers, IconClock, IconCheck, IconAlert } from '../components/WardenIcons';
import { formatTime12Hour as formatTime } from '../utils/timeFormat';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/warden.css';
import '../styles/sister-dashboard.css';
import '../styles/staff-requests.css';
import '../styles/hod-students.css';

// HOD navigation = the shared staff nav + the HOD-only Students Profile item.
const HOD_NAV = [
  WARDEN_NAV[0], // Dashboard
  WARDEN_NAV[1], // Outpass History
  { id: 'students', label: 'Students Profile', icon: IconUsers },
  WARDEN_NAV[2], // Profile
];

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
  const [detailId, setDetailId] = useState(null);
  const [changeRequests, setChangeRequests] = useState([]);
  const [busyChangeId, setBusyChangeId] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [changeError, setChangeError] = useState('');

  const detailItem = items.find((item) => item._id === detailId) || null;

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

  const loadChangeRequests = async () => {
    try {
      const { data } = await api.get('/auth/change-requests');
      setChangeRequests(Array.isArray(data) ? data : []);
    } catch {
      setChangeRequests([]);
    }
  };

  const reviewChangeRequest = async (id, action) => {
    setBusyChangeId(id);
    setChangeMessage('');
    setChangeError('');
    try {
      const { data } = await api.patch(`/auth/change-requests/${id}`, { action });
      setChangeMessage(data.message || (action === 'approve' ? 'Changes approved and applied.' : 'Changes rejected. Original values kept.'));
      await loadChangeRequests();
    } catch (err) {
      setChangeError(err.response?.data?.message || 'Failed to review the change request.');
    } finally {
      setBusyChangeId('');
    }
  };

  useEffect(() => {
    loadItems();
    loadHistory();
    loadChangeRequests();
  }, []);

  const review = async (id, action, reasonOverride) => {
    setError('');
    setSuccess('');
    setLoadingId(id);

    try {
      await api.patch(`/outpasses/${id}/hod`, {
      action,
      rejectionReason: reasonById[id] || reasonOverride || '',
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
    <WardenLayout view={view} onNavigate={setView} navItems={HOD_NAV}>
      {view === 'profile' ? <section className="wd-panel"><WardenProfile /></section>
        : view === 'students' ? <HodStudentsProfile />
        : <>
      <section className="warden-hero" aria-label="Welcome">
        <p className="eyebrow">HOD Portal</p>
        <h2>Hello, {firstName}! <picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif" alt="👋" width="27" height="27"/>
</picture></h2>
        <p>Welcome back.Have a great day!<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" alt="🔥" width="27" height="27"/>
</picture></p>
      </section>

      <AlertBanner type="success" message={changeMessage} />
      <AlertBanner type="error" message={changeError} />

      <ProfileChangeRequests
        requests={changeRequests}
        busyId={busyChangeId}
        onReview={reviewChangeRequest}
      />

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
            <p className="eyebrow">Pending review<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="⌛" width="32" height="32"/>
</picture></p>
            <h2>New requests<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.gif" alt="🆕" width="27" height="27"/>
</picture></h2>
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
          <StaffRequestTable
            items={items}
            onView={(item) => setDetailId(item._id)}
            emptyMessage="No pending outpass requests for HOD review."
          />
        ) : (
          <div className="empty-state">No pending Outpass requests for HOD review.</div>
        )}

        {detailItem ? (
          <RequestDetailModal
            request={detailItem}
            role="hod"
            busy={loadingId === detailItem._id}
            onApprove={(id) => review(id, 'approve')}
            onReject={(id, reason) => review(id, 'reject', reason)}
            onClose={() => setDetailId(null)}
          />
        ) : null}
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
