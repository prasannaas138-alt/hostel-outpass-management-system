import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WardenLayout from '../components/WardenLayout';
import WardenProfile from '../components/WardenProfile';
import WardenOutpassHistory from '../components/WardenOutpassHistory';
import WardenStudentDetails from '../components/WardenStudentDetails';
import {
  IconArrowLeft,
  IconUsers,
  IconClock,
  IconCheckCircle,
  IconAlert,
  IconCalendar,
  IconX,
  IconCheck,
} from '../components/WardenIcons';
import { getDisplayStatus } from '../utils/outpassStatus';
import '../styles/warden-dashboard.css';

// Redesigned Warden Dashboard â€” reference divisions 1-4:
// (1) desktop dashboard, (2) mobile dashboard, (3) Warden profile,
// (4) student review screen. All data from the real Warden APIs
// (/outpasses/warden/stats + /warden/history) and the existing
// PATCH /outpasses/:id/warden workflow â€” nothing hardcoded.
export default function WardenDashboard() {
  const { user } = useAuth();
  const userName = user?.name || 'Warden';

  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/outpasses/warden/history');
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Failed to load outpass history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/outpasses/warden/stats');
      setStats(data);
    } catch {
      setStats(null); // cards show placeholders; history still works
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  // Existing approval workflow â€” same endpoint/payload as the old dashboard
  // (PATCH /outpasses/:id/warden). Only the presentation changed.
  const review = async (action) => {
    if (!selected || reviewBusy) return;
    setReviewError('');
    setReviewBusy(true);
    try {
      await api.patch(`/outpasses/${selected._id}/warden`, {
        action,
        rejectionReason: action === 'reject' ? reason : undefined,
      });
      setSelected(null);
      setRejecting(false);
      setReason('');
      await loadHistory();
      await loadStats();
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Failed to review request.');
    } finally {
      setReviewBusy(false);
    }
  };

  const daypart = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }, []);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    []
  );

  const cards = [
    { label: 'Total Students', value: stats?.totalStudents, sub: 'In Hostel', icon: IconUsers, tone: 'wd-card-icon--green' },
    { label: 'Pending Approvals', value: stats?.pendingCount, sub: 'Need your attention', icon: IconClock, tone: 'wd-card-icon--amber' },
    { label: 'Approved Today', value: stats?.approvedToday, sub: 'Outpasses issued', icon: IconCheckCircle, tone: 'wd-card-icon--green' },
    { label: 'Expired Outpasses', value: stats?.expiredCount, sub: 'Not returned yet', icon: IconAlert, tone: 'wd-card-icon--red' },
  ];

  const openReview = (item) => {
    setSelected(item);
    setRejecting(false);
    setReason('');
    setReviewError('');
  };

  const closeReview = () => {
    setSelected(null);
    setRejecting(false);
    setReason('');
    setReviewError('');
  };

  return (
    <WardenLayout
      view={view}
      onNavigate={(id) => {
        setSelected(null);
        setView(id);
      }}
    >
      {view === 'profile' ? (
        <div className="wd-panel wd-panel--profile">
          <div className="wd-panel-head wd-panel-head--single">
            <div>
              <h2 className="wd-panel-title">Warden Profile</h2>
              <p className="wd-panel-sub">Manage your username and password.</p>
            </div>
          </div>
          <WardenProfile />
        </div>
      ) : selected ? (
        <>
          {/* Division 4 â€” student review screen (back bar + info cards + actions) */}
          <div className="wd-review">
            <div className="wd-review-bar">
              <button className="wd-back-btn" type="button" aria-label="Back" onClick={closeReview}>
                <IconArrowLeft size={18} />
                <span>Back</span>
              </button>
              <h2 className="wd-review-title">Pending Request</h2>
              <span className="wd-pill wd-pill--pending">Under Review</span>
            </div>

            <div className="wd-review-head">
              <span className="wd-avatar wd-avatar--lg" aria-hidden="true">
                {(selected.studentName || 'S').charAt(0).toUpperCase()}
              </span>
              <div className="wd-review-head-meta">
                <h2>{selected.studentName}</h2>
                <p className="wd-review-reg">Registration Number: {selected.registerNumber || 'â€”'}</p>
                <p>{selected.department} Â· Year {selected.year} Â· {selected.requestType}</p>
              </div>
            </div>

            <section className="wd-review-section" aria-label="Outpass details">
              <h4>Outpass Details</h4>
              <div className="wd-info-grid">
                <div className="wd-info"><span>Registration No</span><strong>{selected.registerNumber || 'â€”'}</strong></div>
                <div className="wd-info"><span>Room No</span><strong>{selected.roomNumber || 'â€”'}</strong></div>
                <div className="wd-info"><span>Phone No</span><strong>{selected.phone || 'Phone not added yet'}</strong></div>
                <div className="wd-info"><span>Department</span><strong>{selected.department || 'â€”'}</strong></div>
                <div className="wd-info"><span>Year</span><strong>{selected.year || 'â€”'}</strong></div>
              </div>
            </section>

            <section className="wd-review-section" aria-label="Outpass details">
              <h4>Outpass Details</h4>
              <div className="wd-info-grid">
                <div className="wd-info"><span>Request Type</span><strong>{selected.requestType || 'â€”'}</strong></div>
                <div className="wd-info"><span>Requested On</span><strong>{selected.date ? new Date(selected.date).toLocaleDateString() : 'â€”'}</strong></div>
                <div className="wd-info"><span>Out Time</span><strong>{selected.outTime || 'â€”'}</strong></div>
                <div className="wd-info"><span>Return Time</span><strong>{selected.returnTime || 'â€”'}</strong></div>
                <div className="wd-info wd-info--wide"><span>Reason</span><strong>{selected.reason || 'â€”'}</strong></div>
                {selected.rejectionReason ? (
                  <div className="wd-info wd-info--wide"><span>Earlier rejection</span><strong>{selected.rejectionReason}</strong></div>
                ) : null}
              </div>
            </section>

            <section className="wd-review-section" aria-label="Warden action">
              <h4>Warden Action</h4>
              {reviewError ? <div className="wd-review-note wd-review-note--error">{reviewError}</div> : null}
              {rejecting ? (
                <label className="wd-field">
                  <span>Rejection reason</span>
                  <textarea
                    className="wd-textarea"
                    rows={3}
                    placeholder="Explain why the request is rejected"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={reviewBusy}
                  />
                </label>
              ) : null}
              <div className="wd-review-actions">
                <button className="wd-btn wd-btn--reject" type="button" onClick={() => setRejecting((v) => !v)} disabled={reviewBusy}>
                  <IconX size={16} />
                  {rejecting ? 'Cancel reject' : 'Reject'}
                </button>
                <button className="wd-btn wd-btn--approve" type="button" onClick={() => review('approve')} disabled={reviewBusy}>
                  <IconCheck size={16} />
                  {reviewBusy ? 'Processingâ€¦' : 'Approve'}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          {/* Division 1 & 2 â€” dashboard home */}
          <section className="wd-greet">
            <div>
              <p className="wd-greet-eyebrow">Good {daypart},</p>
              <h1>{userName}</h1>
              <p className="wd-greet-p">Here's an overview of the hostel outpass requests and recent activity.</p>
            </div>
            <div className="wd-greet-tools">
              <span className="wd-date-chip"><IconCalendar size={16} /> {todayLabel}</span>
            </div>
          </section>

          <div className="wd-cards">
            {cards.map(({ label, value, sub, icon: Icon, tone }) => (
              <article className="wd-card" key={label}>
                <span className={`wd-card-icon ${tone}`} aria-hidden="true"><Icon size={20} /></span>
                <p className="wd-card-label">{label}</p>
                <p className="wd-card-value">{value ?? 'â€”'}</p>
                <p className="wd-card-sub">{sub}</p>
              </article>
            ))}
          </div>

          <section className="wd-panel" aria-label="Pending review">
            <div className="wd-panel-head wd-panel-head--single"><div><p className="wd-greet-eyebrow">Pending review</p><h2 className="wd-panel-title">Outpass Requests</h2><p className="wd-panel-sub">Requests waiting for Warden approval.</p></div></div>
            {items.filter((item) => String(item.status).toLowerCase() === 'pending').length ? <div className="wd-list wd-list--cards">{items.filter((item) => String(item.status).toLowerCase() === 'pending').map((item) => <article className="wd-list-item" key={item._id}><div className="wd-list-name"><strong>{item.studentName}</strong><span>{item.registerNumber || '—'} · Room {item.roomNumber || '—'}</span></div><div className="wd-list-times"><span>{item.requestType} · {item.date ? new Date(item.date).toLocaleDateString() : '—'}</span><span>Return date <b>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '—')}</b></span></div><button className="wd-view-btn" type="button" onClick={() => openReview(item)}>Review</button></article>)}</div> : <div className="wd-empty">No pending requests for Warden review.</div>}
          </section>

          <WardenOutpassHistory
            items={items}
            loading={loading}
            loadError={loadError}
            onRetry={loadHistory}
            onView={setStudentProfile}
          />
          {studentProfile ? <WardenStudentDetails request={studentProfile} onClose={() => setStudentProfile(null)} /> : null}
        </>
      )}
    </WardenLayout>
  );
}
