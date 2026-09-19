import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { IconArrowLeft } from './WardenIcons';
import '../styles/student-profile-modal.css';

const NOT_PROVIDED = 'Not provided';

const valueOrPlaceholder = (value) => {
  const text = String(value || '').trim();
  return text || NOT_PROVIDED;
};

const sections = [
  {
    title: 'Personal Details',
    fields: [
      ['Student Name', 'name'],
      ['Registration Number', 'registerNumber'],
      ['Email Address', 'email'],
      ['Phone Number', 'phone'],
      ['Parent/Guardian Number', 'parentPhone'],
    ],
  },
  {
    title: 'Academic Details',
    fields: [
      ['Department', 'department'],
      ['Year', 'year'],
      ['Account Role', 'role'],
    ],
  },
  {
    title: 'Hostel Details',
    fields: [
      ['Hostel Name', 'hostelName'],
      ['Hostel Block', 'hostelBlock'],
      ['Room Number', 'roomNumber'],
    ],
  },
];

export default function StudentProfileModal({ studentId, studentName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState('');
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

  const initial = String(profile?.name || studentName || 'S').charAt(0).toUpperCase();

  return (
    <div className="student-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
      <div className="student-profile-modal">
        <div className="student-profile-head">
          <span className="student-profile-avatar" aria-hidden="true">{initial}</span>
          <div className="student-profile-heading">
            <p className="student-profile-eyebrow">Student Profile</p>
            <h2 id="student-profile-title">{valueOrPlaceholder(profile?.name || studentName)}</h2>
            <p>{valueOrPlaceholder(profile?.registerNumber)}</p>
          </div>
          <button className="student-profile-back" type="button" onClick={onClose}>
            <IconArrowLeft size={16} />
            Back
          </button>
        </div>

        {loading ? (
          <div className="student-profile-state">Loading student profile…</div>
        ) : error ? (
          <div className="student-profile-state student-profile-state--error" role="alert">
            <p>{error}</p>
            <button className="wd-btn wd-btn--ghost" type="button" onClick={onClose}>Back</button>
          </div>
        ) : profile ? (
          <div className="student-profile-content">
            {sections.map((section) => (
              <section className="student-profile-section" key={section.title}>
                <h3>{section.title}</h3>
                <div className="student-profile-grid">
                  {section.fields.map(([label, key]) => (
                    <div className="student-profile-field" key={key}>
                      <span>{label}</span>
                      <strong>{valueOrPlaceholder(profile[key])}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="student-profile-state student-profile-state--error">Student profile is unavailable.</div>
        )}
      </div>
    </div>
  );
}
