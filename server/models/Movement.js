import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Movement = the REAL physical movement of one student for one approved
// outpass.
//
// The existing Outpass stays the AUTHORIZATION ("you are allowed to go out").
// This collection only records what actually happened at the gate, so the HOD
// / Sister / Warden approval chain is not touched in any way.
//
// ONE document per outpass, created by the FIRST successful EXIT scan and
// completed once by the successful RETURN scan. There is deliberately no
// "NOT_EXITED" row: "approved but not yet exited" is simply the ABSENCE of a
// movement document, so nothing has to be backfilled for outpasses that are
// already approved, and the approval logic never has to write anything.
//
// The unique index on `outpass` is the database level guarantee that a second
// movement (EXIT -> EXIT, or EXIT -> RETURN -> EXIT) can never be created for
// the same outpass, even when two requests arrive at the same moment. The scan
// service still performs its atomic upsert / compare-and-swap; this index is
// the invariant backstop behind it.
//
// EXPECTED vs ACTUAL (the whole point of the model):
//
//   expectedExitAt / expectedReturnAt
//     The REQUESTED schedule, derived from the Outpass (date + outTime and
//     returnDate + returnTime) as an Asia/Kolkata (+05:30) instant using the
//     project's existing explicit-offset convention, then snapshotted here.
//     The snapshot keeps the audit readable even after the outpass is edited
//     or removed by the HOD monthly delete.
//
//   actualExitAt / actualReturnAt
//     The REAL scans, always taken from the server clock, never from the
//     client. actualReturnAt stays null while the student is outside - even
//     after expectedReturnAt has passed - so an overdue student can never be
//     mistaken for a returned one. There is NO upper time limit for RETURN:
//     expectedReturnAt only gates the START of the movement and the derived
//     "overdue / student was not coming" display, never the return itself.
//
// No human-readable movement id exists: the event is machine generated and
// machine consumed, and the human identity of the event is the permanent
// Outpass id, snapshotted in `outpassId`. Do NOT copy the HOMS-SJU-nnn counter
// pattern from the Outpass model into this collection.
// ---------------------------------------------------------------------------

// The only two persisted movement states. "Initial / not exited" is the
// absence of a document; every user facing wording ("Student goes Outside",
// "Student returned", "Student was not coming", "Student cannot use outpass")
// is DERIVED at read time and never stored, so display text can change without
// a data migration.
export const MOVEMENT_STATES = ['OUTSIDE', 'RETURNED'];

const movementSchema = new mongoose.Schema(
  {
    // Primary technical link to the authorization. ObjectIds never change, so
    // this stays reliable even when the student's profile fields are edited
    // later (protected fields are changed only through HOD approval).
    outpass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outpass',
      required: true,
    },
    // Snapshot of the permanent HOMS-SJU-nnn id. Required because the HOD
    // monthly delete removes the Outpass document itself - after that a join
    // is impossible and only this snapshot can still identify the outpass.
    outpassId: {
      type: String,
      required: true,
      trim: true,
    },
    // Authoritative student link, always the authenticated student
    // (req.user._id is read from the JWT at scan time, never from the client).
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Snapshots for audit, dashboards and exports. They are DISPLAY values and
    // must never be used as a join key, because registerNumber is a protected
    // field the HOD can change after the movement happened. The defaults match
    // the Outpass model, where the same two fields are optional.
    registerNumber: {
      type: String,
      trim: true,
      default: '',
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    hostelName: {
      type: String,
      trim: true,
      default: '',
    },
    // Planned schedule, snapshotted at EXIT (real IST instants).
    expectedExitAt: {
      type: Date,
      required: true,
    },
    expectedReturnAt: {
      type: Date,
      required: true,
    },
    // Actual movement. Both come from the server clock and each is written
    // exactly once: actualExitAt by the atomic EXIT claim, actualReturnAt by
    // the atomic RETURN compare-and-swap.
    actualExitAt: {
      type: Date,
      required: true,
    },
    actualReturnAt: {
      type: Date,
      default: null,
    },
    // Internal movement state. Deliberately separated from the user facing
    // wording - see the five derived display statuses in the design report.
    state: {
      type: String,
      enum: MOVEMENT_STATES,
      default: 'OUTSIDE',
      required: true,
    },
    // Which gate was physically used for each scan. The two may legitimately
    // differ once multiple gates exist.
    exitGate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gate',
      required: true,
    },
    exitGateCode: {
      type: String,
      required: true,
      trim: true,
    },
    returnGate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gate',
      default: null,
    },
    returnGateCode: {
      type: String,
      trim: true,
      default: null,
    },
    // Immutable audit fact recorded when the RETURN scan succeeds:
    // actualReturnAt > expectedReturnAt. It stays null while the student is
    // outside. The LIVE overdue condition (state OUTSIDE + expectedReturnAt
    // passed + now) is derived at read time and never stored, so it can never
    // go stale and never needs a background job.
    lateReturn: {
      type: Boolean,
      default: null,
    },
    // Warden's manual verification of the physical movement. This is
    // intentionally separate from `state`, which remains the server-derived
    // EXIT/RETURN status. A report can say "Not Returned" while the movement
    // state is still RETURNED, so the two concepts never overwrite each other.
    report: {
      type: String,
      enum: ['Returned', 'Not Returned'],
      default: null,
    },
    // Cross references to the append-only audit entries that produced the two
    // successful scans (server/models/ScanLog.js).
    exitScan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScanLog',
      default: null,
    },
    returnScan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScanLog',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Core invariant: exactly one movement per outpass. This is what makes
// "EXIT -> EXIT" and "EXIT -> RETURN -> RETURN" impossible at the database
// level, and it is also the lookup used for one outpass's movement history.
movementSchema.index({ outpass: 1 }, { unique: true });

// Currently outside (state OUTSIDE) and currently overdue
// (state OUTSIDE + expectedReturnAt < now) - the hottest dashboard query.
movementSchema.index({ state: 1, expectedReturnAt: 1 });

// Returned today / recent returns (state RETURNED + actualReturnAt range).
movementSchema.index({ state: 1, actualReturnAt: -1 });

// One student's movement history, and the "is this student already outside?"
// check that must run before an EXIT scan is accepted.
movementSchema.index({ student: 1, state: 1, actualExitAt: -1 });

// Hostel scoped "currently outside / overdue".
movementSchema.index({ hostelName: 1, state: 1, expectedReturnAt: 1 });

// Gate usage over a time range. The design report described this index
// conceptually as `gate`; the actual field is `exitGate`.
movementSchema.index({ exitGate: 1, actualExitAt: -1 });

const Movement = mongoose.model('Movement', movementSchema);

export default Movement;

