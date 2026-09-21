import { useEffect, useState } from 'react';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { IconDownload } from '../components/WardenIcons';
import '../styles/warden-dashboard.css';

// Turns an axios blob error back into the JSON message the API returned.
const readBlobError = async (error, fallback) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return error?.response?.data?.message || fallback;
};

const formatStamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function HodDownloads() {
  const [months, setMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMonths = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/monthly-outpasses');
      setMonths(Array.isArray(data?.months) ? data.months : []);
      setCurrentMonth(data?.currentMonth || '');
    } catch (loadErrorValue) {
      setLoadError(loadErrorValue.response?.data?.message || 'Failed to load completed months.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonths();
  }, []);

  // Downloads the real month data as .xlsx and saves it with the same
  // filename the API uses (September-2026-OutpassHistory.xlsx).
  const handleDownload = async (month) => {
    const key = `download-${month.year}-${month.month}`;
    setBusyKey(key);
    setError('');
    setSuccess('');
    try {
      const response = await api.get(
        `/monthly-outpasses/${month.year}/${month.month}/download`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = month.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(
        `Downloaded ${month.fileName} (${month.count} record${month.count === 1 ? '' : 's'}).`
      );
      await loadMonths();
    } catch (downloadError) {
      setError(await readBlobError(downloadError, 'Failed to download that month.'));
    } finally {
      setBusyKey('');
    }
  };

  // Permanently deletes ONLY that month's real outpass documents in MongoDB.
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.delete(
        `/monthly-outpasses/${deleteTarget.year}/${deleteTarget.month}`
      );
      setSuccess(data?.message || `${deleteTarget.label} outpass history deleted.`);
      setDeleteTarget(null);
      await loadMonths();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Failed to delete that month.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="wd-panel" aria-label="Monthly outpass archive">
      <div className="wd-panel-head">
        <div>
          <p className="eyebrow">Monthly archive</p>
          <h2 className="wd-panel-title">Downloads</h2>
          <p className="wd-panel-sub">
            Only months that have fully ended can be exported or deleted.
            {currentMonth ? ` ${currentMonth} is still running.` : ''}
          </p>
        </div>
        {!loading && !loadError ? (
          <span className="mini-summary">{months.length} completed months</span>
        ) : null}
      </div>

      <AlertBanner type="success" message={success} />
      <AlertBanner type="error" message={error} />

      {loading ? (
        <LoadingState label="Loading completed months..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadMonths} retryLabel="Reload months" />
      ) : months.length ? (
        <div className="wd-list">
          {months.map((month) => {
            const isBusy = busyKey === `download-${month.year}-${month.month}`;
            return (
              <article className="wd-list-item" key={`${month.year}-${month.month}`}>
                <div className="wd-list-top">
                  <div className="wd-list-name">
                    <strong>{month.label}</strong>
                    <span>
                      {month.count} outpass record{month.count === 1 ? '' : 's'}
                      {month.exportedAt
                        ? ` - exported ${formatStamp(month.exportedAt)}`
                        : ' - not exported yet'}
                    </span>
                  </div>
                  <span
                    className={
                      month.count ? 'wd-pill wd-pill--neutral' : 'wd-pill wd-pill--rejected'
                    }
                  >
                    {month.count ? `${month.count} records` : 'Empty'}
                  </span>
                </div>

                <div className="wd-list-foot">
                  <span className="wd-panel-sub">{month.fileName}</span>
                  <div className="wd-modal-actions">
                    <button
                      className="wd-btn wd-btn--dark"
                      type="button"
                      onClick={() => handleDownload(month)}
                      disabled={Boolean(busyKey) || deleting}
                    >
                      <IconDownload size={16} />
                      {isBusy ? 'Preparing...' : 'Download'}
                    </button>
                    <button
                      className="wd-btn wd-btn--reject"
                      type="button"
                      onClick={() => setDeleteTarget(month)}
                      disabled={Boolean(busyKey) || deleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="wd-empty">No completed months are available yet.</div>
      )}

      {deleteTarget ? (
        <div
          className="wd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${deleteTarget.label} outpass history`}
        >
          <div className="wd-modal wd-modal--sm">
            <h3>Delete {deleteTarget.label} outpass history?</h3>
            <p className="wd-panel-sub">
              Are you sure you want to permanently delete the outpass history for{' '}
              {deleteTarget.label}? This removes {deleteTarget.count} record
              {deleteTarget.count === 1 ? '' : 's'} from the outpasses collection for that month
              only. Student accounts, the Outpass ID counter and every other month stay untouched.
            </p>
            <div className="wd-modal-actions">
              <button
                className="wd-btn wd-btn--reject"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className="wd-btn wd-btn--ghost"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
