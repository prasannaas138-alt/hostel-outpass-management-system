import AlertBanner from './AlertBanner';
import TimeField12 from './TimeField12';

export default function ApplyOutpassForm({
  user,
  form,
  onChange,
  onSubmit,
  saving,
  error,
  success,
  isOutgoingWeekendValid,
  selectedRequest,
  onCancelEdit,
}) {
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
            <input name="date" type="date" value={form.date} onChange={onChange} required disabled={saving} />
          </label>
          <label>
            Return Date
            <input name="returnDate" type="date" value={form.returnDate || ''} onChange={onChange} required disabled={saving} />
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
        {form.requestType === 'Outing' && form.date && !isOutgoingWeekendValid ? (
          <div className="inline-note inline-note--warning">Outing requests are allowed only on weekends.</div>
        ) : null}
      </fieldset>

      <AlertBanner type="error" message={error} />
      <AlertBanner type="success" message={success} />

      <div className="button-row apply-actions">
        <button className="primary-button" type="submit" disabled={saving || !isOutgoingWeekendValid}>
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
