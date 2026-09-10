import { useState } from 'react';
import api from '../services/api';
import AlertBanner from './AlertBanner';
import { PasswordField } from './AuthPanels';

const EDITABLE_FIELDS = {
  name: 'Full name',
  department: 'Department',
  year: 'Year',
  hostelBlock: 'Hostel block',
  roomNumber: 'Room number',
};

export default function StudentProfile({ user, onProfileUpdated }) {
  const initial = (user?.name || 'S').charAt(0).toUpperCase();

  // Edit Profile state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Change Password state
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const openEdit = () => {
    setEditForm({
      name: user?.name || '',
      department: user?.department || '',
      year: user?.year || '',
      hostelBlock: user?.hostelBlock || '',
      roomNumber: user?.roomNumber || '',
    });
    setEditError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateEdit = () => {
    if (!editForm.name?.trim()) return 'Full name is required.';
    if (!editForm.department?.trim()) return 'Department is required.';
    if (!editForm.roomNumber?.trim()) return 'Room number is required.';
    return '';
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const validationError = validateEdit();
    setEditError(validationError);
    if (validationError || saving) return;

    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', editForm);
      onProfileUpdated?.(data.user);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openPassword = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOpen(true);
  };

  const cancelPassword = () => {
    setPasswordOpen(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (changingPassword) return;

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

    setPasswordError('');
    setChangingPassword(true);
    try {
      const { data } = await api.put('/auth/me/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordOpen(false);
      setPasswordSuccess(data.message || 'Password changed successfully.');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="profile-wrap">
      <div className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <div>
          <p className="eyebrow">Student profile</p>
          <h3>{user?.name || 'Student'}</h3>
          <p className="muted">{user?.email || 'No email available'}</p>
        </div>
        <span className="profile-role">{user?.role || 'Student'}</span>
      </div>

      {editing ? (
        <section className="profile-card" aria-label="Edit profile">
          <h4>Edit profile</h4>
          <AlertBanner type="error" message={editError} />
          <form onSubmit={saveEdit} noValidate>
            <div className="profile-edit-grid">
              {Object.entries(EDITABLE_FIELDS).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    type="text"
                    name={field}
                    value={editForm[field] || ''}
                    onChange={handleEditChange}
                    maxLength={field === 'year' ? 10 : 60}
                    disabled={saving}
                  />
                </label>
              ))}
              <label>
                  Email (read-only)
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    aria-readonly="true"
                    disabled={saving}
                  />
                </label>
                <label>
                  Register number (read-only)
                  <input
                    type="text"
                    value={user?.registerNumber || ''}
                    readOnly
                    aria-readonly="true"
                    disabled={saving}
                  />
                </label>
            </div>
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="secondary-button" type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!editing ? (
        <div className="profile-sections">
          <section className="profile-card" aria-label="Academic details">
            <h4>Academic details</h4>
            <dl>
              <div><dt>Register number</dt><dd>{user?.registerNumber || '—'}</dd></div>
              <div><dt>Department</dt><dd>{user?.department || '—'}</dd></div>
              <div><dt>Year</dt><dd>{user?.year || '—'}</dd></div>
            </dl>
          </section>

          <section className="profile-card" aria-label="Hostel details">
            <h4>Hostel details</h4>
            <dl>
              <div><dt>Hostel block</dt><dd>{user?.hostelBlock || '—'}</dd></div>
              <div><dt>Room number</dt><dd>{user?.roomNumber || '—'}</dd></div>
            </dl>
          </section>

          <section className="profile-card" aria-label="Account details">
            <h4>Account</h4>
            <dl>
              <div><dt>Full name</dt><dd>{user?.name || '—'}</dd></div>
              <div><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
              <div><dt>Role</dt><dd>{user?.role || 'Student'}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}

      {!editing ? (
        <div className="button-row profile-actions">
          <button className="primary-button" type="button" onClick={openEdit}>
            Edit profile
          </button>
          <button className="secondary-button" type="button" onClick={passwordOpen ? cancelPassword : openPassword}>
            {passwordOpen ? 'Cancel password change' : 'Change password'}
          </button>
        </div>
      ) : null}

      {passwordSuccess && !passwordOpen ? (
        <AlertBanner type="success" message={passwordSuccess} />
      ) : null}

      {passwordOpen ? (
        <section className="profile-card" aria-label="Change password">
          <h4>Change password</h4>
          <AlertBanner type="error" message={passwordError} />
          <form onSubmit={savePassword} noValidate>
            <PasswordField
              label="Current password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              disabled={changingPassword}
              autoComplete="current-password"
            />
            <PasswordField
              label="New password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              disabled={changingPassword}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              disabled={changingPassword}
              autoComplete="new-password"
            />
            <p className="hint">Use at least 8 characters.</p>
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={changingPassword}>
                {changingPassword ? 'Changing password...' : 'Change password'}
              </button>
              <button className="secondary-button" type="button" onClick={cancelPassword} disabled={changingPassword}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
