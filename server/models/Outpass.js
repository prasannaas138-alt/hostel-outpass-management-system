import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Permanent Outpass ID sequence (HOMS-SJU-001, HOMS-SJU-002, ...)
//
// Stored in a dedicated MongoDB counter collection and incremented with an
// atomic `findOneAndUpdate` + `$inc` + `upsert`. This means:
//   - two simultaneous creations can never receive the same number,
//   - the sequence survives server restarts and redeployments,
//   - the ID is assigned exactly once, on creation, and never changes.
// It is NEVER derived from array length, React state, or localStorage.
// ---------------------------------------------------------------------------
const outpassIdCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const OutpassIdCounter = mongoose.model('OutpassIdCounter', outpassIdCounterSchema);

export const getNextOutpassId = async () => {
  const counter = await OutpassIdCounter.findOneAndUpdate(
    { _id: 'outpassId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `HOMS-SJU-${String(counter.seq).padStart(3, '0')}`;
};

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
    outpassId: {
      type: String,
      unique: true,
      sparse: true,
    },
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
    registerNumber: {
      type: String,
      trim: true,
      default: '',
    },
    roomNumber: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    parentPhone: {
      type: String,
      trim: true,
      default: '',
    },
    hostelName: {
      type: String,
      trim: true,
      default: '',
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
    returnDate: {
      type: Date,
      default: null,
    },
    destination: {
      type: String,
      trim: true,
      default: '',
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
      enum: ['Pending', 'Approved', 'Rejected', 'Expired'],
      default: 'Pending',
    },
    hodStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Expired', 'NotRequired'],
      default: 'NotRequired',
    },
    sisterStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Expired', 'NotRequired'],
      default: 'NotRequired',
    },
    wardenStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Expired', 'NotRequired'],
      default: 'Pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    approvedBy: [approvalEntrySchema],
  },
  {
    timestamps: true,
  }
);

// Permanent ID: assigned exactly once, when the document is first created.
// Reapplied / edited / approved requests keep the same outpassId forever.
outpassSchema.pre('validate', async function () {
  if (this.isNew && !this.outpassId) {
    this.outpassId = await getNextOutpassId();
  }
});

const Outpass = mongoose.model('Outpass', outpassSchema);

// One-time, idempotent migration for outpasses created before the ID
// existed: assigns permanent IDs in chronological order (oldest outpass
// = HOMS-SJU-001). Runs on every server start but only touches documents
// that still miss an outpassId, so existing IDs are never regenerated.
export const backfillOutpassIds = async () => {
  const missing = await Outpass.find({ outpassId: { $exists: false } })
    .sort({ createdAt: 1 })
    .select('_id');

  for (const outpass of missing) {
    outpass.outpassId = await getNextOutpassId();
    await outpass.save();
  }

  return missing.length;
};

export default Outpass;
