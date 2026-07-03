import Outpass from '../models/Outpass.js';
import { isWeekend } from '../utils/date.js';
import { createOutpassPdf } from '../utils/pdf.js';

const buildApprovedByEntry = (role, userId) => ({
  role,
  user: userId,
  date: new Date(),
});

const resetForReapply = (outpass) => {
  outpass.status = 'Pending';
  outpass.hodStatus = outpass.requestType === 'Home' ? 'Pending' : 'NotRequired';
  outpass.sisterStatus = 'NotRequired';
  outpass.wardenStatus = 'Pending';
  outpass.rejectionReason = '';
  outpass.approvedBy = [];
};

export const createOutpass = async (req, res, next) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({ message: 'Only students can apply for outpass' });
    }

    const { requestType, date, outTime, returnTime, reason } = req.body;

    if (!requestType || !date || !outTime || !returnTime || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (requestType === 'Outing' && !isWeekend(date)) {
      return res.status(400).json({ message: 'Outing requests are allowed only on weekends' });
    }

    const outpass = await Outpass.create({
      studentId: req.user._id,
      studentName: req.user.name,
      department: req.user.department,
      year: req.user.year,
      requestType,
      date,
      outTime,
      returnTime,
      reason,
      hodStatus: requestType === 'Home' ? 'Pending' : 'NotRequired',
      sisterStatus: 'NotRequired',
      wardenStatus: 'Pending',
    });

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

    const { requestType, date, outTime, returnTime, reason } = req.body;

    outpass.requestType = requestType || outpass.requestType;
    outpass.date = date || outpass.date;
    outpass.outTime = outTime || outpass.outTime;
    outpass.returnTime = returnTime || outpass.returnTime;
    outpass.reason = reason || outpass.reason;
    outpass.department = req.user.department;
    outpass.year = req.user.year;
    outpass.studentName = req.user.name;

    if (outpass.requestType === 'Outing' && !isWeekend(outpass.date)) {
      return res.status(400).json({ message: 'Outing requests are allowed only on weekends' });
    }

    resetForReapply(outpass);
    await outpass.save();

    res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const getMyOutpasses = async (req, res, next) => {
  try {
    const outpasses = await Outpass.find({ studentId: req.user._id }).sort({ createdAt: -1 });
    res.json(outpasses);
  } catch (error) {
    next(error);
  }
};

export const getOutpassById = async (req, res, next) => {
  try {
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found' });
    }

    const isOwner = String(outpass.studentId) === String(req.user._id);
    const isReviewer = ['HOD', 'Sister', 'Warden'].includes(req.user.role);

    if (!isOwner && !isReviewer) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const getPendingHodRequests = async (req, res, next) => {
  try {
    const outpasses = await Outpass.find({
      requestType: 'Home',
      hodStatus: 'Pending',
      status: 'Pending',
    }).sort({ createdAt: -1 });

    res.json(outpasses);
  } catch (error) {
    next(error);
  }
};

export const getPendingSisterRequests = async (req, res, next) => {
  try {
    const outpasses = await Outpass.find({
      requestType: 'Home',
      hodStatus: 'Approved',
      sisterStatus: 'Pending',
      status: 'Pending',
    }).sort({ createdAt: -1 });

    res.json(outpasses);
  } catch (error) {
    next(error);
  }
};

export const getPendingWardenRequests = async (req, res, next) => {
  try {
    const outpasses = await Outpass.find({
      status: 'Pending',
      $or: [
        {
          requestType: 'Outing',
          wardenStatus: 'Pending',
        },
        {
          requestType: 'Home',
          hodStatus: 'Approved',
          sisterStatus: 'Approved',
          wardenStatus: 'Pending',
        },
      ],
    }).sort({ createdAt: -1 });

    res.json(outpasses);
  } catch (error) {
    next(error);
  }
};

export const hodReviewOutpass = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass || outpass.requestType !== 'Home' || outpass.hodStatus !== 'Pending') {
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
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const sisterReviewOutpass = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    if (!outpass || outpass.requestType !== 'Home' || outpass.hodStatus !== 'Approved' || outpass.sisterStatus !== 'Pending') {
      return res.status(400).json({ message: 'Request is not available for Sister review' });
    }

    if (action === 'approve') {
      outpass.sisterStatus = 'Approved';
      outpass.wardenStatus = 'Pending';
      outpass.approvedBy.push(buildApprovedByEntry('Sister', req.user._id));
      await outpass.save();
      return res.json(outpass);
    }

    outpass.sisterStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.wardenStatus = 'NotRequired';
    outpass.rejectionReason = rejectionReason || 'Rejected by Sister';
    await outpass.save();
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const wardenReviewOutpass = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const outpass = await Outpass.findById(req.params.id);

    const allowedForWarden =
      outpass &&
      outpass.status === 'Pending' &&
      ((outpass.requestType === 'Outing' && outpass.wardenStatus === 'Pending') ||
        (outpass.requestType === 'Home' && outpass.hodStatus === 'Approved' && outpass.sisterStatus === 'Approved' && outpass.wardenStatus === 'Pending'));

    if (!allowedForWarden) {
      return res.status(400).json({ message: 'Request is not available for Warden review' });
    }

    if (action === 'approve') {
      outpass.wardenStatus = 'Approved';
      outpass.status = 'Approved';
      outpass.approvedBy.push(buildApprovedByEntry('Warden', req.user._id));
      await outpass.save();
      return res.json(outpass);
    }

    outpass.wardenStatus = 'Rejected';
    outpass.status = 'Rejected';
    outpass.rejectionReason = rejectionReason || 'Rejected by Warden';
    await outpass.save();
    return res.json(outpass);
  } catch (error) {
    next(error);
  }
};

export const downloadOutpassPdf = async (req, res, next) => {
  try {
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
      return res.status(400).json({ message: 'PDF is available only after approval' });
    }

    const pdf = createOutpassPdf(outpass);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="outpass-${outpass._id}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  } catch (error) {
    next(error);
  }
};
