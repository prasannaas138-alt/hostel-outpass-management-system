import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import StudentLayout from '../components/StudentLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import StatusTracker from '../components/StatusTracker';
import '../styles/dashboard.css';
import '../styles/student.css';
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
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedRequest = useMemo(() => requests.find((item) => item._id === selectedId), [requests, selectedId]);
  const isOutgoingWeekendValid = form.requestType !== 'Outing' || !form.date || isWeekend(form.date);
  const firstName = (user?.name || 'Student').split(' ')[0];
  const pendingCount = useMemo(() => requests.filter((item) => item.status === 'Pending').length, [requests]);
  const approvedCount = useMemo(() => requests.filter((item) => item.status === 'Approved').length, [requests]);
  const rejectedCount = useMemo(() => requests.filter((item) => item.status === 'Rejected').length, [requests]);
  const recentRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const historyRequests = useMemo(() => requests.filter((item) => item.status === 'Approved' || item.status === 'Expired'), [requests]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await api.get('/outpasses/me');
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests().catch((loadError) => {
      setLoading(false);
      setError(loadError.response?.data?.message || 'Failed to load requests');
    });
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

  const handleDownload = async (requestId) => {
    const response = await api.get(`/outpasses/${requestId}/pdf`, { responseType: 'blob' });
    const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `outpass-${requestId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(fileUrl);
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

        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="two-column">
            <label>
              Name
              <input value={user?.name || ''} readOnly />
            </label>
            <label>
              Department
              <input value={user?.department || ''} readOnly />
            </label>
          </div>

          <div className="two-column">
            <label>
              Year
              <input value={user?.year || ''} readOnly />
            </label>
            <label>
              Request Type
              <select name="requestType" value={form.requestType} onChange={handleChange} required>
                <option value="Outing">Outing</option>
                <option value="Home">Home</option>
              </select>
            </label>
          </div>

          <div className="two-column">
            <label>
              Date
              <input name="date" type="date" value={form.date} onChange={handleChange} required />
            </label>
            <label>
              Out Time
              <input name="outTime" type="time" value={form.outTime} onChange={handleChange} required />
            </label>
          </div>

          <div className="two-column">
            <label>
              Return Time
              <input name="returnTime" type="time" value={form.returnTime} onChange={handleChange} required />
            </label>
            <label>
              Reason
              <input name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for outpass" required />
            </label>
          </div>

          <AlertBanner type="error" message={error} />
          <AlertBanner type="success" message={success} />

          {form.requestType === 'Outing' && form.date && !isOutgoingWeekendValid ? (
            <div className="inline-note inline-note--warning">Outing requests are allowed only on weekends.</div>
          ) : null}

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={saving || !isOutgoingWeekendValid}>
              {saving ? 'Submitting...' : selectedRequest ? 'Reapply Request' : 'Submit Request'}
            </button>
            {selectedRequest ? (
              <button className="secondary-button" type="button" onClick={() => setSelectedId(null)}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section id="request-history" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">My requests</p>
            <h2>Recent requests</h2>
          </div>
          <span className="mini-summary">{requests.length} total</span>
        </div>

        <AlertBanner type="error" message={error} />

        {loading ? (
          <LoadingState label="Loading request history..." />
        ) : recentRequests.length ? (
          <div className="request-history-grid">
            {recentRequests.map((request) => (
              <article key={request._id} className="history-card">
                <div className="history-card__top">
                  <div>
                    <strong>{request.requestType}</strong>
                    <p className="muted">{new Date(request.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
                </div>

                <p className="history-card__reason">{request.reason}</p>

                <div className="history-card__actions">
                  {request.status === 'Rejected' ? (
                    <button className="link-button" type="button" onClick={() => setSelectedId(request._id)}>
                      Edit and reapply
                    </button>
                  ) : null}
                  {request.status === 'Approved' ? (
                    <button className="link-button" type="button" onClick={() => handleDownload(request._id)}>
                      Download Outpass
                    </button>
                  ) : null}
                </div>

                {request.rejectionReason ? <AlertBanner type="error" message={request.rejectionReason} /> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No requests submitted yet. Use Apply for Outpass above to create your first request.</div>
        )}
      </section>

      <section id="outpass-history" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Outpass history</p>
            <h2>Approved and expired outpasses</h2>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading outpass history..." />
        ) : historyRequests.length ? (
          <div className="request-history-grid">
            {historyRequests.map((request) => (
              <article key={request._id} className="history-card">
                <div className="history-card__top">
                  <div>
                    <strong>{request.requestType}</strong>
                    <p className="muted">{new Date(request.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
                </div>

                <p className="history-card__reason">{request.reason}</p>

                <div className="history-card__actions">
                  {request.status === 'Approved' ? (
                    <button className="link-button" type="button" onClick={() => handleDownload(request._id)}>
                      Download Outpass
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No approved outpasses yet.</div>
        )}
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

        <div className="student-profile-grid">
          <div>
            <span>Name</span>
            <strong>{user?.name || '—'}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{user?.role || 'Student'}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{user?.department || '—'}</strong>
          </div>
          <div>
            <span>Year</span>
            <strong>{user?.year || '—'}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email || '—'}</strong>
          </div>
          <div>
            <span>Register number</span>
            <strong>{user?.registerNumber || '—'}</strong>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}
