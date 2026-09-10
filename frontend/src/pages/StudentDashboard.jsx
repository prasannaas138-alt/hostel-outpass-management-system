import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import StudentLayout from '../components/StudentLayout';
import ApplyOutpassForm from '../components/ApplyOutpassForm';
import MyRequestsList from '../components/MyRequestsList';
import OutpassHistory from '../components/OutpassHistory';
import StudentProfile from '../components/StudentProfile';
import { MyRequestsTable, RequestDetailsModal } from '../components/RequestDetails';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import StatusTracker from '../components/StatusTracker';
import '../styles/dashboard.css';
import '../styles/student.css';
import '../styles/apply-requests.css';
import '../styles/history-profile.css';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  requestType: 'Outing',
  date: '',
  outTime: '',
  returnTime: '',
  reason: '',
};

const isWeekend = (value) => {
  if (!value) {
    return false;
  }

  const day = new Date(value).getDay();
  return day === 0 || day === 6;
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
  const [search, setSearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  const selectedRequest = useMemo(() => requests.find((item) => item._id === selectedId), [requests, selectedId]);
  const isOutgoingWeekendValid = form.requestType !== 'Outing' || !form.date || isWeekend(form.date);
  const firstName = (user?.name || 'Student').split(' ')[0];
  const pendingCount = useMemo(() => requests.filter((item) => item.status === 'Pending').length, [requests]);
  const approvedCount = useMemo(() => requests.filter((item) => item.status === 'Approved').length, [requests]);
  const rejectedCount = useMemo(() => requests.filter((item) => item.status === 'Rejected').length, [requests]);
  const historyRequests = useMemo(() => requests.filter((item) => item.status === 'Approved' || item.status === 'Expired'), [requests]);
  const visibleHistoryRequests = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    return historyRequests.filter((item) => {
      if (historyTypeFilter !== 'All' && item.requestType !== historyTypeFilter) return false;
      if (!term) return true;
      const haystack = `${item.requestType || ''} ${item.reason || ''} ${item.status || ''} ${item.date || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [historyRequests, historyTypeFilter, historySearch]);
  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = `${item.requestType || ''} ${item.reason || ''} ${item.status || ''} ${item.date || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [requests, statusFilter, search]);
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

  useEffect(() => {
    if (selectedRequest) {
      setForm({
        requestType: selectedRequest.requestType,
        date: selectedRequest.date.slice(0, 10),
        outTime: selectedRequest.outTime,
        returnTime: selectedRequest.returnTime,
        reason: selectedRequest.reason,
      });
    } else {
      setForm(emptyForm);
    }
  }, [selectedRequest]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isOutgoingWeekendValid) {
      setError('Outing requests are allowed only on weekends.');
      return;
    }

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
    document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownload = async (requestId) => {
    try {
      const response = await api.get(`/outpasses/${requestId}/pdf`, { responseType: 'blob' });
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `outpass-${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || 'Failed to download outpass PDF');
    }
  };

  return (
    <StudentLayout
      title="Student Dashboard"
      subtitle="Apply for outpass, track approvals, edit rejected requests, and download approved PDFs."
    >
      <section id="dashboard" className="student-hero">
        <p className="eyebrow">St. Joseph&apos;s University · H.O.M.S</p>
        <h2>Hello, {firstName}!</h2>
        <p>Welcome back. Apply for a new outpass or check the latest status of your requests.</p>
      </section>

      <section className="student-quick-grid" aria-label="Quick actions">
        <a className="student-quick-card" href="#apply-new-outpass">
          <span className="student-quick-icon" aria-hidden="true">📝</span>
          <strong>Apply for Outpass</strong>
          <span>Start a new Home or Outing request.</span>
        </a>
        <a className="student-quick-card" href="#request-history">
          <span className="student-quick-icon" aria-hidden="true">📋</span>
          <strong>My Requests</strong>
          <span>View pending, approved and rejected items.</span>
        </a>
        <a className="student-quick-card" href="#outpass-history">
          <span className="student-quick-icon" aria-hidden="true">🕘</span>
          <strong>Outpass History</strong>
          <span>Approved and expired outpasses.</span>
        </a>
        <a className="student-quick-card" href="#profile">
          <span className="student-quick-icon" aria-hidden="true">👤</span>
          <strong>Profile</strong>
          <span>Your hostel and department details.</span>
        </a>
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

      <section className="panel" aria-label="Request statistics">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Request statistics</h2>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading statistics..." />
        ) : (
          <div className="student-stats-grid">
            <div className="student-stat student-stat--pending">
              <strong>{pendingCount}</strong>
              <span>Pending</span>
            </div>
            <div className="student-stat student-stat--approved">
              <strong>{approvedCount}</strong>
              <span>Approved</span>
            </div>
            <div className="student-stat student-stat--rejected">
              <strong>{rejectedCount}</strong>
              <span>Rejected</span>
            </div>
          </div>
        )}
      </section>

      <section id="apply-new-outpass" className="panel panel--hero">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Apply new outpass</p>
            <h2>{selectedRequest ? 'Edit rejected request' : 'New outpass application'}</h2>
          </div>
          <span className="mini-summary">{user?.name}</span>
        </div>

        <ApplyOutpassForm
          user={user}
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          saving={saving}
          error={error}
          success={success}
          isOutgoingWeekendValid={isOutgoingWeekendValid}
          selectedRequest={selectedRequest}
          onCancelEdit={() => setSelectedId(null)}
        />
      </section>

      <section id="request-history" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">My requests</p>
            <h2>Recent requests</h2>
          </div>
          <span className="mini-summary">{filteredRequests.length} shown</span>
        </div>

        <MyRequestsList
          requests={filteredRequests}
          loading={loading}
          error={error || loadError}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
          onViewDetails={setDetailId}
          onEdit={(id) => { setSelectedId(id); setDetailId(null); document.getElementById('apply-new-outpass')?.scrollIntoView({ behavior: 'smooth' }); }}
          onDownload={handleDownload}
        />
        <MyRequestsTable
          requests={filteredRequests}
          onViewDetails={setDetailId}
          onEdit={(id) => { setSelectedId(id); setDetailId(null); document.getElementById('apply-new-outpass')?.scrollIntoView({ behavior: 'smooth' }); }}
          onDownload={handleDownload}
        />
        <RequestDetailsModal
          detailRequest={detailRequest}
          onCloseDetails={() => setDetailId(null)}
          onEdit={(id) => { setSelectedId(id); setDetailId(null); document.getElementById('apply-new-outpass')?.scrollIntoView({ behavior: 'smooth' }); }}
          onDownload={handleDownload}
        />
      </section>

      <section id="outpass-history" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Outpass history</p>
            <h2>Approved and expired outpasses</h2>
          </div>
          <span className="mini-summary">{visibleHistoryRequests.length} shown</span>
        </div>

        <OutpassHistory
          requests={visibleHistoryRequests}
          loading={loading}
          error={error || loadError}
          typeFilter={historyTypeFilter}
          onTypeFilterChange={setHistoryTypeFilter}
          search={historySearch}
          onSearchChange={setHistorySearch}
          onViewDetails={setDetailId}
          onDownload={handleDownload}
        />
      </section>

      <section id="request-tracker" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Status tracker</p>
            <h2>Latest request progress</h2>
          </div>
        </div>

        {selectedRequest ? (
          <StatusTracker request={selectedRequest} />
        ) : requests[0] ? (
          <StatusTracker request={requests[0]} />
        ) : (
          <div className="empty-state">Track your newest request here once you submit it.</div>
        )}
      </section>

      <section id="profile" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>Student profile</h2>
          </div>
        </div>

        <StudentProfile user={user} onProfileUpdated={handleProfileUpdated} />
      </section>
    </StudentLayout>
  );
}
