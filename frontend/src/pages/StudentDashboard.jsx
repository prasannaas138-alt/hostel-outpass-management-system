import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import StatusTracker from '../components/StatusTracker';
import '../styles/dashboard.css';
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
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Apply for outpass, track approvals, edit rejected requests, and download approved PDFs."
      navItems={[
        { id: 'apply-new-outpass', label: 'Apply New Outpass', description: 'Submit a new request' },
        { id: 'request-history', label: 'Request History', description: 'Browse past requests' },
        { id: 'request-tracker', label: 'Status Tracker', description: 'Track approvals' },
      ]}
    >
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
            <p className="eyebrow">Request history</p>
            <h2>All submitted outpasses</h2>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading request history..." />
        ) : requests.length ? (
          <div className="request-history-grid">
            {requests.map((request) => (
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
          <div className="empty-state">No requests submitted yet.</div>
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
    </DashboardLayout>
  );
}
