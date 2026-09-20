import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import '../styles/student-profile-modal.css';
import '../styles/hod-students.css';

const NOT_PROVIDED = 'Not provided';

const valueOrPlaceholder = (value) => {
  const text = String(value || '').trim();
  return text || NOT_PROVIDED;
};

const yearLabel = (year) => {
  const text = String(year || '').trim();
  if (!text) return '';
  if (/^[0-9]+$/.test(text)) {
    const n = Number(text);
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return `${n}${suffix} Year`;
  }
  return text;
};

const sections = [
  {
    title: 'Academic Details',
    fields: [
      ['Register number', 'registerNumber'],
      ['Department', 'department'],
      ['Year', 'year'],
      ['Batch', 'batch'],
    ],
  },
  {
    title: 'Hostel Details',
    fields: [
      ['Phone number', 'phone'],
      ['Parent/guardian name', 'parentGuardianName'],
      ['Parent/guardian number', 'parentPhone'],
      ['Hostel name', 'hostelName'],
      ['Room number', 'roomNumber'],
    ],
  },
  {
    title: 'Account',
    fields: [
      ['Full name', 'name'],
      ['Email', 'email'],
      ['Role', 'role'],
    ],
  },
];

const EDIT_FIELDS = [
  ['name', 'Full name', 'text'],
  ['registerNumber', 'Register number', 'text'],
  ['department', 'Department', 'text'],
  ['year', 'Year', 'text'],
  ['batch', 'Batch (YYYY-YYYY)', 'text'],
  ['hostelName', 'Hostel name', 'text'],
  ['roomNumber', 'Room number', 'text'],
  ['phone', 'Phone number', 'tel'],
  ['parentPhone', 'Parent/guardian number', 'tel'],
  ['parentGuardianName', 'Parent/guardian name', 'text'],
  ['email', 'Email', 'email'],
];

const HOSTEL_OPTIONS = [
  'St. Joseph University Boys Hostel',
  'DMI Boys Hostel',
];

export default function HodStudentProfileModal({ studentId, onClose, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError('Student profile is unavailable.');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    setProfile(null);

    api
      .get(`/auth/students/${encodeURIComponent(studentId)}/profile`)
      .then((response) => {
        if (active) setProfile(response.data?.user || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Failed to load student profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openEdit = () => {
    setForm({
      name: profile?.name || '',
      registerNumber: profile?.registerNumber || '',
      department: profile?.department || '',
      year: profile?.year || '',
      batch: profile?.batch || '',
      hostelName: profile?.hostelName || profile?.hostelBlock || '',
      roomNumber: profile?.roomNumber || '',
      phone: profile?.phone || '',
      parentPhone: profile?.parentPhone || '',
      parentGuardianName: profile?.parentGuardianName || '',
      email: profile?.email || '',
    });
    setFormError('');
    setSuccess('');
    setEditing(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!form.name?.trim()) { setFormError('Full name is required.'); return; }
    if (!form.registerNumber?.trim()) { setFormError('Register number is required.'); return; }
    if (!form.department?.trim()) { setFormError('Department is required.'); return; }
    if (!form.roomNumber?.trim()) { setFormError('Room number is required.'); return; }
    const batch = (form.batch || '').trim();
    if (batch && !/^[0-9]{4}-[0-9]{4}$/.test(batch)) {
      setFormError('Batch must be in YYYY-YYYY format (e.g. 2025-2029).');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const { data } = await api.put(`/auth/students/${encodeURIComponent(studentId)}/profile`, form);
      setProfile(data.user || null);
      setEditing(false);
      setSuccess(data.message || 'Student profile updated.');
      onSaved?.();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update student profile.');
    } finally {
      setSaving(false);
    }
  };

  const initial = String(profile?.name || 'S').charAt(0).toUpperCase();
  const summaryBits = [
    profile?.department || '',
    yearLabel(profile?.year),
    profile?.batch || '',
  ].filter(Boolean).join(' - ');

  return (
    <div className="student-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="hod-student-profile-title">
      <div className="student-profile-modal">
        <div className="student-profile-head">
          <span className="student-profile-avatar" aria-hidden="true">{initial}</span>
          <div className="student-profile-heading">
            <p className="student-profile-eyebrow">Student Profile</p>
            <h2 id="hod-student-profile-title">{valueOrPlaceholder(profile?.name)}</h2>
            <p>{summaryBits || valueOrPlaceholder(profile?.registerNumber)}</p>
            <p className="hod-student-hostel">{valueOrPlaceholder(profile?.hostelName)}</p>
          </div>
          <div className="hod-student-head-actions">
            {!editing && profile ? (
              <button className="hod-student-edit-btn" type="button" onClick={openEdit}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit Profile
              </button>
            ) : null}
            <button className="student-profile-back" type="button" onClick={onClose} aria-label="Close student profile">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="student-profile-state">Loading student profile…</div>
        ) : error ? (
          <div className="student-profile-state student-profile-state--error" role="alert">
            <p>{error}</p>
            <button className="wd-btn wd-btn--ghost" type="button" onClick={onClose}>Back</button>
          </div>
        ) : editing ? (
          <form className="student-profile-content hod-student-edit" onSubmit={saveEdit} noValidate>
            <h3 className="hod-student-edit-title">Edit student profile</h3>
            {formError ? <p className="hod-student-alert hod-student-alert--error" role="alert">{formError}</p> : null}
            <div className="hod-student-edit-grid">
              {EDIT_FIELDS.map(([field, label, type]) => (
                field === 'hostelName' ? (
                  <label key={field}>
                    {label}
                    <select name="hostelName" value={form.hostelName || ''} onChange={handleFormChange} disabled={saving}>
                      {HOSTEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={field}>
                    {label}
                    <input
                      type={type}
                      name={field}
                      value={form[field] || ''}
                      onChange={handleFormChange}
                      disabled={saving}
                      maxLength={field === 'batch' ? 9 : 60}
                    />
                  </label>
                )
              ))}
            </div>
            <div className="hod-student-edit-actions">
              <button className="pcr-btn pcr-btn--approve" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button className="pcr-btn pcr-btn--cancel" type="button" onClick={() => { setEditing(false); setFormError(''); }} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="student-profile-content">
            {success ? <p className="hod-student-alert hod-student-alert--success" role="status">{success}</p> : null}
            <div className="hod-student-sections">
              {sections.map((section) => (
                <section className="student-profile-section" key={section.title}>
                  <h3>{section.title}</h3>
                  <div className="student-profile-grid">
                    {section.fields.map(([label, key]) => (
                      <div className="student-profile-field" key={key}>
                        <span>{label}</span>
                        <strong>{key === 'year' ? (yearLabel(profile[key]) || valueOrPlaceholder(profile[key])) : valueOrPlaceholder(profile[key])}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="hod-student-foot">
              <button className="pcr-btn pcr-btn--approve" type="button" onClick={openEdit}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit profile
              </button>
              <button className="pcr-btn pcr-btn--cancel" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}