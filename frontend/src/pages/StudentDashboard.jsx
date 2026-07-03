import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import AppHeader from '../components/AppHeader';
import '../styles/dashboard.css';

const emptyForm = {
  requestType: 'Outing',
  date: '',
  outTime: '',
  returnTime: '',
  reason: '',
};

export default function StudentDashboard() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedRequest = useMemo(() => requests.find((item) => item._id === selectedId), [requests, selectedId]);

  const loadRequests = async () => {
    const { data } = await api.get('/outpasses/me');
    setRequests(data);
  };

  useEffect(() => {
    loadRequests().catch((loadError) => setError(loadError.response?.data?.message || 'Failed to load requests'));
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
    setMessage('');

    try {
      if (selectedRequest && selectedRequest.status === 'Rejected') {
        await api.put(`/outpasses/${selectedRequest._id}`, form);
        setMessage('Request updated and resubmitted');
      } else {
        await api.post('/outpasses', form);
        setMessage('Outpass request submitted');
      }

      setSelectedId(null);
      setForm(emptyForm);
      await loadRequests();
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Failed to save request');
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
    <div className="dashboard-shell">
      <AppHeader
        title="Student Dashboard"
        subtitle="Apply for outpass, track approvals, edit rejected requests, and download approved PDFs."
      />

      <section className="panel-grid">
        <article className="panel card-form">
          <h2>{selectedRequest ? 'Edit Rejected Request' : 'Apply for Outpass'}</h2>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Request Type
              <select name="requestType" value={form.requestType} onChange={handleChange}>
                <option value="Outing">Outing</option>
                <option value="Home">Home</option>
              </select>
            </label>

            <label>
              Date
              <input name="date" type="date" value={form.date} onChange={handleChange} required />
            </label>

            <div className="two-column">
              <label>
                Out Time
                <input name="outTime" type="time" value={form.outTime} onChange={handleChange} required />
              </label>
              <label>
                Return Time
                <input name="returnTime" type="time" value={form.returnTime} onChange={handleChange} required />
              </label>
            </div>

            <label>
              Reason
              <textarea name="reason" rows="4" value={form.reason} onChange={handleChange} required />
            </label>

            {message ? <div className="success-banner">{message}</div> : null}
            {error ? <div className="error-banner">{error}</div> : null}

            <div className="button-row">
              <button className="primary-button" type="submit">
                {selectedRequest ? 'Reapply' : 'Submit Request'}
              </button>
              {selectedRequest ? (
                <button className="secondary-button" type="button" onClick={() => setSelectedId(null)}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <h2>My Requests</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id}>
                    <td>{request.requestType}</td>
                    <td>{new Date(request.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
                    </td>
                    <td>
                      <div className="table-copy">
                        <span>{request.reason}</span>
                        {request.rejectionReason ? <small className="rejection">{request.rejectionReason}</small> : null}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        {request.status === 'Rejected' ? (
                          <button className="link-button" type="button" onClick={() => setSelectedId(request._id)}>
                            Edit
                          </button>
                        ) : null}
                        {request.status === 'Approved' ? (
                          <button className="link-button" type="button" onClick={() => handleDownload(request._id)}>
                            PDF
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
