import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WardenProfile from '../components/WardenProfile';
import WardenOutpassHistory from '../components/WardenOutpassHistory';
import RequestReviewCard from '../components/RequestReviewCard';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { IconHome, IconClock, IconCheck, IconX } from '../components/WardenIcons';
import SummaryCard from '../components/SummaryCard';
import NotificationBell from '../components/NotificationBell';
import '../styles/warden-dashboard.css';

const STATUS = { Pending: 'pending', Approved: 'approved', Expired: 'expired', Rejected: 'rejected', Closed: 'closed' };
const toStatus = (s) => STATUS[String(s).toLowerCase()] || 'pending';

export default function SisterDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, pendingApprovals: 0, approvedToday: 0, expiredOutpasses: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [activeRejectId, setActiveRejectId] = useState('');
  const [reasonById, setReasonById] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const firstName = useMemo(() => (user?.name || 'Sister').split(' ')[0], [user]);
  const today = useMemo(() => new Date().toLocaleDateString(), []);

  const loadItems = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/outpasses/pending/sister');
      setItems(data);
    } catch (loadError) {
      setLoadError(loadError.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/outpasses/history/sister');
      setHistory(data);
    } catch (err) { setHistory([]); }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/outpasses/sister/stats');
      setStats(data);
    } catch (err) {
      setStats({ totalStudents: 0, pendingApprovals: 0, approvedToday: 0, expiredOutpasses: 0 });
    }
  };

  useEffect(() => { loadItems(); loadHistory(); loadStats(); }, []);

  const review = async (id, action) => {
    setError('');
    setSuccess('');
    setLoadingId(id);
    try {
      await api.patch(`/outpasses/${id}/sister`, { action, rejectionReason: reasonById[id] || '' });
      setReasonById((c) => ({ ...c, [id]: '' }));
      setActiveRejectId('');
      setSuccess(action === 'approve' ? 'Request moved to Warden review.' : 'Request rejected.');
      await loadItems(); await loadHistory(); await loadStats();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Failed to review request');
    } finally {
      setLoadingId('');
    }
  };

  const approve = (id) => review(id, 'approve');
  const reject = (id) => review(id, 'reject');

    return (
    <div className="wd-shell">
      <WardenProfile open={profileOpen} onClose={() => setProfileOpen(false)} />

        <nav className="wd-sidebar" aria-label="Sister navigation">
          <div className="wd-sidebar-body">
            <div className="wd-brand">
              <img className="wd-brand-logo" src="/st-joseph-logo.png" alt="St. Joseph's University" onError={(e) => { e.target.style.display = 'none'; }} />
              <div>
                <span className="wd-brand-title">H.O.M.S</span>
                <span className="wd-brand-sub">St.Joseph University</span>
              </div>
            </div>

            <div className="wd-user">
              <span className="wd-user-avatar" aria-hidden="true">{(user?.name || 'S').charAt(0).toUpperCase()}</span>
              <div className="wd-user-info">
                <span className="wd-user-name">{user?.name || 'Sister'}</span>
                <span className="wd-user-role">Sister</span>
              </div>
            </div>

            <ul className="wd-nav" role="list">
              <li><a href="#sister-dashboard" className="wd-nav-link wd-nav-link--active"><IconHome />Dashboard</a></li>
              <li><a href="#sister-history" className="wd-nav-link"><IconClock />Outpass History</a></li>
              <li>
                <button type="button" className="wd-nav-link wd-nav-link--plain" onClick={() => setProfileOpen(true)} aria-label="Profile">
                  <IconX />Profile
                </button>
              </li>
              <li>
                <button type="button" className="wd-nav-link wd-nav-link--plain wd-logout" onClick={() => { localStorage.removeItem('hostel_outpass_auth'); window.location.href = '/login'; }}>
                  <IconX />Logout
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="wd-main">
          <header className="wd-topbar">
            <div className="wd-topbar-brand">
              <button type="button" className="wd-menu-btn" aria-label="Open menu" title="Open menu">
                <span aria-hidden="true">☰</span>
              </button>
              <img className="wd-topbar-logo" src="/st-joseph-logo.png" alt="St. Joseph's University" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="wd-topbar-user">
              <NotificationBell />
              <span className="wd-topbar-date">{today}</span>
            </div>
          </header>

          <div className="wd-body" id="sister-dashboard">
            <section className="wd-greet">
              <div>
                <p className="wb-eyebrow">Good Morning,</p>
                <h1>{firstName}</h1>
              </div>
              <p className="wb-sub">Sister Dashboard — review HOD-approved Home Outpass requests.</p>
            </section>

            <div className="wd-cards">
              <SummaryCard icon={<IconHome />} label="Total Students" value={stats.totalStudents} sub="In Hostel" />
              <SummaryCard icon={<IconClock />} label="Pending Approvals" value={stats.pendingApprovals} sub="Need your attention" />
              <SummaryCard icon={<IconCheck />} label="Approved Today" value={stats.approvedToday} sub="Outpasses issued" />
              <SummaryCard icon={<IconX />} label="Expired Outpasses" value={stats.expiredOutpasses} sub="Not returned yet" />
            </div>
            <section className="wd-panel" id="sister-pending">
              <div className="wd-panel-head">
                <div>
                  <p className="wb-eyebrow">Pending review</p>
                  <h2>HOME Outpass Requests</h2>
                </div>
              </div>

              <AlertBanner type="error" message={error} />
              <AlertBanner type="success" message={success} />

              {loading ? (
                <LoadingState label="Loading HOD-approved Home requests..." />
              ) : loadError ? (
                <ErrorState message={loadError} onRetry={loadItems} retryLabel="Reload queue" />
              ) : items.length ? (
                <>
                  <div className="wd-list wd-list--cards">
                    {items.map((item) => (
                      <div key={item._id} className="wd-card wd-request-card">
                        <RequestReviewCard
                          item={item}
                          variant="slip"
                          approveLabel="Approve"
                          rejectLabel="Reject"
                          activeRejectId={activeRejectId}
                          setActiveRejectId={setActiveRejectId}
                          reasonById={reasonById}
                          setReasonById={setReasonById}
                          loadingId={loadingId}
                          onApprove={(id) => approve(id)}
                          onReject={(id) => reject(id)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="wd-table-wrap wd-table-wrap--sm">
                    <table className="wd-table">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Student</th>
                          <th scope="col">Reg. No.</th>
                          <th scope="col">Room No</th>
                          <th scope="col">Phone No</th>
                          <th scope="col">Requested On</th>
                          <th scope="col">Out Time</th>
                          <th scope="col">Return Time</th>
                          <th scope="col">Status</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item._id}>
                            <td className="wd-mono">{String((item.seq ?? idx) + 1).padStart(3, '0')}</td>
                            <td><strong>{item.studentName || '—'}</strong><small>{item.department || ''} · Year {item.year || ''}</small></td>
                            <td className="wd-mono">{item.registerNumber || '—'}</td>
                            <td>{item.roomNumber || '—'}</td>
                            <td className="wd-mono">{item.phone || '—'}</td>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td className="wd-mono">{item.outTime || '—'}</td>
                            <td className="wd-mono">{item.returnTime || '—'}</td>
                            <td><span className={`wd-pill wd-pill--${toStatus(item.status)}`}>{item.status}</span></td>
                            <td><button className="wd-view-btn" type="button" onClick={() => setDetailId(item._id)}>View <IconX /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="wd-empty">No pending HOD-approved Home requests for Sister review.</div>
              )}
            </section>

            <section className="wd-panel" id="sister-history">
              <div className="wd-panel-head">
                <div>
                  <p className="wb-eyebrow">History</p>
                  <h2>Outpass History</h2>
                </div>
                <div className="wd-search-wrap">
                  <input
                    type="search"
                    className="wd-search"
                    placeholder="Search by student name..."
                    aria-label="Search student name"
                  />
                </div>
              </div>

              <WardenOutpassHistory items={history} statusBar={false} />
            </section>
          </div>
                </div>
      </div>
  );
}