import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

// Student-only fields that HOD/Sister/Warden accounts must never require or
// store. Used both when seeding and when migrating existing staff accounts.
const STAFF_ONLY_FIELDS_TO_UNSET = [
  'registerNumber',
  'department',
  'hostelBlock',
  'hostelName',
  'roomNumber',
  'year',
];

// Default demo accounts — these are only created if they don't already exist.
// The server will NOT overwrite or reset existing users on startup.
// Staff credentials come from environment variables only — they are never
// hardcoded here, never sent to the frontend, and never committed to source.
const demoUsers = [
  {
    name: 'Demo Student',
    email: 'student@demo.com',
    registerNumber: 'STU1001',
    department: 'CSE',
    hostelBlock: 'A Block',
    roomNumber: 'A-101',
    phone: '+91 98765 43210',
    password: process.env.DEMO_STUDENT_PASSWORD,
    role: 'Student',
    year: '2',
  },
  {
    name: 'Demo HOD',
    email: 'hod@demo.com',
    password: process.env.DEMO_HOD_PASSWORD,
    role: 'HOD',
  },
  {
    name: 'Demo Sister',
    email: 'sister@demo.com',
    password: process.env.DEMO_SISTER_PASSWORD,
    role: 'Sister',
  },
  {
    name: 'Demo Warden',
    email: 'warden@demo.com',
    password: process.env.DEMO_WARDEN_PASSWORD,
    role: 'Warden',
  },
];

const unsetStaffFields = STAFF_ONLY_FIELDS_TO_UNSET.reduce((acc, field) => {
  acc[field] = '';
  return acc;
}, {});

export const seedDemoUsers = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Fail fast if a required demo credential is missing — never fall back to a
  // hardcoded password in source code.
  for (const userData of demoUsers) {
    if (!userData.password) {
      throw new Error(`Missing environment variable for ${userData.role} demo password.`);
    }
  }

  console.log('Checking demo accounts...');

  for (const userData of demoUsers) {
    const { email, role } = userData;

    // Match by BOTH email and role — the same email can legitimately exist
    // under multiple roles (e.g. a staff member who is also a student).
    const exists = await User.findOne({ email, role });

    if (!exists) {
      await User.create(userData);
      console.log(`Created demo account: ${email} [${role}]`);
    } else {
      console.log(`Demo account already exists: ${email} [${role}] — leaving unchanged`);
    }
  }

  // Migrate existing staff accounts: strip any leftover student-only fields so
  // future profile updates never validate against them. This is idempotent
  // and never touches Student accounts.
  for (const role of ['HOD', 'Sister', 'Warden']) {
    const result = await User.updateMany({ role }, { $unset: unsetStaffFields });
    if (result.modifiedCount > 0) {
      console.log(`Migrated ${result.modifiedCount} ${role} account(s) — removed student-only fields.`);
    }
  }

  console.log('Demo account check complete.');
};

// Allow running directly: node scripts/seedDemoUsers.js
if (process.argv[1] && process.argv[1].endsWith('seedDemoUsers.js')) {
  seedDemoUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to seed demo users:', error);
      process.exit(1);
    });
}