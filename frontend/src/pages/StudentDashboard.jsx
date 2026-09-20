import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import StudentLayout from '../components/StudentLayout';
import ApplyOutpassForm from '../components/ApplyOutpassForm';
import MyRequestsList from '../components/MyRequestsList';
import OutpassHistory from '../components/OutpassHistory';
import StudentProfile from '../components/StudentProfile';
import { MyRequestsTable } from '../components/RequestDetails';
import OutpassDetails from '../components/OutpassDetails';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  getDisplayStatus,
  isExpiredRequest,
  matchesStatusFilter,
} from '../utils/outpassStatus';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/apply-requests.css';
import '../styles/history-profile.css';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  requestType: 'Outing',
  date: '',
  returnDate: '',
  destination: '',
  outTime: '',
  returnTime: '',
  reason: '',
};

export default function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [profileViewActive, setProfileViewActive] = useState(false);

  // A minute-ticker forces the expiry filters to re-evaluate so an
  // approved outpass flips from My Requests to Outpass History right
  // when its Return Date + Return Time passes — no manual refresh
  // needed (the 30s poll also keeps data fresh from the backend).
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const ticker = setInterval(() => setNowTick((value) => value + 1), 60000);
    return () => clearInterval(ticker);
  }, []);

  const selectedRequest = useMemo(() => requests.find((item) => item._id === selectedId) || null, [requests, selectedId]);
  const firstName = (user?.name || 'Student').split(' ')[0];

  // My Requests: only ACTIVE outpasses — Pending, Approved and Rejected.
  // A rejected outpass stays rejected here (existing behaviour).
  const visibleRequests = useMemo(
    () => requests.filter((item) => !isExpiredRequest(item)),
    // nowTick: recompute when the minute ticker fires so time-based expiry
    // moves outpasses between sections without a manual refresh.
    [requests, nowTick],
  );

  // Outpass History: ONLY outpasses whose Return Date + Return Time has
  // passed. An active approved outpass must NEVER appear here — this is
  // what keeps the two sections mutually exclusive.
  const historyRequests = useMemo(
    () => requests.filter((item) => isExpiredRequest(item)),
    [requests, nowTick],
  );

  const visibleHistoryRequests = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    return historyRequests.filter((item) => {
      if (historyTypeFilter !== 'All' && item.requestType !== historyTypeFilter) return false;
      if (!term) return true;
      const haystack = `${item.requestType || ''} ${item.reason || ''} ${getDisplayStatus(item)} ${item.date || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [historyRequests, historyTypeFilter, historySearch]);

  const filteredRequests = useMemo(
    () => visibleRequests.filter((item) => matchesStatusFilter(item, statusFilter)),
    [visibleRequests, statusFilter],
  );

  // Counted filter pills (reference-image design) — counts over the FULL
  // unfiltered lists so pills stay stable while a filter is active.
  const requestCounts = useMemo(() => {
    const counts = { All: visibleRequests.length, Pending: 0, Approved: 0, Rejected: 0 };
    visibleRequests.forEach((item) => {
      if (matchesStatusFilter(item, 'Pending')) counts.Pending += 1;
      if (matchesStatusFilter(item, 'Approved')) counts.Approved += 1;
      if (matchesStatusFilter(item, 'Rejected')) counts.Rejected += 1;
    });
    return counts;
  }, [visibleRequests]);

  const historyCounts = useMemo(() => {
    const counts = { All: historyRequests.length, Home: 0, Outing: 0 };
    historyRequests.forEach((item) => {
      if (item.requestType === 'Home') counts.Home += 1;
      else if (item.requestType === 'Outing') counts.Outing += 1;
    });
    return counts;
  }, [historyRequests]);

  const detailRequest = useMemo(() => requests.find((item) => item._id === detailId) || null, [requests, detailId]);

  // Self-contained loader: owns its loading/error lifecycle so a failed
  // initial load shows a retry state instead of an unhandled rejection.
  const loadRequests = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/outpasses/me');
      setRequests(data);
    } catch (loadError) {
      setLoadError(loadError.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Poll every 30s so Sister/Warden changes appear without a manual refresh.
  useEffect(() => {
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setForm({
        requestType: selectedRequest.requestType,
        date: selectedRequest.date.slice(0, 10),
        returnDate: (selectedRequest.returnDate || selectedRequest.date || '').slice(0, 10),
        destination: selectedRequest.destination || '',
        outTime: selectedRequest.outTime,
        returnTime: selectedRequest.returnTime,
        reason: selectedRequest.reason,
      });
    } else {
      setForm(emptyForm);
    }
  }, [selectedRequest]);

  // Sidebar navigation. Profile opens as a modal card; every other
  // section closes the modal and smooth-scrolls to the section.
  const handleNavSelected = (sectionId) => {
    if (sectionId === 'profile') {
      setProfileViewActive(true);
      return;
    }

    setProfileViewActive(false);

    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    setSaving(true);

    try {
      if (selectedRequest && selectedRequest.status === 'Rejected') {
        await api.put(`/outpasses/${selectedRequest._id}`, form);
        setSuccess('Request updated and resubmitted.');
      } else {
        await api.post('/outpasses', form);
        setSuccess('Outpass request submitted successfully.');
      }

      setSelectedId(null);
      setForm(emptyForm);
      await loadRequests();
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Failed to save request');
    } finally {
      setSaving(false);
    }
  };

  // StudentProfile calls this after a successful PUT /auth/me so the
  // header/sidebar greeting uses the new name right away.
  const handleProfileUpdated = (updatedUser) => {
    updateUser(updatedUser);
    setSuccess('Profile updated successfully.');
    document.getElementById('student-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToEdit = (id) => {
    setSelectedId(id);
    setDetailId(null);
    setProfileViewActive(false);
    setTimeout(() => {
      document.getElementById('apply-new-outpass')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <StudentLayout
      title="Student Dashboard"
      subtitle="Apply for outpass, track approvals, and show your approved outpass at the gate."
      onNavSelected={handleNavSelected}
    >
      {detailRequest ? (
        <OutpassDetails
          request={detailRequest}
          user={user}
          onBack={() => setDetailId(null)}
          onEdit={scrollToEdit}
        />
      ) : (
        <>
      <section id="dashboard" className="student-hero">
              <h1>Hello, {firstName} <picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif" alt="👋" width="27" height="27"/>
</picture></h1>
              <p>
                Welcome back.Have a great day! <picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" alt="🔥" width="27" height="27"/>
</picture></p>
      </section>

      {loadError ? (
            <section className="panel" aria-label="Data unavailable">
              <ErrorState
                message={loadError}
                onRetry={() => loadRequests()}
                retryLabel="Reload requests"
              />
            </section>
          ) : null}

          <section id="apply-new-outpass" className="panel panel--hero">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Apply new outpass</p>
                <h2>{selectedRequest ? 'Edit rejected request' : 'New outpass application'}<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.gif" alt="🆕" width="27" height="27"/>
</picture></h2>
              </div>
            </div>

            <ApplyOutpassForm
              user={user}
              form={form}
              onChange={handleChange}
              onSubmit={handleSubmit}
              saving={saving}
              error={error}
              success={success}
              selectedRequest={selectedRequest}
              onCancelEdit={() => setSelectedId(null)}
            />
          </section>

          <section id="request-history" className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">My requests</p>
                <h2>Recent requests<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.gif" alt="🆕" width="27" height="27"/>
</picture></h2>
              </div>
            </div>

            <MyRequestsList
              requests={filteredRequests}
              loading={loading}
              error={error || loadError}
              counts={requestCounts}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onViewDetails={setDetailId}
              onEdit={scrollToEdit}
            />
            <MyRequestsTable
              requests={filteredRequests}
              onViewDetails={setDetailId}
              onEdit={scrollToEdit}
            />
          </section>

          <section id="outpass-history" className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Outpass history</p>
                <h2>Expired outpasses<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.gif" alt="👻" width="32" height="32"/>
</picture></h2>
              </div>
            </div>

            <OutpassHistory
              requests={visibleHistoryRequests}
              loading={loading}
              error={error || loadError}
              counts={historyCounts}
              typeFilter={historyTypeFilter}
              onTypeFilterChange={setHistoryTypeFilter}
              search={historySearch}
              onSearchChange={setHistorySearch}
              onViewDetails={setDetailId}
            />
          </section>
        </>
      )}

      {profileViewActive ? (
        <div
          className="profile-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Student profile"
          onClick={() => setProfileViewActive(false)}
        >
          <div className="profile-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="profile-modal-close" type="button" onClick={() => setProfileViewActive(false)} aria-label="Close profile">
              &times;
            </button>
            <StudentProfile user={user} onProfileUpdated={handleProfileUpdated} />
          </div>
        </div>
      ) : null}
    </StudentLayout>
  );
}
