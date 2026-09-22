import { useState } from 'react';
import AlertBanner from './AlertBanner';
import TimeField12 from './TimeField12';
import { todayIST } from '../utils/timeFormat';

// Manually selected weekdays — the student picks the day; it is never
// derived from the selected date (no UTC/getDay conversion anywhere).
const WEEKDAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ApplyOutpassForm({
  user,
  form,
  onChange,
  onSubmit,
  saving,
  error,
  success,
  selectedRequest,
  onCancelEdit,
}) {
  // The <input type="date"> popup (the calendar in the screenshot) disables
  // and greys out every date before its "min" value — past dates cannot be
  // clicked, selected, or populate the input.
  const minOutDate = todayIST();
  // Return Date honours BOTH rules: never before today, and never before the
  // selected Out Date (existing same-day-or-later rule preserved).
  const minReturnDate =
    form.date && form.date > minOutDate ? form.date : minOutDate;

  // Current time-of-day in IST as minutes since midnight (same +05:30 shift
  // used everywhere else in the app — never a raw UTC comparison).
  const minutesOfDayIST = () => {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return ist.getUTCHours() * 60 + ist.getUTCMinutes();
  };

  // Actual calendar weekday (0=Sunday..6=Saturday) of a "YYYY-MM-DD" date.
  // Computed from the calendar date itself (UTC-anchored at noon, so the
  // weekday is the same in every timezone) — never from the student's
  // selected day value.
  const weekdayOfDate = (dateStr) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dateStr || ''));
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
    return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
  };

  const WEEKDAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

  const [validationError, setValidationError] = useState('');

  // Finished-time / past-date validation: an outpass whose Out Date is today
  // and whose Out Time has already passed cannot be submitted, and neither
  // can one with a past Out Date (the calendar blocks both in the UI — this
  // is the submit-time safety net with a clear message).
  const handleSubmit = (event) => {
    const outDate = form.date;

    if (outDate && outDate < minOutDate) {
      event.preventDefault();
      setValidationError('Out Date cannot be in the past.');
      return;
    }

    if (outDate === minOutDate && form.outTime) {
      const [outHour, outMinute] = String(form.outTime).split(':').map(Number);
      const outMinutes = outHour * 60 + outMinute;
      if (!Number.isNaN(outMinutes) && outMinutes < minutesOfDayIST()) {
        event.preventDefault();
        setValidationError('You cannot apply outpass for finished time.');
        return;
      }
    }

    // Day/date validation — Out Date + Out Day and Return Date + Return Day
    // are each validated independently against the ACTUAL calendar weekday.
    // A mismatched selection blocks the submission until corrected.
    if (outDate && form.outDay) {
      const actualWeekday = weekdayOfDate(outDate);
      if (actualWeekday !== null && WEEKDAY_INDEX[form.outDay] !== actualWeekday) {
        event.preventDefault();
        setValidationError('Select the correct day/date');
        return;
      }
    }
    if (form.returnDate && form.returnDay) {
      const actualWeekday = weekdayOfDate(form.returnDate);
      if (actualWeekday !== null && WEEKDAY_INDEX[form.returnDay] !== actualWeekday) {
        event.preventDefault();
        setValidationError('Select the correct day/date');
        return;
      }
    }

    setValidationError('');
    onSubmit(event);
  };

  const handleOutDateChange = (event) => {
    onChange(event);
    setValidationError('');
    // Keep Return Date >= Out Date when the Out Date moves forward.
    const outDate = event.target.value;
    if (outDate && form.returnDate && form.returnDate < outDate) {
      onChange({ target: { name: 'returnDate', value: outDate } });
    }
  };

  return (
    <form className="apply-form" onSubmit={handleSubmit}>
      <fieldset className="apply-fieldset">
        <legend>Student details</legend>
        <div className="apply-grid apply-grid--2">
          <label>
            Name
            <input value={user?.name || ''} readOnly />
          </label>
          <label>
            Department
            <input value={user?.department || ''} readOnly />
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Year
            <input value={user?.year || ''} readOnly />
          </label>
          <label>
            Request Type
            <select name="requestType" value={form.requestType} onChange={onChange} required disabled={saving}>
              <option value="Outing">Outing</option>
              <option value="Home">Home</option>
            </select>
          </label>
        </div>
        <p className="apply-hint">
          {form.requestType === 'Home'}
        </p>
      </fieldset>

      <fieldset className="apply-fieldset">
        <legend>Visit schedule</legend>
        <div className="apply-grid apply-grid--2">
          <label>
            Request/Out Date
            <input
              name="date"
              type="date"
              min={minOutDate}
              value={form.date}
              onChange={handleOutDateChange}
              required
              disabled={saving}
            />
          </label>
          <label>
            Out Day
            {/* Manually selected weekday — never derived from the date. */}
            <select name="outDay" value={form.outDay || ''} onChange={(event) => { setValidationError(''); onChange(event); }} required disabled={saving}>
              <option value="" disabled>Select day</option>
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Return Date
            <input
              name="returnDate"
              type="date"
              min={minReturnDate}
              value={form.returnDate || ''}
              onChange={onChange}
              required
              disabled={saving}
            />
          </label>
          <label>
            Return Day
            <select name="returnDay" value={form.returnDay || ''} onChange={(event) => { setValidationError(''); onChange(event); }} required disabled={saving}>
              <option value="" disabled>Select day</option>
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Out Time
            {/* 12-hour picker (1-12 + AM/PM). Still stores the same
                internal 24-hour "HH:MM" value the backend expects. */}
            <TimeField12
              name="outTime"
              label="Out Time"
              value={form.outTime}
              onChange={(event) => {
                setValidationError('');
                onChange(event);
              }}
              required
              disabled={saving}
            />
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Return Time
            <TimeField12
              name="returnTime"
              label="Return Time"
              value={form.returnTime}
              onChange={onChange}
              required
              disabled={saving}
            />
          </label>
          <label>
            Destination
            <input name="destination" value={form.destination || ''} onChange={onChange} placeholder="Destination" disabled={saving} />
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Reason
            <input
              name="reason"
              value={form.reason}
              onChange={onChange}
              placeholder="Reason for outpass"
              required
              disabled={saving}
            />
          </label>
        </div>
      </fieldset>

      <AlertBanner type="error" message={validationError || error} />
      <AlertBanner type="success" message={success} />

      <div className="button-row apply-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Submitting...' : selectedRequest ? 'Reapply Request' : 'Submit Request'}
        </button>
        {selectedRequest ? (
          <button className="secondary-button" type="button" onClick={onCancelEdit} disabled={saving}>
            Cancel Edit
          </button>
        ) : null}
      </div>
    </form>
  );
}
