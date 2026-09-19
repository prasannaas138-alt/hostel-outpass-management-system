import { useState } from 'react';
import api from '../services/api';
import AlertBanner from './AlertBanner';
import { PasswordField } from './AuthPanels';
import { useAuth } from '../context/AuthContext';
import '../styles/warden-dashboard.css';

// Warden profile — follows the Student Dashboard profile interaction pattern
// (avatar with initial, editable username, password change with current/new/
// confirm + validation + success/error banners) but exposes the fields a
// Warden may change: username, email address, and password. No student fields.
// Everything runs on the authenticated user via /auth/me, so future real
// Warden accounts work without changes.
export default function WardenProfile() {
  const { user, updateUser } = useAuth();
  const initial = (user?.name || 'W').charAt(0).toUpperCase();

  // --- username/email form ---
  const [username, setUsername] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [savingName, setSavingName] = useState(false);

  // --- password form ---
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveUsername = async (event) => {
    event.preventDefault();
    setNameError('');
    setEmailError('');
    setNameSuccess('');
    setEmailSuccess('');

    if (!username.trim()) {
      setNameError('Username is required.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email Address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setSavingName(true);
    try {
      // Staff profile endpoint: updates username and email only. No
      // student/system field (department, year, room number, role…) can
      // be changed from the Warden profile.
      const { data } = await api.put('/auth/me/username', {
        name: username.trim(),
        email: trimmedEmail,
      });
      updateUser(data.user);
      setNameSuccess('Username updated successfully.');
      setEmailSuccess('Email Address updated successfully.');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update username.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must contain at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('New password must be different from the current password.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/me/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="wd-profile-card">
      <header className="wd-profile-head">
        <span className="wd-profile-avatar" aria-hidden="true">{initial}</span>
        <div>
          <h3>Profile Details</h3>
          <p className="wd-profile-sub">Manage your username and password.</p>
        </div>
      </header>

      <section className="wd-profile-section" aria-label="Change username">
        <h4>Username</h4>
        <form onSubmit={saveUsername} noValidate>
          <label className="wd-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={savingName}
              autoComplete="username"
            />
          </label>
          <label className="wd-field">
            <span>Email Address</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={savingName}
              autoComplete="email"
            />
          </label>
          <AlertBanner type="error" message={nameError} />
          <AlertBanner type="error" message={emailError} />
          <AlertBanner type="success" message={nameSuccess} />
          <AlertBanner type="success" message={emailSuccess} />
          <p className="wd-field-hint">You can change your username and email address here.</p>
          <div className="wd-profile-actions">
            <button className="wd-btn wd-btn--dark" type="submit" disabled={savingName}>
              {savingName ? 'Updating...' : 'Update Username'}
            </button>
          </div>
        </form>
      </section>

      <hr className="wd-profile-divider" />

      <section className="wd-profile-section" aria-label="Change password">
        <h4>Change Password</h4>
        <AlertBanner type="error" message={passwordError} />
        <AlertBanner type="success" message={passwordSuccess} />
        <form onSubmit={savePassword} noValidate>
          <div className="wd-field-grid">
            <PasswordField
              label="Current Password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              disabled={savingPassword}
              autoComplete="current-password"
            />
            <PasswordField
              label="New Password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              disabled={savingPassword}
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              disabled={savingPassword}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <p className="wd-field-hint">Use at least 8 characters.</p>
          <div className="wd-profile-actions">
            <button className="wd-btn wd-btn--dark" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
