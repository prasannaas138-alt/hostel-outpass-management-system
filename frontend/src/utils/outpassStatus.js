/**
 * Student-facing status helpers for the H.O.M.S Student Portal.
 * Maps the backend approval trail (status / hodStatus / sisterStatus /
 * wardenStatus) to friendly labels and design-system badge classes.
 *
 * Home flow:  Waiting for Sister Approval -> Waiting for Warden Approval -> Approved
 * Outing flow: Waiting for Warden Approval -> Approved
 * Expired approved outings read as "Approved - Expired".
 */

// An approved Outing past its issued window reads as "Approved - Expired".
const isApprovedOutingExpired = (request) => {
  if (!request || request.requestType !== 'Outing') {
    return false;
  }

  const wasApproved =
    request.status === 'Approved' ||
    request.status === 'Expired' ||
    request.wardenStatus === 'Approved';

  if (!wasApproved) {
    return false;
  }

  if (request.expiresAt) {
    return new Date(request.expiresAt).getTime() <= Date.now();
  }

  // Fallback: compute from date + returnTime if expiresAt is missing.
  if (request.date && request.returnTime) {
    const [returnHour, returnMinute] = String(request.returnTime).split(':').map(Number);
    const expiry = new Date(request.date);
    expiry.setHours(returnHour || 0, returnMinute || 0, 0, 0);
    return expiry.getTime() <= Date.now();
  }

  return false;
};

export const getDisplayStatus = (request) => {
  if (!request) {
    return 'Pending';
  }

  if (request.requestType === 'Outing' && isApprovedOutingExpired(request)) {
    return 'Approved - Expired';
  }

  switch (request.status) {
    case 'Approved':
      return 'Approved';
    case 'Rejected':
      return 'Rejected';
    case 'Expired':
      return request.wardenStatus === 'Approved' ? 'Approved - Expired' : 'Expired';
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
    case 'Approved - Expired':
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
  return request.requestType === 'Outing' && isApprovedOutingExpired(request);
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
    return display === 'Waiting for Sister Approval' || display === 'Waiting for Warden Approval';
  }
  return display === filter;
};