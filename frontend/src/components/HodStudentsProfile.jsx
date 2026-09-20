import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { IconEye, IconSearch } from './WardenIcons';
import HodStudentProfileModal from './HodStudentProfileModal';
import '../styles/hod-students.css';

const PAGE_SIZE = 10;

const yearLabel = (year) => {
  const text = String(year || '').trim();
  if (!text) return '—';
  if (/^[0-9]+$/.test(text)) {
    const n = Number(text);
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return `${n}${suffix} Year`;
  }
  return text;
};

const valueOf = (value) => {
  const text = String(value || '').trim();
  return text || '—';
};

export default function HodStudentsProfile() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState(null);

  const loadStudents = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/auth/students');
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [
        student.name,
        student.registerNumber,
        student.department,
        student.batch,
        student.hostelName,
        student.roomNumber,
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (next) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  return (
    <section id="hod-students-profile" className="wd-panel hod-students" aria-label="Students Profile">
      <div className="wd-panel-head">
        <div>
          <h2 className="wd-panel-title">Students Profile</h2>
          <p className="wd-panel-sub">View all hostel students and their details.</p>
        </div>
        <label className="wd-search">
          <IconSearch size={17} />
          <input
            type="search"
            placeholder="Search by student name..."
            aria-label="Search students"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {loading ? (
        <div className="wd-empty">Loading students…</div>
      ) : loadError ? (
        <div className="wd-empty hod-students-error" role="alert">
          <p>{loadError}</p>
          <button className="pcr-btn pcr-btn--cancel" type="button" onClick={loadStudents}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wd-empty">No students match this search.</div>
      ) : null}

      {!loading && !loadError && filtered.length > 0 ? (
        <>
          <div className="wd-table-wrap">
            <table className="wd-table hod-students-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Batch</th>
                  <th>Hostel</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((student, index) => (
                  <tr key={student._id}>
                    <td className="wd-mono">{startIndex + index + 1}</td>
                    <td>
                      <span className="hod-student-name">
                        <span className="pcr-avatar pcr-avatar--sm" aria-hidden="true">
                          {String(student.name || 'S').charAt(0).toUpperCase()}
                        </span>
                        <strong>{student.name || '—'}</strong>
                      </span>
                    </td>
                    <td>{valueOf(student.department)}</td>
                    <td>{yearLabel(student.year)}</td>
                    <td className="wd-mono">{valueOf(student.batch)}</td>
                    <td>{valueOf(student.hostelName || student.hostelBlock)}</td>
                    <td>
                      <button
                        className="wd-view-btn"
                        type="button"
                        onClick={() => setProfileId(student._id)}
                        aria-label={`View ${student.name || 'student'} profile`}
                      >
                        <IconEye size={15} />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hod-students-foot">
            <span className="hod-students-count">
              Showing {startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length} students
            </span>
            <div className="hod-students-pager" role="group" aria-label="Students pagination">
              <button
                className="hod-students-page-btn"
                type="button"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === currentPage ? 'hod-students-page-btn hod-students-page-btn--active' : 'hod-students-page-btn'}
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                className="hod-students-page-btn"
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </>
      ) : null}

      {profileId ? (
        <HodStudentProfileModal
          studentId={profileId}
          onClose={() => setProfileId(null)}
          onSaved={loadStudents}
        />
      ) : null}
    </section>
  );
}