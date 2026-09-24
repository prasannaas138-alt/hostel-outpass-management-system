import {
  getStaffLiveMovements as listStaffLiveMovements,
  scanExitGate,
} from '../services/movementService.js';
import Movement from '../models/Movement.js';
import ScanLog from '../models/ScanLog.js';

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

const emitSuccessfulMovement = async (req, result) => {
  const io = req.app?.get?.('io');
  if (!io) return;

  try {
    const movement = await Movement.findOne({ outpassId: result.outpassId })
      .select(
        '_id outpassId registerNumber studentName hostelName expectedExitAt expectedReturnAt ' +
          'actualExitAt actualReturnAt state lateReturn exitGate exitGateCode ' +
          'returnGate returnGateCode exitScan returnScan'
      )
      .populate('outpass', 'requestType phone')
      .populate('student', 'phone')
      .lean();

    if (!movement) return;

    const linkedScanId = result.action === 'RETURN' ? movement.returnScan : movement.exitScan;
    let scanLog = linkedScanId
      ? await ScanLog.findById(linkedScanId).select('_id occurredAt').lean()
      : null;

    if (!scanLog) {
      scanLog = await ScanLog.findOne({
        outpassId: movement.outpassId,
        action: result.action,
        result: 'SUCCESS',
      })
        .sort({ _id: -1 })
        .select('_id occurredAt')
        .lean();
    }

    const payload = {
      eventId: scanLog?._id?.toString() || null,
      action: result.action,
      movementState: movement.state,
      occurredAt: toDateOrNull(scanLog?.occurredAt),
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
      exitGate: movement.exitGate?.toString() || null,
      exitGateCode: movement.exitGateCode || null,
      returnGate: movement.returnGate?.toString() || null,
      returnGateCode: movement.returnGateCode || null,
    };

    io.to(MOVEMENT_EVENT_ROOM).emit(MOVEMENT_EVENT_NAME, payload);
  } catch {
    // Realtime delivery is optional; a valid REST movement response must remain
    // successful even if Socket.IO or the post-success lookups are unavailable.
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
export const getStaffLiveMovements = async (req, res, next) => {
  try {
    const movements = await listStaffLiveMovements();
    res.json({ success: true, movements });
  } catch (error) {
    next(error);
  }
};
