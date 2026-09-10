import { useState } from 'react';
import { Link } from 'react-router-dom';

export function PasswordField({ name, value, onChange, label, placeholder, autoComplete, required = true, minLength, disabled }) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {label}
      <div className="password-field">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          disabled={disabled}
        />
        <button
          className="password-toggle"
          type="button"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>
      </div>
    </label>
  );
}

export function AuthBrandPanel({ title, subtitle, showSignInLink = false, hideTop = false }) {
  return (
    <div className="auth-copy auth-copy--brand">
      {!hideTop ? (
        <>
          <span className="auth-brand-badge">
            <i aria-hidden="true" />
            University Hostel Portal
          </span>
          <p className="eyebrow">St. Joseph&apos;s University</p>
          <h1>H.O.M.S</h1>
          <p className="auth-subtitle">{subtitle || title}</p>
        </>
      ) : null}
      <p>Apply for hostel permissions, track requests, and manage approvals with ease.</p>

      <ul className="auth-role-list">
        <li>
          <span className="auth-role-icon" aria-hidden="true">🎓</span>
          <div>
            <strong>Student</strong>
            <span>Apply for hostel leave and track request status.</span>
          </div>
        </li>
        <li>
          <span className="auth-role-icon" aria-hidden="true">👩‍🏫</span>
          <div>
            <strong>HOD / Sister</strong>
            <span>Review and manage student requests.</span>
          </div>
        </li>
        <li>
          <span className="auth-role-icon" aria-hidden="true">🛡️</span>
          <div>
            <strong>Warden</strong>
            <span>Approve hostel outpasses and monitor requests.</span>
          </div>
        </li>
      </ul>

      <div className="auth-trust-row" aria-label="Portal highlights">
        <span>Mobile friendly</span>
        <span>Role-based access</span>
        <span>Fast approvals</span>
      </div>

      {showSignInLink ? (
        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in to your account</Link>
        </p>
      ) : null}
    </div>
  );
}
