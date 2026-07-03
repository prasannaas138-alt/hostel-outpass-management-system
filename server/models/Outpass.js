import mongoose from 'mongoose';

const approvalEntrySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['HOD', 'Sister', 'Warden'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const outpassSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    requestType: {
      type: String,
      required: true,
      enum: ['Outing', 'Home'],
    },
    date: {
      type: Date,
      required: true,
    },
    outTime: {
      type: String,
      required: true,
    },
    returnTime: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    hodStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'NotRequired'],
      default: 'NotRequired',
    },
    sisterStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'NotRequired'],
      default: 'NotRequired',
    },
    wardenStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'NotRequired'],
      default: 'Pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: [approvalEntrySchema],
  },
  {
    timestamps: true,
  }
);

const Outpass = mongoose.model('Outpass', outpassSchema);

export default Outpass;
