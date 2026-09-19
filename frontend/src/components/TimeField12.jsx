/**
 * TimeField12 — shared 12-hour time picker (hour 1-12 + minutes + AM/PM)
 * used for BOTH Out Time and Return Time on the outpass application form.
 *
 * Internally it still stores the exact same 24-hour "HH:MM" string the
 * backend, expiry calculation, and PDF generation already expect, so no
 * database/storage/workflow change is involved — only the picker UI is
 * 12-hour. Conversions:
 *   8:00 AM  -> "08:00"      6:00 PM -> "18:00"
 *   12:00 AM -> "00:00"      12:00 PM -> "12:00"
 *
 * Every select change re-composes and emits the full 24-hour value
 * through onChange({ target: { name, value } }), which fixes the old
 * native <input type="time"> problem where the value could stay stuck
 * on mobile browsers when only part of the control was changed.
 */
const pad = (value) => String(value).padStart(2, '0');
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => pad(index));

// "18:00" -> { hour: 6, minute: '00', period: 'PM' }
const parse24 = (value) => {
  const [rawHour, rawMinute] = String(value || '').split(':');
  const hour24 = parseInt(rawHour, 10);
  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) {
    return { hour: 8, minute: '00', period: 'AM' };
  }
  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: rawMinute !== undefined && rawMinute !== '' ? pad(parseInt(rawMinute, 10)) : '00',
    period: hour24 < 12 ? 'AM' : 'PM',
  };
};

// (6, '00', 'PM') -> "18:00"; (12, '00', 'AM') -> "00:00"; (12, '00', 'PM') -> "12:00"
const to24 = (hour, minute, period) => {
  const base = hour % 12;
  const hour24 = period === 'AM' ? base : base + 12;
  return `${pad(hour24)}:${minute}`;
};

export default function TimeField12({ name, label, value, onChange, required, disabled }) {
  const parsed = parse24(value);

  const emit = (hour, minute, period) => {
    onChange({ target: { name, value: to24(hour, minute, period) } });
  };

  return (
    <div className="time-field">
      <div className="time-field__controls">
        <select
          aria-label={`${label} hour (1-12)`}
          value={parsed.hour}
          onChange={(event) => emit(Number(event.target.value), parsed.minute, parsed.period)}
          required={required}
          disabled={disabled}
        >
          {HOUR_OPTIONS.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
        <select
          aria-label={`${label} minutes`}
          value={parsed.minute}
          onChange={(event) => emit(parsed.hour, event.target.value, parsed.period)}
          required={required}
          disabled={disabled}
        >
          {MINUTE_OPTIONS.map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
        <select
          aria-label={`${label} AM or PM`}
          value={parsed.period}
          onChange={(event) => emit(parsed.hour, parsed.minute, event.target.value)}
          required={required}
          disabled={disabled}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
