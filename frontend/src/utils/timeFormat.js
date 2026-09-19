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