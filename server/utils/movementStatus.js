// ---------------------------------------------------------------------------
// MOVEMENT STATUS — the single source of truth for the human readable status.
//
// The database keeps storing exactly what it already stores: the two movement
// states declared by the Movement model ('OUTSIDE' | 'RETURNED') plus the
// immutable `lateReturn` audit fact that the RETURN scan writes from the
// SERVER clock (movementService.scanReturnGate: actualReturnAt > expectedReturnAt).
// Nothing is migrated and no field is duplicated in MongoDB — the third,
// display-only status "Late Returned" is DERIVED here at read time so every
// surface (live snapshot, realtime socket payload, outpass payload, history
// tables) shows the same wording with the same colour key:
//
//   state OUTSIDE                        -> 'Outside'       (amber, unchanged)
//   state RETURNED  + lateReturn !== true -> 'Returned'     (green, unchanged)
//   state RETURNED  + lateReturn === true -> 'Late Returned' (red, new)
//
// `lateReturn` itself is never recalculated here and the expected-return
// comparison is NOT duplicated: the RETURN scan already decided it on the
// server, so the exact boundary (actualReturnAt == expectedReturnAt) is
// "Returned", never "Late Returned".
// ---------------------------------------------------------------------------

export const MOVEMENT_STATUS_OUTSIDE = 'Outside';
export const MOVEMENT_STATUS_RETURNED = 'Returned';
export const MOVEMENT_STATUS_LATE_RETURNED = 'Late Returned';

// CSS modifiers for the status pill: outside / returned / late-returned.
const STATUS_KEYS = {
  [MOVEMENT_STATUS_OUTSIDE]: 'outside',
  [MOVEMENT_STATUS_RETURNED]: 'returned',
  [MOVEMENT_STATUS_LATE_RETURNED]: 'late-returned',
};

/**
 * Derives the display status of one movement document (or of one movement
 * payload slice). Returns null when the movement does not exist yet, which is
 * "approved but has not exited" — that state has no document by design.
 */
export const resolveMovementStatus = (movement) => {
  if (!movement?.state) return null;
  if (movement.state === 'OUTSIDE') return MOVEMENT_STATUS_OUTSIDE;
  if (movement.state === 'RETURNED') {
    return movement.lateReturn === true ? MOVEMENT_STATUS_LATE_RETURNED : MOVEMENT_STATUS_RETURNED;
  }
  return null;
};

/**
 * Machine key for the same status, so the frontend never has to re-implement
 * the mapping to pick a colour.
 */
export const resolveMovementStatusKey = (movement) => STATUS_KEYS[resolveMovementStatus(movement)] || '';
