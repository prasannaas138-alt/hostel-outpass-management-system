import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import api from '../services/api';
import '../styles/gate-qr.css';

const safeFilenamePart = (value) =>
  String(value || 'gate')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase() || 'GATE';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const EMPTY_CREATE_FORM = {
  code: '',
  name: '',
  hostelName: '__select_hostel__',
  location: '',
};

export default function GateQrPanel({ allowCreate = false }) {
  const [gates, setGates] = useState([]);
  const [selectedGateId, setSelectedGateId] = useState('');
  const [qrData, setQrData] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [loadingGates, setLoadingGates] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creatingGate, setCreatingGate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const loadGates = useCallback(async (preferredGateId = '') => {
    setLoadingGates(true);
    try {
      const { data } = await api.get('/gates');
      const nextGates = Array.isArray(data) ? data : [];
      setGates(nextGates);
      setSelectedGateId((current) => preferredGateId || current || nextGates[0]?._id || '');
      setError('');
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load gates.');
    } finally {
      setLoadingGates(false);
    }
  }, []);

  useEffect(() => {
    loadGates();
  }, [loadGates]);

  useEffect(() => {
    let active = true;
    setQrData(null);
    setImageDataUrl('');
    if (!selectedGateId) return undefined;
    const loadQr = async () => {
      setLoadingQr(true);
      try {
        const { data } = await api.get(`/gates/${selectedGateId}/qr`);
        if (!active || !data?.qrPayload) return;
        // Render exactly the permanent payload returned by the backend endpoint.
        const image = await QRCode.toDataURL(data.qrPayload, {
          width: 720,
          margin: 4,
          errorCorrectionLevel: 'H',
        });
        if (!active) return;
        setQrData(data);
        setImageDataUrl(image);
        setError('');
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || 'Unable to load the permanent gate QR.');
      } finally {
        if (active) setLoadingQr(false);
      }
    };
    loadQr();
    return () => { active = false; };
  }, [selectedGateId]);

  const updateCreateField = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateError('');
    setCreateSuccess('');
  };

  const createGate = async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(
      Object.entries(createForm).map(([field, value]) => [
        field,
        String(value || '').trim(),
      ]),
    );
    if (form.hostelName === '__select_hostel__') {
      setCreateError('Select a hostel.');
      return;
    }
    const missingField = Object.keys(form).find(
      (field) => field !== 'hostelName' && !form[field],
    );
    if (missingField) {
      setCreateError('Code, name, and location are required.');
      return;
    }
    const requestForm = {
      ...form,
      // The backend enum uses an empty string for a shared gate.
      hostelName: form.hostelName === '' ? '' : form.hostelName,
    };

    setCreatingGate(true);
    setCreateError('');
    setCreateSuccess('');
    try {
      // The backend generates and stores the permanent qrToken. It is never
      // accepted from, displayed by, or generated in this form.
      const { data } = await api.post('/gates', requestForm);
      await loadGates(data?._id);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateSuccess('Gate created successfully.');
    } catch (createError) {
      setCreateError(createError.response?.data?.message || 'Unable to create the gate.');
    } finally {
      setCreatingGate(false);
    }
  };

  const selectedGate = useMemo(
    () => gates.find((gate) => gate._id === selectedGateId) || null,
    [gates, selectedGateId],
  );

  const downloadQr = () => {
    if (!imageDataUrl || !qrData) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `${safeFilenamePart(qrData.code)}-QR.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const printQr = () => {
    if (!imageDataUrl || !qrData) return;
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return;
    const gateName = escapeHtml(qrData.name);
    const gateCode = escapeHtml(qrData.code);
    printWindow.document.write(`
      <!doctype html><html lang="en"><head><meta charset="utf-8" />
      <title>${gateName} QR</title><style>
      @page { size: A4; margin: 24mm; } body { font-family: Arial, sans-serif; color: #0f172a; text-align: center; }
      h1 { font-size: 28px; margin: 0 0 8px; } h2 { font-size: 20px; margin: 0 0 4px; }
      p { margin: 4px 0; } img { width: 520px; height: 520px; margin: 24px auto 12px; image-rendering: pixelated; }
      .label { font-size: 14px; letter-spacing: .08em; text-transform: uppercase; }
      </style></head><body><h1>H.O.M.S.</h1><h2>${gateName}</h2>
      <p>Gate code: ${gateCode}</p><img src="${imageDataUrl}" alt="Permanent gate QR" />
      <p class="label">Permanent Gate QR</p></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="gate-qr-panel" aria-label="Permanent gate QR">
      <div className="gate-qr-panel__heading"><div>
        <p className="gate-qr-panel__eyebrow">Gate administration</p>
        <h2>Permanent Gate QR</h2>
      </div>{selectedGate?.active === false ? <span className="gate-qr-panel__inactive">Gate inactive</span> : null}</div>
      {allowCreate ? (
        <form className="gate-qr-panel__form" onSubmit={createGate} noValidate>
          <div className="gate-qr-panel__form-heading">
            <h3>Create Gate</h3>
            <p>Add a physical gate. Its permanent QR token is generated by the server.</p>
          </div>
          <div className="gate-qr-panel__form-grid">
            <label className="gate-qr-panel__field">
              Gate code
              <input
                name="code"
                type="text"
                value={createForm.code}
                onChange={(event) => updateCreateField('code', event.target.value)}
                placeholder="e.g. MAIN-GATE"
                autoComplete="off"
                required
              />
            </label>
            <label className="gate-qr-panel__field">
              Gate name
              <input
                name="name"
                type="text"
                value={createForm.name}
                onChange={(event) => updateCreateField('name', event.target.value)}
                placeholder="e.g. Main Gate"
                autoComplete="off"
                required
              />
            </label>
            <label className="gate-qr-panel__field">
              Hostel
              <select
                name="hostelName"
                value={createForm.hostelName}
                onChange={(event) => updateCreateField('hostelName', event.target.value)}
                required
              >
                <option value="__select_hostel__" disabled>Select hostel</option>
                <option value="St. Joseph University Boys Hostel">St. Joseph University Boys Hostel</option>
                <option value="DMI Boys Hostel">DMI Boys Hostel</option>
                <option value="">Shared by all hostels</option>
              </select>
            </label>
            <label className="gate-qr-panel__field">
              Location
              <input
                name="location"
                type="text"
                value={createForm.location}
                onChange={(event) => updateCreateField('location', event.target.value)}
                placeholder="e.g. Main campus entrance"
                autoComplete="off"
                required
              />
            </label>
          </div>
          <div className="gate-qr-panel__form-actions">
            <button className="primary-button" type="submit" disabled={creatingGate}>
              {creatingGate ? 'Creating…' : 'Create Gate'}
            </button>
            {createSuccess ? <p className="gate-qr-panel__form-success" role="status">{createSuccess}</p> : null}
            {createError ? <p className="gate-qr-panel__form-error" role="alert">{createError}</p> : null}
          </div>
        </form>
      ) : null}
      {loadingGates ? <p className="gate-qr-panel__message">Loading gates…</p> : null}
      {!loadingGates && !error && gates.length === 0 ? <p className="gate-qr-panel__message">No gates are configured yet.</p> : null}
      {gates.length ? <label className="gate-qr-panel__select">Select gate
        <select value={selectedGateId} onChange={(event) => setSelectedGateId(event.target.value)}>
          {gates.map((gate) => <option key={gate._id} value={gate._id}>{gate.code} — {gate.name}{gate.active === false ? ' (inactive)' : ''}</option>)}
        </select>
      </label> : null}
      {error ? <p className="gate-qr-panel__error" role="alert">{error}</p> : null}
      {loadingQr ? <p className="gate-qr-panel__message">Preparing permanent QR…</p> : null}
      {imageDataUrl && qrData ? <div className="gate-qr-panel__content">
        <div className="gate-qr-panel__image-wrap"><img className="gate-qr-panel__image" src={imageDataUrl} alt={`Permanent QR for ${qrData.name}`} /></div>
        <div className="gate-qr-panel__details"><p className="gate-qr-panel__label">Permanent Gate QR</p>
          <h3>{qrData.name}</h3><p>Gate code: {qrData.code}</p>
          {qrData.hostelName ? <p>Hostel: {qrData.hostelName}</p> : null}
          <p>{qrData.active === false ? 'This gate is inactive.' : 'Ready to display at the gate.'}</p>
          <div className="gate-qr-panel__actions"><button className="secondary-button" type="button" onClick={downloadQr}>Download QR</button><button className="primary-button" type="button" onClick={printQr}>Print QR</button></div>
          <p className="gate-qr-panel__note">The QR contains only the permanent gate payload; no student or outpass data.</p>
        </div>
      </div> : null}
    </section>
  );
}

