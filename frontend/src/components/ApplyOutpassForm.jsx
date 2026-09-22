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

  const handleOutDateChange = (event) => {
    onChange(event);
    // Keep Return Date >= Out Date when the Out Date moves forward.
    const outDate = event.target.value;
    if (outDate && form.returnDate && form.returnDate < outDate) {
      onChange({ target: { name: 'returnDate', value: outDate } });
    }
  };

  return (
    <form className="apply-form" onSubmit={onSubmit}>
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
            <select name="outDay" value={form.outDay || ''} onChange={onChange} required disabled={saving}>
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
            <select name="returnDay" value={form.returnDay || ''} onChange={onChange} required disabled={saving}>
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
              onChange={onChange}
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

      <AlertBanner type="error" message={error} />
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
