// ---------------------------------------------------------------------------
// CENTRAL HTTP ERROR HANDLING
//
// Everything the API can go wrong with is answered from ONE place, and it is
// split into two clearly separated classes:
//
//   1. INTENDED client errors (4xx). Their status and their short, human
//      readable `message` are part of the API contract - every screen in the
//      frontend renders `error.response.data.message` - so they are passed
//      through UNCHANGED. They are not logged as server faults, because a
//      wrong password or a missing outpass is normal traffic, not an incident.
//
//   2. UNEXPECTED server faults (5xx). These are logged ONCE, server-side, with
//      enough context to diagnose them, and the client receives a fixed safe
//      message - never a raw error message, a stack trace, a Mongo error or any
//      other internal detail.
//
// The status of an intended error is resolved from the convention the project
// already uses elsewhere (`error.statusCode`, see
// server/db/monthlyExportDeleteService.js) plus Express' own `error.status`
// (which is what express.json() sets), and finally from a status a route may
// already have set on the response. That keeps every existing 400 / 401 / 403 /
// 404 / 409 exactly as it behaves today.
// ---------------------------------------------------------------------------

// Fixed wording for an unexpected fault. The real reason stays in the server
// log, where the person who can fix it can read it.
const GENERIC_SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.';

// Fallback when a 4xx arrives without any message at all.
const FALLBACK_CLIENT_ERROR_MESSAGE = 'Bad request.';

// Body-parser failures carry a useful HTTP status but a message that describes
// parser internals (offsets, raw characters). They are translated here into
// fixed, safe wording so nothing internal is echoed to the client. This is only
// a translation of the error that already exists - the body parsing itself is
// untouched.
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': { status: 400, message: 'Malformed JSON in request body.' },
  'entity.too.large': { status: 413, message: 'Request body is too large.' },
  'charset.unsupported': { status: 415, message: 'Unsupported request charset.' },
  'encoding.unsupported': { status: 415, message: 'Unsupported request encoding.' },
};

const isHttpStatus = (value) => Number.isInteger(value) && value >= 400 && value < 600;

const resolveStatusCode = (error, res) => {
  if (isHttpStatus(error?.status)) return error.status;
  if (isHttpStatus(error?.statusCode)) return error.statusCode;
  if (isHttpStatus(res?.statusCode)) return res.statusCode;
  return 500;
};

// Diagnostic log for an unexpected fault. Context only:
//   method, path (query string stripped), status, error name/message, stack.
//
// NEVER logged: request or response bodies, headers (so no Authorization token
// and no cookies), the JWT, the query string (which could carry a token), or
// any environment value such as the MongoDB connection string or JWT secret.
const logServerFault = (error, req, statusCode) => {
  const method = req?.method || '-';
  const path = req?.originalUrl ? String(req.originalUrl).split('?')[0] : '-';
  const name = error?.name || 'Error';
  const message = (typeof error === 'string' && error) || error?.message || 'Unknown error';

  console.error(`[homs] ${statusCode} ${method} ${path} :: ${name}: ${message}`);
  if (error?.stack) console.error(error.stack);
};

// Unmatched route: an intentional 404 whose message is part of the existing
// behaviour, so it is deliberately left exactly as it is.
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Express error middleware (4 arguments - that is how Express recognises it).
export const errorHandler = (error, req, res, next) => {
  // A response is already in flight and cannot be rewritten. Handing the error
  // back to Express lets it destroy the connection instead of this handler
  // throwing "Cannot set headers after they are sent to the client".
  if (res.headersSent) return next(error);

  const parserError = BODY_PARSER_ERRORS[error?.type];
  if (parserError) {
    return res.status(parserError.status).json({ message: parserError.message });
  }

  const statusCode = resolveStatusCode(error, res);

  if (statusCode >= 500) {
    logServerFault(error, req, statusCode);
    return res.status(500).json({ message: GENERIC_SERVER_ERROR_MESSAGE });
  }

  // Intended client error: today's status and today's user-facing message.
  const message = error?.message || FALLBACK_CLIENT_ERROR_MESSAGE;
  return res.status(statusCode).json({ message });
};

