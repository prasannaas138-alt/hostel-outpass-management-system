import Gate, { GATE_TOKEN_PREFIX } from '../models/Gate.js';
import Movement from '../models/Movement.js';
import Outpass from '../models/Outpass.js';
import ScanLog from '../models/ScanLog.js';
import { resolveExpectedInstants } from '../utils/ist.js';

// ---------------------------------------------------------------------------
// Movement scan service - EXIT + RETURN on the same permanent gate QR.
//
// The student scans the PERMANENT GATE QR. The QR identifies the GATE only, so
// every fact about the student, the outpass and the timing comes from the
// authenticated JWT and the database. The request body contributes exactly one
// value: the QR payload string.
//
// The single scan endpoint dispatches on the student's open movement:
//   Scan #1 = EXIT   (no open movement  -> create the movement, state OUTSIDE)
//   Scan #2 = RETURN (one open movement -> close it, state RETURNED)
//   Scan #3 = reject (no open movement, last movement RETURNED -> ALREADY_SCANNED)
//
// Source-of-truth rules:
//   - `now` is always `new Date()` on the SERVER. A device clock or a client
//     supplied timestamp is never read, so a phone with a wrong clock cannot
//     move the window.
//   - The Movement document is the authoritative movement record. The Outpass
//     is only READ here - no approval, expiry or movement field is ever written
//     to it.
//   - "Too early" and "no longer usable" are decided from
//     resolveExpectedInstants(outpass) - the shared IST resolver - never from
//     the server's local timezone and never from a frontend value.
//   - Expected RETURN never blocks RETURN: a late student still returns
//     successfully with lateReturn=true.
//
// The rejection table below is the single source of truth for
// reason -> HTTP status -> student facing message. Every reason code already
// exists in server/models/ScanLog.js, so no new reason was invented.
// ---------------------------------------------------------------------------

export const SUCCESS_MESSAGE = 'Exit recorded. You are now marked as outside.';
export const RETURN_SUCCESS_MESSAGE = 'Return recorded. You are now marked as inside.';
export const RETURN_LATE_SUCCESS_MESSAGE =
  'Return recorded. You are now marked as inside. You returned after the expected time.';

const REJECTIONS = {
  INVALID_GATE_TOKEN: {
    status: 400,
    message: 'This is not a valid H.O.M.S. gate QR code.',
  },
  GATE_INACTIVE: {
    status: 409,
    message: 'This gate is currently closed. Please use another gate or contact the warden.',
  },
  NO_APPROVED_OUTPASS: {
    status: 403,
    message: 'You do not have an approved outpass right now.',
  },
  WINDOW_UNRESOLVABLE: {
    status: 409,
    message: 'This outpass has no usable time window. Please contact the warden.',
  },
  TIME_NOT_STARTED: {
    status: 409,
    message: 'Your time is not yet started.',
  },
  NO_EXIT_RECORDED: {
    status: 409,
    message: 'No exit was recorded for this outpass.',
  },
  OUTPASS_NOT_USABLE: {
    status: 409,
    message: 'This outpass can no longer be used.',
  },
  ALREADY_OUTSIDE: {
    status: 409,
    message: 'You are already marked as outside.',
  },
  ALREADY_SCANNED: {
    status: 409,
    message: 'You already scanned the QR.',
  },
};

// Builds the serializable rejection result. It deliberately carries only
// student-safe fields - internal documents never leave the service.
const rejection = (reason, extra = {}) => ({
  ok: false,
  action: extra.action || 'EXIT',
  reason,
  httpStatus: REJECTIONS[reason].status,
  message: REJECTIONS[reason].message,
  ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'action')),
});

// "HOMS1:<token>" -> "<token>", or null when the payload is not a H.O.M.S. gate
// code at all (a foreign QR, a URL, a student badge, ...).
const parseGateToken = (qrPayload) => {
  if (typeof qrPayload !== 'string') return null;
  const value = qrPayload.trim();
  if (!value.startsWith(GATE_TOKEN_PREFIX)) return null;
  const token = value.slice(GATE_TOKEN_PREFIX.length).trim();
  // The stored token is 32 random bytes as base64url (43 chars today). The
  // range keeps this guard valid if a later phase rotates longer tokens while
  // still rejecting obviously malformed values.
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  return token;
};

// Picks the one approved outpass this EXIT scan can belong to.
//
// The student never sends an outpass id, so the choice is made here, from the
// database, using the project's existing approval semantics (the Warden approval
// is what sets status 'Approved'; a legacy record carrying
// wardenStatus 'Approved' counts as approved too, exactly like the frontend's
// getDisplayStatus does).
//
// Returns { entry } on success, or { rejection, logContext } when the scan must
// be refused. `entry` = { outpass, expectedExitAt, expectedReturnAt }.
const findUsableApprovedOutpass = async (studentId, now) => {
  const candidates = await Outpass.find({
    studentId,
    $or: [
      { status: 'Approved' },
      { wardenStatus: 'Approved', status: { $nin: ['Rejected', 'Expired'] } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!candidates.length) {
    return { rejection: rejection('NO_APPROVED_OUTPASS'), logContext: {} };
  }

  const resolved = candidates
    .map((outpass) => ({ outpass, ...resolveExpectedInstants(outpass) }))
    .filter((entry) => entry.expectedExitAt && entry.expectedReturnAt);

  if (!resolved.length) {
    // An approved outpass exists but its schedule cannot be parsed. Fail closed:
    // never guess a window (a guessed window could let a student out early).
    const outpass = candidates[0];
    return {
      rejection: rejection('WINDOW_UNRESOLVABLE', { outpassId: outpass.outpassId || '' }),
      logContext: { outpass: outpass._id, outpassId: outpass.outpassId || '' },
    };
  }

  // Deterministic: earliest window first.
  const byExitAsc = [...resolved].sort((left, right) => left.expectedExitAt - right.expectedExitAt);
  const started = byExitAsc.filter((entry) => now.getTime() >= entry.expectedExitAt.getTime());
  const startedAndOpen = started.filter((entry) => now.getTime() < entry.expectedReturnAt.getTime());

  if (startedAndOpen.length) {
    return { entry: startedAndOpen[0] };
  }

  const contextOf = (entry) => ({ outpass: entry.outpass._id, outpassId: entry.outpass.outpassId || '' });
  const timingOf = (entry) => ({
    expectedExitAt: entry.expectedExitAt,
    expectedReturnAt: entry.expectedReturnAt,
  });

  if (started.length) {
    // Every started outpass is already past its expected return time. The EXIT
    // window closes at that deadline - the same instant the existing 'Expired'
    // rule uses - and the most recently closed one is the useful message.
    const latest = started.reduce((left, right) =>
      left.expectedReturnAt > right.expectedReturnAt ? left : right
    );
    return {
      rejection: rejection('OUTPASS_NOT_USABLE', {
        outpassId: latest.outpass.outpassId || '',
        ...timingOf(latest),
      }),
      logContext: contextOf(latest),
    };
  }

  // Nothing has started yet: report the soonest window.
  const soonest = byExitAsc[0];
  return {
    rejection: rejection('TIME_NOT_STARTED', {
      outpassId: soonest.outpass.outpassId || '',
      ...timingOf(soonest),
    }),
    logContext: contextOf(soonest),
  };
};

// Append-only audit write. A failure here must never break a legitimate scan
// (the Movement is the source of truth), so it is logged and swallowed.
const recordScan = async (document) => {
  try {
    return await ScanLog.create(document);
  } catch (error) {
    console.error('Failed to write movement scan log:', error.message);
    return null;
  }
};

// POST /api/movements/scan - EXIT when no movement is open, RETURN otherwise.
// The same permanent gate QR drives both physical actions. After QR + gate
// validation the server looks for the student's open movement:
//   none open -> EXIT flow (validate the approved outpass window, create
//               exactly one Movement with state OUTSIDE)
//   one open  -> RETURN flow (close that movement atomically, state RETURNED)
// Every rejection is written to ScanLog, which stays append-only.
// Returns a serializable result: { ok: true, ...movement info } or a rejection.
export const scanExitGate = async ({ student, qrPayload, deviceInfo = '' }) => {
  // Server clock only - never a device or client supplied timestamp.
  const now = new Date();

  const attempt = {
    action: 'EXIT',
    occurredAt: now,
    deviceInfo,
    student: student?._id || null,
    registerNumber: student?.registerNumber || '',
    studentName: student?.name || '',
  };

  // Pre-dispatch best-effort label: a scan that would be a RETURN (student is
  // OUTSIDE) should still be audited as action RETURN when the QR or gate
  // check fails before the dispatch below.
  let openForRejectAction = null;
  try {
    if (student?._id) {
      openForRejectAction = await Movement.findOne({
        student: student._id,
        state: 'OUTSIDE',
        actualReturnAt: null,
      })
        .select('_id')
        .lean();
    }
  } catch {
    openForRejectAction = null;
  }
  const actionForGateReject = openForRejectAction ? 'RETURN' : attempt.action;

  // 2. the QR payload must be a H.O.M.S. gate payload
  const token = parseGateToken(qrPayload);
  if (!token) {
    const result = rejection('INVALID_GATE_TOKEN', { action: actionForGateReject });
    await recordScan({
      ...attempt,
      action: actionForGateReject,
      outpass: null,
      outpassId: '',
      result: 'REJECTED',
      reason: result.reason,
      message: result.message,
    });
    return result;
  }

  // 3. resolve the gate from its stored token (the QR carries no gate id)
  const gate = await Gate.findOne({ qrToken: token }).lean();
  if (!gate) {
    const result = rejection('INVALID_GATE_TOKEN', { action: actionForGateReject });
    await recordScan({
      ...attempt,
      action: actionForGateReject,
      outpass: null,
      outpassId: '',
      result: 'REJECTED',
      reason: result.reason,
      message: result.message,
    });
    return result;
  }

  const gateSnapshot = { gate: gate._id, gateCode: gate.code || '', gateName: gate.name || '' };

  // 4. the gate must be active
  if (gate.active !== true) {
    const result = rejection('GATE_INACTIVE', { action: actionForGateReject });
    await recordScan({
      ...attempt,
      action: actionForGateReject,
      ...gateSnapshot,
      outpass: null,
      outpassId: '',
      result: 'REJECTED',
      reason: result.reason,
      message: result.message,
    });
    return result;
  }

  // RETURN dispatch: a second scan while a movement is open closes that
  // movement. The gate check above always runs first, so a disabled gate or
  // an unknown token can never record a return.
  const openMovement = openForRejectAction && openForRejectAction._id
    ? await Movement.findOne({
      _id: openForRejectAction._id,
      student: student?._id,
      state: 'OUTSIDE',
      actualReturnAt: null,
    }).lean()
    : null;
  if (openMovement) {
    return scanReturnGate({ student, gate, gateSnapshot, openMovement, now, deviceInfo });
  }
  // The pre-dispatch probe found nothing open: fall through to the EXIT path.
  // (A probe hit that vanished here - closed between the two reads - simply
  // means the EXIT path now sees the RETURNED history and rejects the scan as
  // ALREADY_SCANNED, which is the correct third-scan answer.)

  return scanFirstExit({ student, gate, gateSnapshot, attempt, now });
};

// ---------------------------------------------------------------------------
// RETURN path: second scan while the student's movement is open.
// Closes that movement atomically. Expected return time NEVER blocks this:
// on-time -> lateReturn false, late -> lateReturn true (both succeed). The
// Outpass document is never written; only the Movement transitions.
// ---------------------------------------------------------------------------
const scanReturnGate = async ({ student, gate, gateSnapshot, openMovement, now, deviceInfo = '' }) => {
  const rawExpected = openMovement.expectedReturnAt ? new Date(openMovement.expectedReturnAt) : null;
  const expectedReturnAt = rawExpected && !Number.isNaN(rawExpected.getTime()) ? rawExpected : null;
  const lateReturn = expectedReturnAt ? now.getTime() > expectedReturnAt.getTime() : false;
  const message = lateReturn ? RETURN_LATE_SUCCESS_MESSAGE : RETURN_SUCCESS_MESSAGE;

  const outpassSnapshot = {
    outpass: openMovement.outpass,
    outpassId: openMovement.outpassId || '',
  };
  const attemptSnapshot = {
    action: 'RETURN',
    occurredAt: now,
    deviceInfo,
    student: student?._id || null,
    registerNumber: openMovement.registerNumber || student?.registerNumber || '',
    studentName: openMovement.studentName || student?.name || '',
  };

  // ATOMIC close-out. The filter is the whole invariant: this exact movement,
  // still OUTSIDE, still without a return timestamp. Two concurrent RETURNs
  // race here; exactly one matches and the loser gets null.
  const movement = await Movement.findOneAndUpdate(
    {
      _id: openMovement._id,
      outpass: openMovement.outpass,
      state: 'OUTSIDE',
      actualReturnAt: null,
    },
    {
      $set: {
        actualReturnAt: now,
        state: 'RETURNED',
        returnGate: gate._id,
        returnGateCode: gate.code,
        lateReturn,
      },
    },
    { new: true }
  ).lean();

  if (!movement) {
    // Lost the race: the movement was closed (or changed) between the dispatch
    // read and this update. The student's physical state is RETURNED, so the
    // duplicate scan is reported exactly like any third scan.
    const result = rejection('ALREADY_SCANNED', {
      action: 'RETURN',
      outpassId: openMovement.outpassId || '',
      ...(expectedReturnAt ? { expectedReturnAt } : {}),
    });
    await recordScan({
      ...attemptSnapshot,
      ...gateSnapshot,
      ...outpassSnapshot,
      result: 'REJECTED',
      reason: result.reason,
      message: result.message,
    });
    return result;
  }

  // Success audit, then link the two records. Best-effort like the EXIT path:
  // the movement is already RETURNED, so a logging failure must not turn a
  // valid RETURN into an error for the student standing at the gate.
  const scanLog = await recordScan({
    ...attemptSnapshot,
    ...gateSnapshot,
    ...outpassSnapshot,
    result: 'SUCCESS',
    reason: '',
    message,
  });

  if (scanLog?._id) {
    try {
      await Movement.updateOne(
        { _id: movement._id, returnScan: null },
        { $set: { returnScan: scanLog._id } }
      );
    } catch (error) {
      console.error('Failed to link the return scan log to the movement:', error.message);
    }
  }

  return {
    ok: true,
    action: 'RETURN',
    movementState: movement.state,
    message,
    actualReturnAt: movement.actualReturnAt,
    expectedReturnAt,
    lateReturn,
    outpassId: movement.outpassId,
    gate: { code: gate.code, name: gate.name },
  };
};

// First scan for this outpass: validate the approved window, then create the
// single Movement row (state OUTSIDE). Unchanged EXIT behavior, only moved
// into a helper so the RETURN dispatch above can share the endpoint.
const scanFirstExit = async ({ student, gate, gateSnapshot, attempt, now }) => {
  // 5-9. the student's approved, usable outpass and its IST window
  const selection = await findUsableApprovedOutpass(student._id, now);
  if (selection.rejection) {
    const result = selection.rejection;
    await recordScan({
      ...attempt,
      ...gateSnapshot,
      ...(selection.logContext || {}),
      result: 'REJECTED',
      reason: result.reason,
      message: result.message,
    });
    return result;
  }

  const { outpass, expectedExitAt, expectedReturnAt } = selection.entry;
  const outpassSnapshot = { outpass: outpass._id, outpassId: outpass.outpassId || '' };

  // 10a. a movement for THIS outpass already exists (EXIT -> EXIT, or
  //      EXIT -> RETURN -> EXIT once RETURN exists)
  const existingForOutpass = await Movement.findOne({ outpass: outpass._id }).select('_id state').lean();
  if (existingForOutpass) {
    const result = rejection('ALREADY_SCANNED', {
      outpassId: outpass.outpassId || '',
      expectedExitAt,
      expectedReturnAt,
    });
    await recordScan({ ...attempt, ...gateSnapshot, ...outpassSnapshot, result: 'REJECTED', reason: result.reason, message: result.message });
    return result;
  }

  // 10b. a student can only be physically outside once, even when two outpasses
  //      (Home + Outing) are approved at the same time
  const openMovement = await Movement.findOne({ student: student._id, state: 'OUTSIDE' })
    .select('_id outpass')
    .lean();
  if (openMovement) {
    const result = rejection('ALREADY_OUTSIDE', {
      outpassId: outpass.outpassId || '',
      expectedExitAt,
      expectedReturnAt,
    });
    await recordScan({ ...attempt, ...gateSnapshot, ...outpassSnapshot, result: 'REJECTED', reason: result.reason, message: result.message });
    return result;
  }

  // 11. ATOMIC claim. The unique index on Movement.outpass is what really
  //     guarantees one movement per outpass: two simultaneous requests can both
  //     pass every read above, but only the first INSERT survives. The loser
  //     gets a duplicate key error and is reported as a duplicate scan.
  let movement = null;
  try {
    movement = await Movement.create({
      outpass: outpass._id,
      // Legacy safety: every outpass carries its permanent HOMS-SJU-nnn id
      // (backfillOutpassIds() guarantees it). The ObjectId is a last resort so
      // the audit snapshot can never be empty.
      outpassId: outpass.outpassId || String(outpass._id),
      student: student._id,
      registerNumber: outpass.registerNumber || student.registerNumber || '',
      studentName: outpass.studentName || student.name || '',
      hostelName: outpass.hostelName || student.hostelName || student.hostelBlock || '',
      expectedExitAt,
      expectedReturnAt,
      actualExitAt: now,
      state: 'OUTSIDE',
      exitGate: gate._id,
      exitGateCode: gate.code,
      returnGate: null,
      returnGateCode: null,
      lateReturn: null,
      exitScan: null,
      returnScan: null,
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Lost the race (or a movement appeared between the reads and the write).
      const result = rejection('ALREADY_SCANNED', {
        outpassId: outpass.outpassId || '',
        expectedExitAt,
        expectedReturnAt,
      });
      await recordScan({ ...attempt, ...gateSnapshot, ...outpassSnapshot, result: 'REJECTED', reason: result.reason, message: result.message });
      return result;
    }
    // Anything else is a server side data problem (for example a Movement
    // validation error). It has no reason code in this phase, so it surfaces as
    // a 500 through the existing error handler instead of a fake rejection.
    throw error;
  }

  // 12. success audit, then link the two records. The audit write is
  //     best-effort: the movement already exists, so a logging failure must not
  //     turn a valid EXIT into an error for the student standing at the gate.
  const scanLog = await recordScan({
    ...attempt,
    ...gateSnapshot,
    ...outpassSnapshot,
    result: 'SUCCESS',
    reason: '',
    message: SUCCESS_MESSAGE,
  });

  if (scanLog?._id) {
    try {
      await Movement.updateOne(
        { _id: movement._id, exitScan: null },
        { $set: { exitScan: scanLog._id } }
      );
    } catch (error) {
      console.error('Failed to link the exit scan log to the movement:', error.message);
    }
  }

  // 13. everything the student's screen needs for the EXIT animation.
  return {
    ok: true,
    action: 'EXIT',
    movementState: movement.state,
    message: SUCCESS_MESSAGE,
    actualExitAt: movement.actualExitAt,
    expectedExitAt,
    expectedReturnAt,
    outpassId: movement.outpassId,
    gate: { code: gate.code, name: gate.name },
  };
};



