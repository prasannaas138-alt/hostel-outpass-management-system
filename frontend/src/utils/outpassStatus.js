/**
 * Student-facing status helpers for the H.O.M.S Student Portal.
 * Maps the backend approval trail (status / hodStatus / sisterStatus /
 * wardenStatus) to friendly labels and design-system badge classes.
 *
 * Home flow:  Waiting for Sister Approval -> Waiting for Warden Approval -> Approved
 * Outing flow: Waiting for Warden Approval -> Approved
 * Any approved outpass (Home or Outing) expires after Return Date + Return Time.
 */
import { normalizeTo24Hour } from './timeFormat';

// Expiry instant (ms) computed from Return Date + Return Time in IST.
// Returns null when the record has no usable return schedule.
// 12-hour legacy strings ("6:00 AM") are normalized via normalizeTo24Hour.
const computeReturnExpiryMs = (request) => {
  const returnDate = request.returnDate || request.date;
  if (!returnDate || !request.returnTime) {
    return null;
  }
  const time24 = normalizeTo24Hour(request.returnTime);
  if (!time24) {
    return null;
  }
  const dateStr = String(returnDate).slice(0, 10); // date part only
  const expiry = new Date(`${dateStr}T${time24}:00+05:30`);
  return Number.isNaN(expiry.getTime()) ? null : expiry.getTime();
};

// Check if an approved outpass (Home or Outing) has passed its return datetime.
const isApprovedExpired = (request) => {
  if (!request) {
    return false;
  }

  // Only check expiration for approved outpasses
  const wasApproved =
    request.status === 'Approved' ||
    request.status === 'Expired' ||
    request.wardenStatus === 'Approved';

  if (!wasApproved) {
    return false;
  }

  // RULE: current IST datetime >= Return Date + Return Time => EXPIRED.
  // The return schedule is the source of truth — a stale or incorrect
  // expiresAt (legacy records) must never keep an outpass "Approved"
  // after its return time.
  const returnExpiryMs = computeReturnExpiryMs(request);
  if (returnExpiryMs !== null) {
    return returnExpiryMs <= Date.now();
  }

  // Fallback: backend-computed expiresAt when no return schedule is available.
  if (request.expiresAt) {
    return new Date(request.expiresAt).getTime() <= Date.now();
  }

  return false;
};

// Legacy function name for backward compatibility
const isApprovedOutingExpired = isApprovedExpired;

export const getDisplayStatus = (request) => {
  if (!request) {
    return 'Pending';
  }

  // Check if an approved outpass has expired (both Home and Outing)
  if (isApprovedExpired(request)) {
    return 'Expired';
  }

  switch (request.status) {
    case 'Approved':
      return 'Approved';
    case 'Rejected':
      return 'Rejected';
    case 'Expired':
      return 'Expired';
    default:
      break;
  }

  // Still pending — tell the student who is holding the request.
  if (request.requestType === 'Outing') {
    return 'Waiting for Warden Approval';
  }
  if (request.sisterStatus === 'Approved') {
    return 'Waiting for Warden Approval';
  }
  return 'Waiting for Sister Approval';
};

export const getStatusClass = (request) => {
  const display = getDisplayStatus(request);

  switch (display) {
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'Expired':
      return 'expired';
    case 'Waiting for Warden Approval':
      return 'waiting-warden';
    case 'Waiting for Sister Approval':
      return 'waiting-sister';
    default:
      return 'pending';
  }
};

export const isExpiredRequest = (request) => {
  if (!request) {
    return false;
  }
  if (request.status === 'Expired') {
    return true;
  }
  return isApprovedExpired(request);
};

// The approved PDF may only be downloaded while the outpass is still valid.
export const canDownloadPdf = (request) => getDisplayStatus(request) === 'Approved';

// Status-filter chip matcher for the My Requests section.
export const matchesStatusFilter = (request, filter) => {
  if (!filter || filter === 'All') {
    return true;
  }
  const display = getDisplayStatus(request);
  if (filter === 'Pending') {
    return display === 'Waiting for HOD Approval' || display === 'Waiting for Sister Approval' || display === 'Waiting for Warden Approval';
  }
  if (filter === 'Expired') {
    return display === 'Expired';
  }
  return display === filter;
};