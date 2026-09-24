import Outpass from '../models/Outpass.js';
import Movement from '../models/Movement.js';
import User from '../models/User.js';
import { createOutpassPdf } from '../utils/pdf.js';
// IST schedule helpers (shared): the day/time parsing rules and the explicit
// +05:30 instant construction live in ONE module, so the existing expiry checks
// and the movement schedule resolver can never disagree about an instant.
import { buildIstInstant, toDateOnlyString, to24HourString } from '../utils/ist.js';
import { notifyNewOutpass, markOutpassNotificationsRead } from '../services/notificationService.js';
import { hasManualReport, resolveEffectiveReport } from '../utils/movementReport.js';

const ACTIVE_STATUSES = ['Pending', 'Approved'];

// Student profile fields every approver (HOD / Sister / Warden) must see on review.
const STUDENT_POPULATE = 'name registerNumber roomNumber phone parentPhone parentGuardianName hostelName department year batch';

const OUTPASS_EVENT_NAME = 'outpass:updated';
const STAFF_EVENT_ROOM = 'staff:movements';

const emitOutpassUpdated = async (req, outpass) => {
  const io = req.app?.get?.('io');
  if (!io || !outpass) return;

  try {
    const movement = await Movement.findOne({ outpass: outpass._id })
      .select('state report reportManuallySet expectedReturnAt actualExitAt actualReturnAt')
      .lean();
    const payload = {
      outpassObjectId: String(outpass._id),
      outpassId: outpass.outpassId,
      studentId: String(outpass.studentId),
      status: outpass.status,
      hodStatus: outpass.hodStatus,
      sisterStatus: outpass.sisterStatus,
      wardenStatus: outpass.wardenStatus,
      rejectionReason: outpass.rejectionReason || '',
      report: movement ? resolveEffectiveReport(movement, outpass) : (outpass.status || 'Pending'),
      reportManuallySet: hasManualReport(movement),
      movementState: movement?.state || null,
      actualExitAt: movement?.actualExitAt || null,
      actualReturnAt: movement?.actualReturnAt || null,
    };

    io.to(STAFF_EVENT_ROOM).emit(OUTPASS_EVENT_NAME, payload);
    io.to(`student:${payload.studentId}`).emit(OUTPASS_EVENT_NAME, payload);
  } catch {
    console.error('Failed to emit outpass:updated event');
  }
};

// Flattens the populated student profile onto the outpass so review screens and
// history tables can read registerNumber / roomNumber / phone / parentPhone /
// parentGuardianName / batch / hostelName directly from the student's LIVE
// database values (never hardcoded).
const withMovementInfo = async (outpass) => {
  if (!outpass) return outpass;
  const movement = await Movement.findOne({ outpass: outpass._id })
    .select('state report reportManuallySet expectedReturnAt actualExitAt actualReturnAt')
    .lean();
  const value = typeof outpass.toObject === 'function' ? outpass.toObject() : outpass;
  return {
    ...value,
    report: movement ? resolveEffectiveReport(movement, value) : (value.status || 'Pending'),
    reportManuallySet: hasManualReport(movement),
    movementState: movement?.state || null,
    actualExitAt: movement?.actualExitAt || null,
    actualReturnAt: movement?.actualReturnAt || null,
  };
};

const withMovementInfoList = (outpasses) => Promise.all(outpasses.map(withMovementInfo));

const enrichOutpass = (outpass) => {
  const student = outpass.studentId || {};
  return {
    ...outpass,
    student,
    studentName: outpass.studentName || student.name || '',
    registerNumber: student.registerNumber || '',
    roomNumber: student.roomNumber || '',
    phone: student.phone || '',
    parentPhone: student.parentPhone || '',
    parentGuardianName: student.parentGuardianName || '',
    hostelName: student.hostelName || '',
    department: outpass.department || student.department || '',
    year: outpass.year || student.year || '',
    batch: student.batch || '',
  };
};

const pad2 = (value) => String(value).padStart(2, '0');

// toDateOnlyString (the IST calendar day of any stored date shape) now lives in
// server/utils/ist.js, so the existing expiry logic and the movement resolver
// share one parsing rule instead of two copies that could drift apart.

// Optional ?date=YYYY-MM-DD filter for the three Outpass History endpoints.
// A record matches when the selected IST calendar day equals its Out Date OR
// its Return Date (the redesigned history page needs both meanings). Uses the
// existing toDateOnlyString convention, so every stored shape (Date object,
// "YYYY-MM-DD", full ISO string) compares as the same Indian calendar day --
// never a raw UTC or browser-local comparison. Without the parameter the
// response is the full history exactly as before, so existing callers,
// authorization and role checks are untouched.
const filterBySelectedDate = (outpasses, req) => {
  const selectedDate = String(req.query?.date || '').trim();
  if (!selectedDate) return outpasses;
  return outpasses.filter(
    (outpass) =>
      toDateOnlyString(outpass.date) === selectedDate ||
      toDateOnlyString(outpass.returnDate) === selectedDate
  );
};

// to24HourString (24-hour "HH:MM" of any stored time shape, legacy 12-hour
// strings included) now lives in server/utils/ist.js for the same reason.

const buildExpiresAt = (date, returnDate, returnTime) => {
  // Expiry = RETURN DATE + RETURN TIME in Asia/Kolkata (IST, +05:30).
  // Constructing an ISO string with an explicit offset keeps the resulting
  // instant correct regardless of the server timezone.
  // Robust against legacy records: 12-hour time strings and Date objects
  // previously produced `new Date("...T09:NaN:00+05:30")` → Invalid Date →
  // Mongoose "expiresAt: Cast to date failed" on reapply AND a silent 500 on
  // Warden approval. A safe fallback (end of the return day) is used instead
  // so a save can never be rejected because of a malformed stored time.
  const dateStr = toDateOnlyString(returnDate) || toDateOnlyString(date);
  const time24 = to24HourString(returnTime) || '23:59';
  if (!dateStr) {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return new Date(
      `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}T23:59:00+05:30`
    );
  }
  return new Date(`${dateStr}T${time24}:00+05:30`);
};

// Helper to compute expiry from returnDate + returnTime in IST, used as fallback
// when expiresAt is missing or potentially incorrect.
const computeExpiryIST = (returnDate, returnTime) => {
  const dateStr = toDateOnlyString(returnDate);
  const time24 = to24HourString(returnTime);
  if (!dateStr || !time24) return Number.POSITIVE_INFINITY; // never expire on unparsable legacy data
  return new Date(`${dateStr}T${time24}:00+05:30`).getTime();
};

const isExpiredNow = (outpass) => {
  // Return Date + Return Time (IST) is the source of truth: current time at
  // or past it => expired, even when a stale/incorrect expiresAt exists.
  if (outpass.returnDate && outpass.returnTime) {
    if (computeExpiryIST(outpass.returnDate, outpass.returnTime) <= Date.now()) {
      return true;
    }
  }
  // Fallback: backend-computed expiresAt when the return schedule is unavailable.
  if (outpass.expiresAt && new Date(outpass.expiresAt).getTime() <= Date.now()) {
    return true;
  }
  return false;
};

const refreshExpiredOutpasses = async () => {
  // Pass 1 — records whose stored expiresAt has passed (covers legacy records
  // that have no returnDate/returnTime to recompute from).
  await Outpass.updateMany(
    {
      status: { $in: ACTIVE_STATUSES },
      expiresAt: { $exists: true, $ne: null, $lte: new Date() },
    },
    {
      $set: { status: 'Expired' },
    }
  );

  // Pass 2 — Return Date + Return Time (IST) is the source of truth.
  // Flip any ACTIVE record whose return datetime has passed EVEN IF expiresAt
  // exists — a stale or incorrect expiresAt (legacy records) must never keep
  // an outpass "Approved" after its return time.
  // Rule: current IST datetime >= returnDate + returnTime => Expired.
  const activeWithReturn = await Outpass.find({
    status: { $in: ACTIVE_STATUSES },
    returnDate: { $exists: true, $ne: null },
    returnTime: { $exists: true, $ne: null },
  })
    .select('_id returnDate returnTime')
    .lean();

  const expiredIds = activeWithReturn
    .filter((outpass) => computeExpiryIST(outpass.returnDate, outpass.returnTime) <= Date.now())
    .map((outpass) => outpass._id);

  if (expiredIds.length > 0) {
    await Outpass.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: 'Expired' } }
    );
  }
};

// Auto-rejects pending Warden outpasses whose Out Date + Out Time has passed.
// This runs inside existing Warden endpoints so expired requests are rejected
// with the exact reason before they are shown or reviewed.
const WARDEN_EXPIRED_REJECTION_REASON = 'Automatically rejected: outpass expired at Out Date + Out Time';

// Out Date + Out Time in IST (Asia/Kolkata).
//
// FIXED: this used to be built with `new Date(`${dateStr}T00:00:00`)` and then
// `expiresAt.setHours(hour, minute)`. Both interpret the value in the SERVER's
// local timezone, so on a UTC host (production) the boundary came out 5h30m
// LATER than the real IST out time - 09:00 IST was treated as 09:00 UTC, which
// is 14:30 IST. It is now constructed with an explicit +05:30 offset, the same
// convention buildExpiresAt() and computeExpiryIST() already use, so
// "Out Date + Out Time" means the same absolute moment on every host. On an
// IST-configured machine the result is unchanged; on a UTC machine it is
// corrected.
//
// The contract is preserved: the helper still ALWAYS returns a Date (never null
// and it cannot throw), so isWardenOutpassExpired() keeps working unchanged. The
// only fallback kept is the old "assume today" one, now taken as the IST
// calendar day, and '00:00' for an unparsable out time.
const buildOutTimeExpiry = (outpass) => {
  const time24 = to24HourString(outpass.outTime) || '00:00';
  const dateStr = toDateOnlyString(outpass.date) || toDateOnlyString(new Date());
  return buildIstInstant(dateStr, time24) || new Date();
};

const isWardenOutpassExpired = (outpass) => {
  return Boolean(outpass.date && outpass.outTime) && buildOutTimeExpiry(outpass).getTime() <= Date.now();
};

const rejectExpiredWardenOutpasses = async () => {
  const pending = await Outpass.find({
    status: { $in: ACTIVE_STATUSES },
    wardenStatus: 'Pending',
  }).lean();

  const expired = pending.filter(isWardenOutpassExpired);
  if (!expired.length) return;

  await Outpass.updateMany(
    {
      _id: { $in: expired.map((outpass) => outpass._id) },
    },
    {
      $set: {
        status: 'Rejected',
        wardenStatus: 'Rejected',
        rejectionReason: WARDEN_EXPIRED_REJECTION_REASON,
      },
    }
  );
};

const buildApprovedByEntry = (role, userId) => ({
  role,
  user: userId,
  date: new Date(),
});

// The seven weekday options the student manually selects. Values are stored
// verbatim — never derived from the date (no UTC/getDay conversion).
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const resetForReapply = (outpass) => {
  outpass.status = 'Pending';
  outpass.hodStatus = outpass.requestType === 'Home' ? 'Pending' : 'NotRequired';
  // Both request types require Sister approval (see createOutpass).
  outpass.sisterStatus = 'Pending';
  outpass.wardenStatus = 'Pending';
  outpass.rejectionReason = '';
  outpass.approvedBy = [];
  outpass.expiresAt = buildExpiresAt(outpass.date, outpass.returnDate, outpass.returnTime);
};

export const createOutpass = async (req, res, next) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({ message: 'Only students can apply for outpass' });
    }

    const { requestType, date, returnDate, outDay, returnDay, outTime, returnTime, reason, destination } = req.body;

    if (!requestType || !date || !returnDate || !outDay || !returnDay || !outTime || !returnTime || !reason) {
      return res.status(400).json({ message: 'All fields are required, including Out Day and Return Day' });
    }

    // The weekday must be one of the seven options the form offers. The
    // selected value itself is stored verbatim — never recalculated.
    if (!WEEKDAYS.includes(outDay) || !WEEKDAYS.includes(returnDay)) {
      return res.status(400).json({ message: 'Out Day and Return Day must be a valid weekday' });
    }

    // IST-aware guard for manually crafted requests (the calendar already
    // blocks past dates in the UI): the Out Date cannot be in the past and
    // the Return Date cannot be earlier than the Out Date.
    const todayIST = toDateOnlyString(new Date());
    if (String(date) < todayIST) {
      return res.status(400).json({ message: 'Out Date cannot be in the past' });
    }
    if (String(returnDate) < String(date)) {
      return res.status(400).json({ message: 'Return Date cannot be earlier than the Out Date' });
    }

    const existingActiveRequest = await Outpass.findOne({
      studentId: req.user._id,
      requestType,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingActiveRequest) {
      return res.status(400).json({
        message: `You already have an active ${requestType.toLowerCase()} request. Wait for it to finish or expire before creating another one.`,
      });
    }

    const outpass = await Outpass.create({
      studentId: req.user._id,
      studentName: req.user.name,
      registerNumber: req.user.registerNumber,
      roomNumber: req.user.roomNumber,
      phone: req.user.phone,
      parentPhone: req.user.parentPhone,
      hostelName: req.user.hostelName,
      department: req.user.department,
      year: req.user.year,
      requestType,
      date,
      returnDate,
      outDay,
      returnDay,
      outTime,
      returnTime,
      destination: (destination || '').trim(),
      reason,
      hodStatus: requestType === 'Home' ? 'Pending' : 'NotRequired',
      // BOTH request types require Sister approval. Outing: she is the FIRST
      // reviewer (Student -> Sister -> Warden). Home: she is the SECOND — the
      // request shows NOT APPROVED from creation, but sisterReviewOutpass only
      // allows her to act once the HOD has approved it.
      sisterStatus: 'Pending',
      wardenStatus: 'Pending',
      expiresAt: buildExpiresAt(date, returnDate, returnTime),
    });

    // In-app notifications for Sister/Warden (non-blocking, never fails the request).
    await notifyNewOutpass(outpass);
    await emitOutpassUpdated(req, outpass);

    res.status(201).json(outpass);
  } catch (error) {
    next(error);
  }
};

export const updateOutpass = async (req, res, next) => {
  try {
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found' });
    }

    if (String(outpass.studentId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (outpass.status !== 'Rejected') {
      return res.status(400).json({ message: 'Only rejected requests can be edited and reapplied' });
    }

    const { requestType, date, returnDate, outDay, returnDay, outTime, returnTime, reason, destination } = req.body;

    // Same IST guard as createOutpass, applied to edited/reapplied requests.
    const todayIST = toDateOnlyString(new Date());
    const effectiveOut = toDateOnlyString(date || outpass.date);
    const effectiveReturn = toDateOnlyString(returnDate || outpass.returnDate || outpass.date);
    if (effectiveOut && effectiveOut < todayIST) {
      return res.status(400).json({ message: 'Out Date cannot be in the past' });
    }
    if (effectiveOut && effectiveReturn && effectiveReturn < effectiveOut) {
      return res.status(400).json({ message: 'Return Date cannot be earlier than the Out Date' });
    }

    outpass.requestType = requestType || outpass.requestType;
    outpass.date = date || outpass.date;
    outpass.returnDate = returnDate || outpass.returnDate || outpass.date;
    // Reapply: store the manually selected weekdays verbatim when provided.
    if (outDay) outpass.outDay = outDay;
    if (returnDay) outpass.returnDay = returnDay;
    if (typeof destination === 'string') outpass.destination = destination.trim();
    outpass.outTime = outTime || outpass.outTime;
    outpass.returnTime = returnTime || outpass.returnTime;
    outpass.reason = reason || outpass.reason;
    outpass.department = req.user.department;
    outpass.year = req.user.year;
    outpass.studentName = req.user.name;
    outpass.expiresAt = buildExpiresAt(outpass.date, outpass.returnDate, outpass.returnTime);

    resetForReapply(outpass);
    await outpass.save();
    await emitOutpassUpdated(req, outpass);

    res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const getMyOutpasses = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const outpasses = await Outpass.find({ studentId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(await withMovementInfoList(outpasses));
  } catch (error) {
    next(error);
  }
};

export const getOutpassById = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found' });
    }

    const isOwner = String(outpass.studentId) === String(req.user._id);
    const isReviewer = ['HOD', 'Sister', 'Warden'].includes(req.user.role);

    if (!isOwner && !isReviewer) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (isExpiredNow(outpass) && outpass.status !== 'Rejected') {
      outpass.status = 'Expired';
      await outpass.save();
    }

    res.json(await withMovementInfo(outpass));
  } catch (error) {
    next(error);
  }
};

export const getPendingHodRequests = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const outpasses = await Outpass.find({
      requestType: 'Home',
      hodStatus: 'Pending',
      status: 'Pending',
    }).sort({ createdAt: -1 }).populate('studentId', STUDENT_POPULATE).lean();

    res.json(await withMovementInfoList(outpasses.map(enrichOutpass)));
  } catch (error) {
    next(error);
  }
};

export const getPendingSisterRequests = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    // Sister queue — Sister approval is REQUIRED for BOTH request types.
    // A request appears here whenever it is pending and Sister has not
    // approved/rejected it yet — regardless of Home or Outing.
    // 'NotRequired' is the legacy initial value written by the pre-fix
    // creation code; pending records carrying it are still undecided, so
    // they must be reviewable too. HOD-rejected records are excluded by
    // their status ('Rejected'), never by this condition.
    const outpasses = await Outpass.find({
      status: 'Pending',
      sisterStatus: { $in: ['Pending', 'NotRequired'] },
    }).sort({ createdAt: -1 }).populate('studentId', STUDENT_POPULATE).lean();

    // TEMP-DEBUG (remove after verifying): confirms what the Sister queue
    // API actually returns for the currently pending records.
    console.log(
      `[TEMP-DEBUG] sister pending queue -> ${outpasses.length} request(s):`,
      outpasses.map((o) => `${o.outpassId || o._id} type=${o.requestType} status=${o.status} sister=${o.sisterStatus} hod=${o.hodStatus} warden=${o.wardenStatus}`).join(' | ') || '(none)'
    );

    res.json(await withMovementInfoList(outpasses.map(enrichOutpass)));
  } catch (error) {
    next(error);
  }
};

export const getPendingWardenRequests = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();
    // Warden sees every PENDING request immediately — visibility and the
    // final-action authority are separate (Warden override). The sequence
    // itself is still enforced inside wardenReviewOutpass:
    //   Outing -> Warden may act at any time (override authority)
    //   Home   -> HOD + Sister must approve first
    const outpasses = await Outpass.find({
      status: 'Pending',
      wardenStatus: 'Pending',
    }).sort({ createdAt: -1 })
      // Populated so the Warden review UI can show the student's real
      // register number, room number, phone, parent/guardian number, and
      // hostel name from their live profile.
      .populate('studentId', STUDENT_POPULATE)
      .lean();

    res.json(await withMovementInfoList(outpasses.map(enrichOutpass)));
  } catch (error) {
    next(error);
  }
};

export const hodReviewOutpass = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass || outpass.requestType !== 'Home' || outpass.hodStatus !== 'Pending' || isExpiredNow(outpass)) {
      return res.status(400).json({ message: 'Request is not available for HOD review' });
    }

    if (action === 'approve') {
      outpass.hodStatus = 'Approved';
      outpass.sisterStatus = 'Pending';
      outpass.approvedBy.push(buildApprovedByEntry('HOD', req.user._id));
      await outpass.save();
      await emitOutpassUpdated(req, outpass);
      return res.json(outpass);
    }

    outpass.hodStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.sisterStatus = 'NotRequired';
    outpass.wardenStatus = 'NotRequired';
    outpass.rejectionReason = rejectionReason || 'Rejected by HOD';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
    await emitOutpassUpdated(req, outpass);
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const sisterReviewOutpass = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    // Sister reviews: her approval is required for BOTH request types. The
    // only conditions are: still pending, Sister undecided, not expired.
    // Legacy 'NotRequired' counts as undecided (see the Sister queue query).
    const allowedForSister =
      outpass &&
      outpass.status === 'Pending' &&
      (outpass.sisterStatus === 'Pending' || outpass.sisterStatus === 'NotRequired') &&
      !isExpiredNow(outpass);

    if (!allowedForSister) {
      return res.status(400).json({ message: 'Request is not available for Sister review' });
    }

    if (action === 'approve') {
      outpass.sisterStatus = 'Approved';
      outpass.wardenStatus = 'Pending';
      outpass.approvedBy.push(buildApprovedByEntry('Sister', req.user._id));
      await outpass.save();
      await markOutpassNotificationsRead(outpass._id, 'Sister');
      await emitOutpassUpdated(req, outpass);
      return res.json(outpass);
    }

    outpass.sisterStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.wardenStatus = 'NotRequired';
    outpass.rejectionReason = rejectionReason || 'Rejected by Sister';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
    await emitOutpassUpdated(req, outpass);
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const wardenReviewOutpass = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    const allowedForWarden =
      outpass &&
      (outpass.status === 'Pending' || outpass.status === 'Approved') &&
      (outpass.requestType === 'Outing' || outpass.requestType === 'Home') &&
      outpass.wardenStatus === 'Pending';

    if (!allowedForWarden) {
      return res.status(400).json({ message: 'Request is not available for Warden review' });
    }

    // Warden override authority (backend-enforced): the Warden may approve or
    // reject at any time while the request is pending his action — regardless
    // of HOD/Sister approval status. His action alone decides the final
    // status; HOD/Sister statuses are NOT modified by his decision.
    if (action === 'approve') {
      outpass.wardenStatus = 'Approved';
      outpass.status = 'Approved';
      outpass.expiresAt = buildExpiresAt(outpass.date, outpass.returnDate, outpass.returnTime);
      outpass.approvedBy.push(buildApprovedByEntry('Warden', req.user._id));
      await outpass.save();
      await markOutpassNotificationsRead(outpass._id);
      await emitOutpassUpdated(req, outpass);
      return res.json(outpass);
    }

    outpass.wardenStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.rejectionReason = rejectionReason || 'Rejected by Warden';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
    await emitOutpassUpdated(req, outpass);
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const downloadOutpassPdf = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();
    const outpass = await Outpass.findById(req.params.id).populate('approvedBy.user', 'name role');

    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found' });
    }

    const isOwner = String(outpass.studentId) === String(req.user._id);
    const canReview = ['HOD', 'Sister', 'Warden'].includes(req.user.role);

    if (!isOwner && !canReview) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (outpass.status !== 'Approved') {
      return res.status(400).json({ message: 'PDF is available only for approved outpasses that have not expired' });
    }

    const pdf = createOutpassPdf(outpass);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="outpass-${outpass._id}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Warden "Outpass History": every request that has reached warden review
// (pending, approved, rejected) plus expired ones â€” newest first. Room number
// and phone come from the student's live profile so the history table and the
// warden review screen always show current contact details.
// ---------------------------------------------------------------------------
export const getHodHistory = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const outpasses = await Outpass.find({
      requestType: 'Home',
      $or: [
        { hodStatus: { $in: ['Approved', 'Rejected'] } },
        { status: { $in: ['Approved', 'Rejected', 'Expired'] } },
      ],
    }).sort({ createdAt: -1 }).populate('studentId', STUDENT_POPULATE).lean();
    const filtered = filterBySelectedDate(outpasses, req);
    res.json(await withMovementInfoList(filtered.map(enrichOutpass)));
  } catch (error) {
    next(error);
  }
};

export const getSisterHistory = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const outpasses = await Outpass.find({
      $or: [
        { sisterStatus: { $in: ['Approved', 'Rejected'] } },
        { status: { $in: ['Approved', 'Rejected', 'Expired'] } },
      ],
    }).sort({ createdAt: -1 }).populate('studentId', STUDENT_POPULATE).lean();
    const filtered = filterBySelectedDate(outpasses, req);
    res.json(await withMovementInfoList(filtered.map(enrichOutpass)));
  } catch (error) {
    next(error);
  }
};

export const getWardenHistory = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();

    const outpasses = await Outpass.find({
      $or: [
        { wardenStatus: { $in: ['Pending', 'Approved', 'Rejected'] } },
        { status: 'Expired' },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('studentId', STUDENT_POPULATE)
      .lean();

    const filtered = filterBySelectedDate(outpasses, req).map((outpass) => ({
      ...outpass,
      registerNumber: outpass.registerNumber || outpass.studentId?.registerNumber || '',
      roomNumber: outpass.roomNumber || outpass.studentId?.roomNumber || '',
      phone: outpass.phone || outpass.studentId?.phone || '',
      parentPhone: outpass.parentPhone || outpass.studentId?.parentPhone || '',
      hostelName: outpass.hostelName || outpass.studentId?.hostelName || outpass.studentId?.hostelBlock || '',
    }));
    res.json(await withMovementInfoList(filtered));
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Warden summary cards â€” all real counts from the database:
//   totalStudents â†’ registered students, pendingCount â†’ requests waiting for
//   warden approval, approvedToday â†’ warden approvals since midnight,
//   expiredCount â†’ outpasses whose return time has passed.
// ---------------------------------------------------------------------------
export const getWardenStats = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    await rejectExpiredWardenOutpasses();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalStudents, pendingCount, approvedToday, expiredCount] = await Promise.all([
      User.countDocuments({ role: 'Student' }),
      Outpass.countDocuments({
        status: 'Pending',
        wardenStatus: 'Pending',
      }),
      Outpass.countDocuments({
        'approvedBy.role': 'Warden',
        'approvedBy.date': { $gte: startOfToday },
      }),
      Outpass.countDocuments({ status: 'Expired' }),
    ]);

    res.json({ totalStudents, pendingCount, approvedToday, expiredCount });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Sister summary cards — same shape as the Warden stats but counted from the
// Sister's point of view: pendingApprovals → HOD-approved requests waiting
// for Sister, approvedToday → Sister approvals since midnight.
// ---------------------------------------------------------------------------
export const getSisterStats = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalStudents, pendingApprovals, approvedToday, expiredOutpasses] = await Promise.all([
      User.countDocuments({ role: 'Student' }),
      Outpass.countDocuments({
        status: 'Pending',
        sisterStatus: { $in: ['Pending', 'NotRequired'] },
      }),
      Outpass.countDocuments({
        'approvedBy.role': 'Sister',
        'approvedBy.date': { $gte: startOfToday },
      }),
      Outpass.countDocuments({ status: 'Expired' }),
    ]);

    res.json({ totalStudents, pendingApprovals, approvedToday, expiredOutpasses });
  } catch (error) {
    next(error);
  }
};



