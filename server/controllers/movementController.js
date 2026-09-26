import {
  getStaffLiveMovements as listStaffLiveMovements,
  scanExitGate,
} from '../services/movementService.js';
import Movement from '../models/Movement.js';
import ScanLog from '../models/ScanLog.js';
import { hasManualReport, resolveEffectiveReport } from '../utils/movementReport.js';
import { resolveMovementStatus, resolveMovementStatusKey } from '../utils/movementStatus.js';

// ---------------------------------------------------------------------------
// Movement scan controller - HTTP glue only.
//
// The request body is allowed to contain exactly ONE value: `qrPayload`. Every
// other fact is taken from the authenticated JWT (server/middleware/auth.js) or
// from the database, so a client cannot claim someone else's identity, name an
// outpass, name a gate or send a timestamp. Extra fields in the body are simply
// ignored.
//
// Responses are hand-built: no raw Mongoose documents, no qrToken, no JWT, no
// password, no internal ids beyond the human readable outpass id.
// ---------------------------------------------------------------------------

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toSuccessResponse = (result) => {
  if (result.action === 'RETURN') {
    return {
      success: true,
      action: 'RETURN',
      movementState: result.movementState,
      message: result.message,
      actualReturnAt: toDateOrNull(result.actualReturnAt),
      expectedReturnAt: toDateOrNull(result.expectedReturnAt),
      lateReturn: result.lateReturn,
      outpassId: result.outpassId,
      gate: { code: result.gate.code, name: result.gate.name },
    };
  }

  return {
    success: true,
    action: 'EXIT',
    movementState: result.movementState,
    message: result.message,
    actualExitAt: result.actualExitAt.toISOString(),
    expectedExitAt: result.expectedExitAt.toISOString(),
    expectedReturnAt: result.expectedReturnAt.toISOString(),
    outpassId: result.outpassId,
    gate: { code: result.gate.code, name: result.gate.name },
  };
};

const toRejectionResponse = (result) => ({
  success: false,
  action: result.action || 'EXIT',
  reason: result.reason,
  message: result.message,
  ...(result.outpassId ? { outpassId: result.outpassId } : {}),
  ...(result.expectedExitAt ? { expectedExitAt: result.expectedExitAt.toISOString() } : {}),
  ...(result.expectedReturnAt ? { expectedReturnAt: toDateOrNull(result.expectedReturnAt) } : {}),
});

const MOVEMENT_EVENT_ROOM = 'staff:movements';
const MOVEMENT_EVENT_NAME = 'movement:updated';
const OUTPASS_EVENT_NAME = 'outpass:updated';
const REPORT_VALUES = new Set(['Returned', 'Not Returned']);

const toMovementPayload = (movement, { action = null, eventId = null, occurredAt = null } = {}) => ({
  eventId,
  action,
  movementState: movement.state,
  occurredAt: toDateOrNull(occurredAt),
  movementId: movement._id.toString(),
  outpassId: movement.outpassId,
  registerNumber: movement.registerNumber,
  studentName: movement.studentName,
  phone: movement.outpass?.phone || movement.student?.phone || '',
  requestType: movement.outpass?.requestType || '',
  hostelName: movement.hostelName,
  expectedExitAt: toDateOrNull(movement.expectedExitAt),
  expectedReturnAt: toDateOrNull(movement.expectedReturnAt),
  actualExitAt: toDateOrNull(movement.actualExitAt),
  actualReturnAt: toDateOrNull(movement.actualReturnAt),
  lateReturn: movement.lateReturn,
  // Derived display status ('Outside' | 'Returned' | 'Late Returned') and its
  // CSS key. They travel with every realtime movement:updated payload, so the
  // open live-movement tables flip to 'Late Returned' (red) without a refresh.
  movementStatus: resolveMovementStatus(movement),
  movementStatusKey: resolveMovementStatusKey(movement),
  report: resolveEffectiveReport(movement, movement.outpass),
  reportManuallySet: hasManualReport(movement),
  exitGate: movement.exitGate?.toString() || null,
  exitGateCode: movement.exitGateCode || null,
  returnGate: movement.returnGate?.toString() || null,
  returnGateCode: movement.returnGateCode || null,
});

const findMovementForEvent = (query) => Movement.findOne(query)
  .select(
    '_id outpassId registerNumber studentName hostelName expectedExitAt expectedReturnAt ' +
      'actualExitAt actualReturnAt state lateReturn report reportManuallySet exitGate exitGateCode ' +
      'returnGate returnGateCode exitScan returnScan'
  )
  .populate('outpass', 'outpassId studentId status hodStatus sisterStatus wardenStatus rejectionReason requestType phone')
  .populate('student', 'phone')
  .lean();

const emitOutpassUpdated = (req, outpass, extra = {}) => {
  const io = req.app?.get?.('io');
  if (!io || !outpass) return;

  const payload = {
    outpassObjectId: String(outpass._id),
    outpassId: outpass.outpassId,
    studentId: String(outpass.studentId),
    status: outpass.status,
    hodStatus: outpass.hodStatus,
    sisterStatus: outpass.sisterStatus,
    wardenStatus: outpass.wardenStatus,
    rejectionReason: outpass.rejectionReason || '',
    report: extra.report ?? (outpass.status || 'Pending'),
    reportManuallySet: extra.reportManuallySet ?? false,
    movementState: extra.movementState || null,
    movementStatus: extra.movementStatus || null,
    movementStatusKey: extra.movementStatusKey || null,
    actualExitAt: toDateOrNull(extra.actualExitAt),
    actualReturnAt: toDateOrNull(extra.actualReturnAt),
  };

  io.to(MOVEMENT_EVENT_ROOM).emit(OUTPASS_EVENT_NAME, payload);
  io.to(`student:${outpass.studentId}`).emit(OUTPASS_EVENT_NAME, payload);
};

const emitSuccessfulMovement = async (req, result) => {
  const io = req.app?.get?.('io');
  if (!io) return;

  try {
    const movement = await findMovementForEvent({ outpassId: result.outpassId });
    if (!movement) return;

    const linkedScanId = result.action === 'RETURN' ? movement.returnScan : movement.exitScan;
    const scanLog = linkedScanId
      ? await ScanLog.findById(linkedScanId).select('_id occurredAt').lean()
      : await ScanLog.findOne({
          outpassId: movement.outpassId,
          action: result.action,
          result: 'SUCCESS',
        }).sort({ _id: -1 }).select('_id occurredAt').lean();

    const payload = toMovementPayload(movement, {
      action: result.action,
      eventId: scanLog?._id?.toString() || null,
      occurredAt: scanLog?.occurredAt || new Date(),
    });

    io.to(MOVEMENT_EVENT_ROOM).emit(MOVEMENT_EVENT_NAME, payload);
    // The student Live Movement page renders only the authenticated student's
    // own rows, so the same payload is delivered to that student's private room
    // (joined on socket connect) — no extra event, no second connection.
    if (movement.outpass?.studentId) {
      io.to(`student:${movement.outpass.studentId}`).emit(MOVEMENT_EVENT_NAME, payload);
    }
    emitOutpassUpdated(req, movement.outpass, {
      report: resolveEffectiveReport(movement, movement.outpass),
      reportManuallySet: hasManualReport(movement),
      movementState: movement.state,
      movementStatus: resolveMovementStatus(movement),
      movementStatusKey: resolveMovementStatusKey(movement),
      actualExitAt: movement.actualExitAt,
      actualReturnAt: movement.actualReturnAt,
    });
  } catch {
    console.error('Failed to emit movement:updated event');
  }
};

// POST /api/movements/scan
// Scans the permanent gate QR as the authenticated student. The server decides
// whether this is an EXIT (first) or RETURN (second) scan.
export const scanGateQr = async (req, res, next) => {
  try {
    const result = await scanExitGate({
      // Identity always comes from the JWT, never from the request body.
      student: req.user,
      qrPayload: req.body?.qrPayload,
      // Audit only metadata: a scanner UI never has to send it.
      deviceInfo: String(req.headers['user-agent'] || '').slice(0, 300),
    });

    if (result.ok) {
      // Emit only after the service has committed a successful movement. The
      // helper is best-effort, so realtime delivery cannot change this REST
      // response or make a valid scan fail.
      await emitSuccessfulMovement(req, result);

      // 201: an EXIT created the movement, or a RETURN closed it.
      return res.status(201).json(toSuccessResponse(result));
    }

    return res.status(result.httpStatus).json(toRejectionResponse(result));
  } catch (error) {
    next(error);
  }
};
// GET /api/movements/staff/live
// Initial read-only snapshot for the staff live-movement views. Real-time
// updates will be layered on later; this endpoint itself does not poll.
export const updateMovementReport = async (req, res, next) => {
  try {
    const report = String(req.body?.report || '').trim();
    if (!REPORT_VALUES.has(report)) {
      return res.status(400).json({ message: 'Report must be Returned or Not Returned' });
    }

    const movement = await Movement.findById(req.params.id);
    if (!movement) return res.status(404).json({ message: 'Movement not found' });

    movement.report = report;
    movement.reportManuallySet = true;
    await movement.save();

    const io = req.app?.get?.('io');
    if (io) {
      const eventMovement = await findMovementForEvent({ _id: movement._id });
      if (eventMovement) {
        const movementPayload = toMovementPayload(eventMovement, {
          action: 'REPORT',
          eventId: null,
          occurredAt: new Date(),
        });
        io.to(MOVEMENT_EVENT_ROOM).emit(MOVEMENT_EVENT_NAME, movementPayload);
        io.to(`student:${eventMovement.outpass.studentId}`).emit(MOVEMENT_EVENT_NAME, movementPayload);
        emitOutpassUpdated(req, eventMovement.outpass, {
          report: resolveEffectiveReport(eventMovement, eventMovement.outpass),
          reportManuallySet: true,
          movementState: eventMovement.state,
          movementStatus: resolveMovementStatus(eventMovement),
          movementStatusKey: resolveMovementStatusKey(eventMovement),
          actualExitAt: eventMovement.actualExitAt,
          actualReturnAt: eventMovement.actualReturnAt,
        });
      }
    }

    return res.json({
      success: true,
      movementId: movement._id.toString(),
      outpassId: movement.outpassId,
      report: movement.report,
      reportManuallySet: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffLiveMovements = async (req, res, next) => {
  try {
    // Phase 1 Fix #3: the staff snapshot is bounded inside the MongoDB query
    // (open movements + a recent IST-day window) and capped server-side.
    const movements = await listStaffLiveMovements({}, { recentLiveWindow: true });
    res.json({ success: true, movements });
  } catch (error) {
    next(error);
  }
};

// GET /api/movements/my/live
// Student-scoped snapshot for the Student Live Movement page: only the
// authenticated student's own movements. The identity always comes from the
// JWT, so the client cannot widen the query to other students.
export const getMyLiveMovements = async (req, res, next) => {
  try {
    const movements = await listStaffLiveMovements({ student: req.user._id });
    res.json({ success: true, movements });
  } catch (error) {
    next(error);
  }
};
