// ---------------------------------------------------------------------------
// Month helpers shared by the HOD monthly download / delete feature.
//
// DATE CONVENTION IN THIS APPLICATION
// The student form sends an <input type="date"> value ("YYYY-MM-DD"). The
// backend stores it with `new Date(date)`, and JavaScript parses date-only ISO
// strings as UTC midnight. Every Outpass.date therefore sits exactly on
// `YYYY-MM-DD 00:00:00.000Z`.
//
// Because of that, a half-open UTC range is exact for this data:
//     2026-09-01T00:00:00.000Z <= date < 2026-10-01T00:00:00.000Z
// catches every September document, cannot catch an August document
// (2026-08-31T00:00:00.000Z < start) and cannot catch an October document
// (2026-10-01T00:00:00.000Z is excluded by the `<` bound). No local-timezone
// conversion is applied anywhere, so an IST deployment cannot shift the
// boundary by 5h30m and sweep a neighbouring month.
// ---------------------------------------------------------------------------

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const isValidMonth = (year, month) =>
  Number.isInteger(year) &&
  Number.isInteger(month) &&
  year >= 2000 &&
  year <= 2100 &&
  month >= 1 &&
  month <= 12;

/**
 * Exact half-open UTC month range: [startOfMonth, startOfNextMonth).
 */
export const buildMonthRange = (year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
};

/**
 * A month is "completed" once the current moment has passed its end boundary,
 * i.e. every day of that month is over. The current (running) month and any
 * future month are never completed. The year boundary is handled by comparing
 * real dates, so December 2026 stops being current the instant January 2027
 * begins (and stays deletable/exportable forever afterwards).
 */
export const isCompletedMonth = (year, month, now = new Date()) => {
  const { end } = buildMonthRange(year, month);
  return end.getTime() <= now.getTime();
};

export const monthLabel = (year, month) => `${MONTH_NAMES[month - 1]} ${year}`;

export const monthFileName = (year, month) =>
  `${MONTH_NAMES[month - 1]}-${year}-OutpassHistory.xlsx`;

/**
 * Lists completed months (most recent first) between the earliest completed
 * month and last month, so the UI can show empty completed months too.
 */
export const listCompletedMonths = (now = new Date(), earliestYear = 2024) => {
  const months = [];
  // Previous calendar month is the newest completed month.
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 1..12 => previous month when used as index+... see below
  if (month === 0) {
    year -= 1;
    month = 12;
  }

  while (year > earliestYear || (year === earliestYear && month >= 1)) {
    months.push({
      year,
      month,
      label: monthLabel(year, month),
    });

    month -= 1;
    if (month === 0) {
      year -= 1;
      month = 12;
    }
  }

  return months;
};

export const formatDateForExport = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getUTCDate()).padStart(2, '0')}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}-${date.getUTCFullYear()}`;
};

export const formatTimeForExport = (value) => {
  const [hourText, minuteText] = String(value || '').split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return String(value || '');
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
};
