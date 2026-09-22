/**
 * Time formatting utilities for H.O.M.S.
 * Converts 24-hour time strings (HH:MM) to 12-hour AM/PM format for display.
 */

/**
 * Converts a 24-hour time string (HH:MM) to 12-hour AM/PM format.
 * @param {string} time24 - Time string in 24-hour format (HH:MM or HH:MM:SS)
 * @returns {string} Time in 12-hour format (e.g., "8:00 AM", "6:30 PM") or '—' if invalid/empty
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '—';
  
  const timeStr = String(time24).trim();
  if (!timeStr) return '—';
  
  // Handle both HH:MM and HH:MM:SS formats
  const timeParts = timeStr.split(':');
  if (timeParts.length < 2) return timeStr;
  
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  
  if (isNaN(hours)) return timeStr;
  
  const isAM = hours < 12;
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  
  return `${displayHours}:${minutes} ${isAM ? 'AM' : 'PM'}`;
};

/**
 * Formats a time range (outTime - returnTime) in 12-hour format.
 * @param {string} outTime - Out time in 24-hour format
 * @param {string} returnTime - Return time in 24-hour format
 * @returns {string} Formatted time range (e.g., "8:00 AM - 6:00 PM")
 */
export const formatTimeRange = (outTime, returnTime) => {
  const out = formatTime12Hour(outTime);
  const ret = formatTime12Hour(returnTime);
  if (out === '—' && ret === '—') return '—';
  if (out === '—') return ret;
  if (ret === '—') return out;
  return `${out} - ${ret}`;
};

/**
 * Legacy compatibility - returns time as-is or '—' for backward compatibility.
 * @deprecated Use formatTime12Hour instead
 */
export const formatTime = (value) => value || '—';

/**
 * Normalizes any time value that may be stored in MongoDB ("HH:MM",
 * "HH:MM:SS", or a legacy 12-hour string such as "9:47 AM") to the
 * 24-hour "HH:MM" format the outpass form and backend expect.
 * Returns "" when the value cannot be understood, so the student must
 * re-pick the time instead of silently submitting an invalid one.
 */
export const normalizeTo24Hour = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!m) return '';
  let hour = parseInt(m[1], 10);
  const minute = m[2] !== undefined ? String(parseInt(m[2], 10)).padStart(2, '0') : '00';
  const period = (m[4] || '').toLowerCase();
  if (Number.isNaN(hour) || parseInt(minute, 10) > 59) return '';
  if (period) {
    if (hour < 1 || hour > 12) return '';
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return '';
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

/**
 * Formats an outpass date (YYYY-MM-DD or full ISO string) as a short
 * readable date, e.g. "9/13/2026". Safe against missing/invalid values.
 * Used by the Outpass Details slip for Request/Out Date and Return Date.
 */
export const formatOutpassDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};