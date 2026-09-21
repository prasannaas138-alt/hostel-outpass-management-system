import Outpass from '../models/Outpass.js';
import User from '../models/User.js';
import { createOutpassPdf } from '../utils/pdf.js';
import { notifyNewOutpass, markOutpassNotificationsRead } from '../services/notificationService.js';

const ACTIVE_STATUSES = ['Pending', 'Approved'];

// Student profile fields every approver (HOD / Sister / Warden) must see on review.
const STUDENT_POPULATE = 'name registerNumber roomNumber phone parentPhone parentGuardianName hostelName department year batch';

// Flattens the populated student profile onto the outpass so review screens and
// history tables can read registerNumber / roomNumber / phone / parentPhone /
// parentGuardianName / batch / hostelName directly from the student's LIVE
// database values (never hardcoded).
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

const buildExpiresAt = (date, returnDate, returnTime) => {
  // The request expires at the end of the return time on the chosen day.
  const [returnHour, returnMinute] = String(returnTime).split(':').map(Number);
  const expiresAt = new Date(returnDate || date);
  expiresAt.setHours(returnHour, returnMinute, 0, 0);
  return expiresAt;
};

const isExpiredNow = (outpass) => {
  return Boolean(outpass.expiresAt && new Date(outpass.expiresAt).getTime() <= Date.now());
};

const refreshExpiredOutpasses = async () => {
  const now = new Date();

  // Only the overall status becomes Expired. The approval trail stays intact for history and PDFs.
  await Outpass.updateMany(
    {
      status: { $in: ACTIVE_STATUSES },
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: 'Expired',
      },
    }
  );
};

// Auto-rejects pending Warden outpasses whose Out Date + Out Time has passed.
// This runs inside existing Warden endpoints so expired requests are rejected
// with the exact reason before they are shown or reviewed.
const WARDEN_EXPIRED_REJECTION_REASON = 'Automatically rejected: outpass expired at Out Date + Out Time';

const buildOutTimeExpiry = (outpass) => {
  const [hour, minute] = String(outpass.outTime || '00:00').split(':').map(Number);
  const expiresAt = new Date(outpass.date);
  expiresAt.setHours(hour, minute, 0, 0);
  return expiresAt;
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

    const { requestType, date, returnDate, outTime, returnTime, reason, destination } = req.body;

    if (!requestType || !date || !returnDate || !outTime || !returnTime || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
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

    const { requestType, date, returnDate, outTime, returnTime, reason, destination } = req.body;

    outpass.requestType = requestType || outpass.requestType;
    outpass.date = date || outpass.date;
    outpass.returnDate = returnDate || outpass.returnDate || outpass.date;
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

    res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const getMyOutpasses = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    const outpasses = await Outpass.find({ studentId: req.user._id }).sort({ createdAt: -1 });
    res.json(outpasses);
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

    res.json(outpass);
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

    res.json(outpasses.map(enrichOutpass));
  } catch (error) {
    next(error);
  }
};

export const getPendingSisterRequests = async (req, res, next) => {
  try {
    await refreshExpiredOutpasses();
    // Sister queue — TWO entry paths:
    //   Outing: Sister is the FIRST reviewer (Student -> Sister -> Warden).
    //   Home:   Sister reviews after the HOD approves.
    const outpasses = await Outpass.find({
      status: 'Pending',
      sisterStatus: 'Pending',
      $or: [
        { requestType: 'Outing' },
        { requestType: 'Home', hodStatus: 'Approved' },
      ],
    }).sort({ createdAt: -1 }).populate('studentId', STUDENT_POPULATE).lean();

    res.json(outpasses.map(enrichOutpass));
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

    res.json(outpasses.map(enrichOutpass));
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
      return res.json(outpass);
    }

    outpass.hodStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.sisterStatus = 'NotRequired';
    outpass.wardenStatus = 'NotRequired';
    outpass.rejectionReason = rejectionReason || 'Rejected by HOD';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
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

    // Sister reviews: Outing directly (she is the first reviewer) and
    // Home requests after the HOD has approved them.
    const allowedForSister =
      outpass &&
      outpass.status === 'Pending' &&
      outpass.sisterStatus === 'Pending' &&
      !isExpiredNow(outpass) &&
      (outpass.requestType === 'Outing' ||
        (outpass.requestType === 'Home' && outpass.hodStatus === 'Approved'));

    if (!allowedForSister) {
      return res.status(400).json({ message: 'Request is not available for Sister review' });
    }

    if (action === 'approve') {
      outpass.sisterStatus = 'Approved';
      outpass.wardenStatus = 'Pending';
      outpass.approvedBy.push(buildApprovedByEntry('Sister', req.user._id));
      await outpass.save();
      await markOutpassNotificationsRead(outpass._id, 'Sister');
      return res.json(outpass);
    }

    outpass.sisterStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.wardenStatus = 'NotRequired';
    outpass.rejectionReason = rejectionReason || 'Rejected by Sister';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
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

    // Approval sequence (backend-enforced, not just UI):
    //   Outing -> Warden override: may approve/reject at any time.
    //   Home   -> HOD and Sister must both approve before Warden acts.
    if (
      outpass.requestType === 'Home' &&
      (outpass.hodStatus !== 'Approved' || outpass.sisterStatus !== 'Approved')
    ) {
      return res.status(400).json({
        message: 'Warden can review a Home request only after HOD and Sister approval',
      });
    }

    if (action === 'approve') {
      outpass.wardenStatus = 'Approved';
      outpass.status = 'Approved';
      outpass.expiresAt = buildExpiresAt(outpass.date, outpass.returnDate, outpass.returnTime);
      outpass.approvedBy.push(buildApprovedByEntry('Warden', req.user._id));
      await outpass.save();
      await markOutpassNotificationsRead(outpass._id);
      return res.json(outpass);
    }

    outpass.wardenStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.rejectionReason = rejectionReason || 'Rejected by Warden';
    await outpass.save();
    await markOutpassNotificationsRead(outpass._id);
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
    res.json(outpasses.map(enrichOutpass));
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
    res.json(outpasses.map(enrichOutpass));
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

    res.json(
      outpasses.map((outpass) => ({
        ...outpass,
        registerNumber: outpass.registerNumber || outpass.studentId?.registerNumber || '',
        roomNumber: outpass.roomNumber || outpass.studentId?.roomNumber || '',
        phone: outpass.phone || outpass.studentId?.phone || '',
        parentPhone: outpass.parentPhone || outpass.studentId?.parentPhone || '',
        hostelName: outpass.hostelName || outpass.studentId?.hostelName || outpass.studentId?.hostelBlock || '',
      }))
    );
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
        sisterStatus: 'Pending',
        $or: [
          { requestType: 'Outing' },
          { requestType: 'Home', hodStatus: 'Approved' },
        ],
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



