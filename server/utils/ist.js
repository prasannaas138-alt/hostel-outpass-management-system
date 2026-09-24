// ---------------------------------------------------------------------------
// IST (Asia/Kolkata, +05:30) schedule helpers for H.O.M.S.
//
// WHY THIS MODULE EXISTS
// Every schedule in this project is Indian Standard Time wall time: Outpass
// `date` / `returnDate` are calendar days and `outTime` / `returnTime` are
// "HH:MM" clock times. IST has no daylight saving, so ONE fixed +05:30 offset
// is exact all year round.
//
// The only correct way to turn such a schedule into an absolute instant is an
// ISO string with an EXPLICIT offset:
//     "2026-09-23T09:00:00+05:30"  ->  2026-09-23T03:30:00.000Z
// Anything built from the SERVER's local timezone - for example
// `new Date(`${day}T00:00:00`)` followed by `setHours(hour, minute)` - silently
// produces a different instant on every host: on a UTC host 09:00 IST used to
// be read as 09:00 UTC, i.e. 5h30m too late. Nothing in this module may depend
// on process.env.TZ or the server timezone.
//
// STORED SHAPES TOLERATED (legacy data included):
//   date / returnDate  : Date object (the UTC-midnight "floating" calendar day
//                        this project stores), "YYYY-MM-DD", or a full ISO string
//   outTime/returnTime : "HH:MM", "HH:MM:SS", or a legacy 12-hour string such as
//                        "9:47 AM" / "12:05 pm"
//
// RETURN CONTRACTS
//   toDateOnlyString / to24HourString -> '' when the value cannot be understood
//   buildIstInstant                   -> null when the day OR the time is unusable
//   resolveExpectedInstants           -> a Date, or null, for EACH instant, so a
//                                        caller can never mistake "no usable
//                                        schedule" for a valid timestamp. Scan
//                                        validation must treat null as "refuse
//                                        the scan", never as "no restriction".
// ---------------------------------------------------------------------------

export const IST_OFFSET = '+05:30';

// Local formatting primitive. Not exported on purpose: the caller keeps its own
// copy for its expiry construction, while every IST rule in this project (day
// shape, time shape, offset) lives only in this file.
const pad2 = (value) => String(value).padStart(2, '0');

// Normalizes any date shape actually stored in MongoDB ("YYYY-MM-DD",
// full ISO string, or a Date object) to the "YYYY-MM-DD" calendar day in IST.
// Shifting +05:30 and then reading the UTC parts yields the Indian calendar day
// both for the stored UTC-midnight days and for real instants, and it never
// depends on the server or browser timezone.
export const toDateOnlyString = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const ist = new Date(value.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? '' : toDateOnlyString(parsed);
};

// Normalizes the time shapes actually stored in MongoDB to 24-hour "HH:MM".
// Handles "HH:MM", "HH:MM:SS" and legacy 12-hour strings like "9:47 AM" /
// "12:05 pm". Returns '' when the value cannot be understood.
export const to24HourString = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!m) return '';
  let hour = Number.parseInt(m[1], 10);
  const minute = m[2] !== undefined ? Number.parseInt(m[2], 10) : 0;
  const period = (m[4] || '').toLowerCase();
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return '';
  if (period) {
    if (hour < 1 || hour > 12) return '';
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return '';
  }
  return `${pad2(hour)}:${pad2(minute)}`;
};

// Builds the absolute instant of ONE IST wall-clock moment.
// `dateOnly` must already be "YYYY-MM-DD" (see toDateOnlyString) and `time24`
// must already be "HH:MM" (see to24HourString). Anything else returns null, so
// an unparsable legacy value can never silently become a valid timestamp.
export const buildIstInstant = (dateOnly, time24) => {
  const day = String(dateOnly || '').trim();
  const time = String(time24 || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const instant = new Date(`${day}T${time}:00${IST_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
};

// Resolves an approved Outpass into the two REAL instants the movement feature
// needs (Phase 1 movement design):
//   expectedExitAt   = Out Date  + Out Time      (IST)
//   expectedReturnAt = Return Date + Return Time (IST)
//
// Both sides are resolved INDEPENDENTLY: a broken return time must never hide a
// usable exit time, and vice versa - the caller reports the unusable side.
//
// For legacy records without a returnDate the return day falls back to the out
// day, exactly like buildExpiresAt() in the outpass controller and the
// frontend's `returnDate || date` display already do.
export const resolveExpectedInstants = (outpass) => {
  const schedule = outpass || {};

  const expectedExitAt = buildIstInstant(
    toDateOnlyString(schedule.date),
    to24HourString(schedule.outTime)
  );

  const expectedReturnAt = buildIstInstant(
    toDateOnlyString(schedule.returnDate) || toDateOnlyString(schedule.date),
    to24HourString(schedule.returnTime)
  );

  return { expectedExitAt, expectedReturnAt };
};
