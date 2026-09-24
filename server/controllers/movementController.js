import { scanExitGate } from '../services/movementService.js';

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
      // 201: an EXIT created the movement, or a RETURN closed it.
      return res.status(201).json(toSuccessResponse(result));
    }

    return res.status(result.httpStatus).json(toRejectionResponse(result));
  } catch (error) {
    next(error);
  }
};
