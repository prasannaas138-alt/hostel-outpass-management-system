import AlertBanner from './AlertBanner';

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
          {form.requestType === 'Home'
            ? 'Home requests need HOD, Sister and Warden approval.'
            : 'Outing requests are allowed only on weekends and need Warden approval.'}
        </p>
      </fieldset>

      <fieldset className="apply-fieldset">
        <legend>Visit schedule</legend>
        <div className="apply-grid apply-grid--2">
          <label>
            Date
            <input name="date" type="date" value={form.date} onChange={onChange} required disabled={saving} />
          </label>
          <label>
            Out Time
            <input name="outTime" type="time" value={form.outTime} onChange={onChange} required disabled={saving} />
          </label>
        </div>
        <div className="apply-grid apply-grid--2">
          <label>
            Return Time
            <input name="returnTime" type="time" value={form.returnTime} onChange={onChange} required disabled={saving} />
          </label>
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
