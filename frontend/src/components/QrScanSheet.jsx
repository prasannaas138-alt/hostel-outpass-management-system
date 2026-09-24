import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';

// ---------------------------------------------------------------------------
// QrScanSheet - full-screen student gate-QR scanner overlay.
//
// Flow: camera starts on open -> one QR decode stops the camera -> exactly one
// POST /api/movements/scan { qrPayload } -> backend-shaped success/error UI.
// The backend is the source of truth: no timing/approval logic lives here.
// ---------------------------------------------------------------------------

const SCAN_REGION_ID = 'homs-qr-scan-region';
// Short, simple success chime via WebAudio (no package, no audio asset).
// Resolves immediately where AudioContext is unavailable; failures are silent.
const playSuccessChime = () => {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const notes = [523.25, 783.99];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 800);
  } catch {
    // Sound is decorative - a blocked AudioContext must never break the scan.
  }
};

const formatServerInstant = (value) => {
  if (!value) return '—';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function QrScanSheet({ open, onClose, onScanComplete }) {
  const [phase, setPhase] = useState('scanning'); // scanning | sending | success | rejected
  const [cameraError, setCameraError] = useState('');
  const [scanCycle, setScanCycle] = useState(0); // bump to restart camera after a rejection
  const [result, setResult] = useState(null); // backend success payload
  const [rejection, setRejection] = useState(null); // { message }
  const scannerRef = useRef(null);
  const inProgressRef = useRef(false);
  const closedRef = useRef(false);
  const onScanCompleteRef = useRef(onScanComplete);

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  }, [onScanComplete]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Camera already stopped / never started - safe to ignore on teardown.
    }
    try {
      scanner.clear();
    } catch {
      // Element may already be unmounted - safe to ignore.
    }
  }, []);

  const handleClose = useCallback(() => {
    closedRef.current = true;
    stopCamera();
    onClose?.();
  }, [onClose, stopCamera]);

  const submitPayload = useCallback(async (decodedText) => {
    // Duplicate protection: one physical detection -> one POST, always.
    if (inProgressRef.current || closedRef.current) return;
    inProgressRef.current = true;
    setPhase('sending');
    setCameraError('');
    await stopCamera();
    if (closedRef.current) return;

    try {
      const response = await api.post('/movements/scan', { qrPayload: decodedText });
      if (closedRef.current) return;
      const data = response.data || {};
      setResult(data);
      setRejection(null);
      setPhase('success');
      playSuccessChime();
    } catch (error) {
      if (closedRef.current) return;
      const message =
        error?.response?.data?.message ||
        (error?.code === 'ERR_NETWORK' || !error?.response
          ? 'Network error. Please check your connection and try again.'
          : 'Scan failed. Please try again.');
      setResult(null);
      setRejection({ message });
      setPhase('rejected');
    } finally {
      inProgressRef.current = false;
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) return undefined;
    if (phase !== 'scanning') return undefined;
    setCameraError('');
    closedRef.current = false;
    inProgressRef.current = false;
    setResult(null);
    setRejection(null);
    scannerRef.current = null;

    let cancelled = false;
    let scanner = null;

    const startCamera = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('UNSUPPORTED');
        }
        scanner = new Html5Qrcode(SCAN_REGION_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            if (cancelled || closedRef.current || inProgressRef.current) return;
            const text = String(decodedText || '').trim();
            if (!text) return;
            submitPayload(text);
          },
          () => {
            // Per-frame decode misses are normal while aiming - ignore silently.
          }
        );
        if (cancelled) {
          try { await scanner.stop(); } catch { /* noop */ }
          try { scanner.clear(); } catch { /* noop */ }
        }
      } catch (error) {
        if (cancelled || closedRef.current) return;
        const name = error?.name || '';
        const message = String(error?.message || '');
        if (error?.message === 'UNSUPPORTED' || name === 'NotSupportedError') {
          setCameraError('Camera scanning is not supported on this device or browser.');
        } else if (name === 'NotAllowedError' || name === 'SecurityError') {
          setCameraError('Camera permission was denied. Please allow camera access and try again.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || /no camera|not found/i.test(message)) {
          setCameraError('No camera was found on this device.');
        } else {
          setCameraError('Could not start the camera. Please try again.');
        }
        setPhase('scanning');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, scanCycle, stopCamera, submitPayload]);

  // Lock background scroll while the sheet is open; restore on close.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const isSuccess = phase === 'success' && result;
  const isReturn = isSuccess && result.action === 'RETURN';
  const isExit = isSuccess && result.action === 'EXIT';
  const successTitle = isReturn ? 'WELCOME BACK' : 'EXIT RECORDED';
  const successSubtitle = isReturn ? 'Return recorded' : 'You are now outside campus';
  const successTime = isReturn ? result.actualReturnAt : result?.actualExitAt;
  const showLate = isReturn && result.lateReturn === true;
  const headerTitle = phase === 'scanning' ? 'Scan gate QR' : phase === 'sending' ? 'Recording...' : isSuccess ? successTitle : 'Scan result';

  return (
    <div className="qrscan-overlay" role="dialog" aria-modal="true" aria-label="Scan gate QR code">
      <div className="qrscan-card">
        <div className="qrscan-header">
          <div>
            <p className="eyebrow">Gate QR scan</p>
            <h2>{headerTitle}</h2>
          </div>
          <button className="secondary-button qrscan-close" type="button" onClick={handleClose} aria-label="Close scanner">
            &times;
          </button>
        </div>

        {phase === 'scanning' && !cameraError ? (
          <>
            <p className="muted qrscan-hint">Point your camera at the permanent gate QR. Hold steady inside the frame.</p>
            <div className="qrscan-viewport">
              <div id={SCAN_REGION_ID} className="qrscan-region" aria-label="Camera viewfinder" />
              <div className="qrscan-frame" aria-hidden="true">
                <span className="qrscan-corner qrscan-corner--tl" />
                <span className="qrscan-corner qrscan-corner--tr" />
                <span className="qrscan-corner qrscan-corner--bl" />
                <span className="qrscan-corner qrscan-corner--br" />
              </div>
            </div>
          </>
        ) : null}

        {phase === 'scanning' && cameraError ? (
          <div className="qrscan-notice qrscan-notice--error" role="alert">
            <strong>Camera unavailable</strong>
            <p>{cameraError}</p>
          </div>
        ) : null}

        {phase === 'sending' ? (
          <div className="qrscan-notice" role="status" aria-live="polite">
            <span className="qrscan-spinner" aria-hidden="true" />
            <p>Sending your scan... please wait.</p>
          </div>
        ) : null}

        {isSuccess ? (
          <div
            className={`qrscan-success ${isReturn ? 'qrscan-success--return' : 'qrscan-success--exit'}`}
            role="status"
            aria-live="polite"
          >
            <img
              className="qrscan-verification-logo"
              src="/st-joseph-logo.png"
              alt="St. Joseph University"
              onError={(event) => { event.target.style.display = 'none'; }}
            />
            {result?.outpassId ? <p className="qrscan-verification-id">{result.outpassId}</p> : null}
            <div className="qrscan-success-ring" aria-hidden="true">
              <svg viewBox="0 0 52 52" className="qrscan-success-svg">
                <circle className="qrscan-success-circle" cx="26" cy="26" r="24" fill="none" />
                {isReturn ? (
                  <path className="qrscan-verification-icon" fill="none" d="M17 18l9 9 9-9M26 27v15" />
                ) : (
                  <path className="qrscan-verification-icon" fill="none" d="M17 34l9-9 9 9M26 25V10" />
                )}
              </svg>
            </div>
            <p className="qrscan-success-status">APPROVED</p>
            <h3 className="qrscan-success-title">{successTitle}</h3>
            <p className="qrscan-success-subtitle">{successSubtitle}</p>
            <p className="qrscan-success-time">
              <span>{isExit ? 'Exit time' : 'Return time'}</span>
              <strong>{formatServerInstant(successTime)}</strong>
            </p>
            {showLate ? (
              <p className="qrscan-late" role="note">Late return recorded</p>
            ) : null}
          </div>
        ) : null}

        {phase === 'rejected' ? (
          <div className="qrscan-rejected" role="alert">
            <div className="qrscan-rejected__icon" aria-hidden="true">
              <svg viewBox="0 0 52 52" className="qrscan-rejected__svg">
                <circle className="qrscan-rejected__circle" cx="26" cy="26" r="24" fill="none" />
                <path className="qrscan-rejected__x" fill="none" d="M17 17l18 18M35 17L17 35" />
              </svg>
            </div>
            <strong>SCAN NOT RECORDED</strong>
            <p>{rejection?.message || 'Scan failed. Please try again.'}</p>
          </div>
        ) : null}

        <div className="qrscan-actions">
          {phase === 'rejected' ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setRejection(null);
                setCameraError('');
                setPhase('scanning');
                setScanCycle((cycle) => cycle + 1);
              }}
            >
              Scan again
            </button>
          ) : null}
          <button className={phase === 'rejected' ? 'secondary-button' : 'primary-button'} type="button" onClick={handleClose}>
            {isSuccess ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

