import mongoose from 'mongoose';
import crypto from 'crypto';
import { HOSTEL_NAMES } from './User.js';

// ---------------------------------------------------------------------------
// Gate = one permanent physical gate of the hostel.
//
// The gate owns ONE permanent QR at the door. The QR is deliberately NOT a
// credential: it only tells the backend WHICH gate was scanned. A scan is
// authorized by the student's existing JWT plus the backend movement state
// machine, so no student information, no outpass id and no token is ever
// encoded in the QR.
//
//   code    -> stable, human readable identity (staff screens, exports, gate
//              usage reports, WhatsApp / notification text). The gates are a
//              small, fixed list of physical assets maintained by staff, so a
//              slug is more honest than a generated sequence - this is NOT the
//              Outpass HOMS-SJU-nnn counter pattern and must not copy it.
//   qrToken -> opaque random value encoded in the printed QR. Kept SEPARATE
//              from `code` so a copied or leaked QR can be rotated (reprint
//              the QR) without changing the gate's identity or breaking the
//              movement history that references the gate.
//
// Hostel scoping uses the same HOSTEL_NAMES list as the User model, so the two
// can never drift. An empty hostelName means "gate shared by all hostels",
// which covers today's single main gate while already supporting multiple and
// hostel specific gates without a schema change.
//
// There is no update/delete API for gates: temporarily closing a gate is done
// by setting `active` to false, which never rewrites history.
// ---------------------------------------------------------------------------

// Format marker of the future QR payload: "HOMS1:<qrToken>". The prefix lets
// the scanner reject foreign QR codes locally and gives the payload a version.
export const GATE_TOKEN_PREFIX = 'HOMS1:';

// 32 random bytes as base64url = 43 URL-safe characters. Not guessable and it
// reveals nothing about the gate. Uses only the built-in Node crypto module,
// so no package is installed for this.
export const generateGateToken = () => crypto.randomBytes(32).toString('base64url');

const gateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // No default on purpose: the pre-validate hook below always generates a
    // fresh opaque token, so a gate can never be stored without one. Only the
    // raw token is stored here - GATE_TOKEN_PREFIX is added when the QR image
    // is drawn, in a later phase.
    qrToken: {
      type: String,
      required: true,
      trim: true,
    },
    hostelName: {
      type: String,
      trim: true,
      enum: ['', ...HOSTEL_NAMES],
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    // false = temporarily disabled (repair, closed for the night, ...). Scans
    // against an inactive gate are rejected and audited by the scan endpoint,
    // never silently accepted.
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Same guard as the Outpass model: the permanent value is assigned exactly
// once, when the document is first created. Later saves keep the existing
// token, so reprinting a QR never invalidates movement history.
gateSchema.pre('validate', function ensureQrToken() {
  if (this.isNew && !this.qrToken) {
    this.qrToken = generateGateToken();
  }
});

// Gate identity: one document per gate code.
gateSchema.index({ code: 1 }, { unique: true });

// QR resolution hot path (qrToken -> gate). Unique so two gates can never
// share the same QR value.
gateSchema.index({ qrToken: 1 }, { unique: true });

// Gate lists and active gate pickers, optionally scoped to one hostel.
gateSchema.index({ active: 1, hostelName: 1 });

const Gate = mongoose.model('Gate', gateSchema);

export default Gate;
