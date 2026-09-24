export const MANUAL_REPORT_VALUES = new Set(['Returned', 'Not Returned']);

const automaticMovementReport = (movement, now = new Date()) => {
  if (!movement) return null;
  if (movement.state === 'RETURNED') return 'Returned';
  if (movement.state === 'OUTSIDE') {
    return movement.expectedReturnAt && new Date(movement.expectedReturnAt).getTime() <= now.getTime()
      ? 'Overdue'
      : 'Outside';
  }
  return null;
};

// A missing flag on a legacy Movement means its existing non-null report was
// created by the previous Warden editor and must remain a manual override. New
// automatic reports are derived at read time and do not overwrite `report`.
export const hasManualReport = (movement) => (
  movement?.reportManuallySet === true ||
  (movement?.reportManuallySet == null && Boolean(movement?.report))
);

export const resolveEffectiveReport = (movement, outpass = null, now = new Date()) => {
  if (hasManualReport(movement) && MANUAL_REPORT_VALUES.has(movement.report)) {
    return movement.report;
  }

  return automaticMovementReport(movement, now) || outpass?.status || 'Pending';
};
