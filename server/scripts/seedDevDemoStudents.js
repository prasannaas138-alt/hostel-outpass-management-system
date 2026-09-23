import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

// In-process equivalent of the --dns-result-order=ipv4first flag the other npm
// scripts pass on the CLI, so the exact documented command
// `npm run seed:dev` resolves DNS the same way as `npm run seed`.
dns.setDefaultResultOrder('ipv4first');

// ---------------------------------------------------------------------------
// DEVELOPMENT-ONLY seeder for Demo Student 1 / 2 / 3.
//
// - NEVER imported by server.js, so it NEVER runs on server startup. The
//   production (Render) deployment only ever runs seedDemoUsers.js — that
//   shared script is intentionally left untouched by this file.
// - Connects through config/db.js, i.e. whatever MONGO_URI points at. With the
//   local untracked .env pointing at HOMS_DEVELOPMENT, these accounts exist
//   only inside the development database and can never meet production data.
// - Passwords come from environment variables only (fail fast when missing) —
//   nothing is hardcoded in source, no backdoor, normal User model + the
//   existing bcrypt pre-save hashing + normal role authorization.
// - Idempotent: existing accounts are detected by email + role and left
//   unchanged, so running it any number of times is safe.
// ---------------------------------------------------------------------------
const demoStudents = [
  {
    name: 'Demo Student 1',
    email: 'student1@demo.com',
    registerNumber: 'STU2001',
    department: 'CSE',
    hostelBlock: 'A Block',
    roomNumber: 'B-201',
    phone: '+91 98765 43211',
    password: process.env.DEMO_STUDENT1_PASSWORD,
    role: 'Student',
    year: '1',
    batch: '2025-2029',
  },
  {
    name: 'Demo Student 2',
    email: 'student2@demo.com',
    registerNumber: 'STU2002',
    department: 'CSE',
    hostelBlock: 'A Block',
    roomNumber: 'B-202',
    phone: '+91 98765 43212',
    password: process.env.DEMO_STUDENT2_PASSWORD,
    role: 'Student',
    year: '2',
    batch: '2025-2029',
  },
  {
    name: 'Demo Student 3',
    email: 'student3@demo.com',
    registerNumber: 'STU2003',
    department: 'ECE',
    hostelBlock: 'A Block',
    roomNumber: 'B-203',
    phone: '+91 98765 43213',
    password: process.env.DEMO_STUDENT3_PASSWORD,
    role: 'Student',
    year: '3',
    batch: '2025-2029',
  },
];

export const seedDevDemoStudents = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Fail fast if a required demo credential is missing — never fall back to a
  // hardcoded password in source.
  for (const userData of demoStudents) {
    if (!userData.password) {
      throw new Error(
        `Missing environment variable for ${userData.role} ${userData.name} (DEMO_STUDENT1/2/3_PASSWORD).`
      );
    }
  }

  // Safe to display: the database NAME only (never the connection URI).
  console.log(`Development database: ${mongoose.connection.name}`);
  console.log('Checking development demo students...');

  for (const userData of demoStudents) {
    const { email, role } = userData;

    // Idempotency: match by email + role (same convention as seedDemoUsers).
    const exists = await User.findOne({ email, role });

    if (!exists) {
      await User.create(userData); // bcrypt pre-save hook hashes the password
      console.log(`Created demo account: ${email} [${role}]`);
    } else {
      console.log(`Demo account already exists: ${email} [${role}] — leaving unchanged`);
    }
  }

  console.log('Development demo student check complete.');
};

// Standalone execution only: `npm run seed:dev` -> node scripts/seedDevDemoStudents.js
// This file is never imported by the server, so production never executes it.
if (process.argv[1] && process.argv[1].endsWith('seedDevDemoStudents.js')) {
  seedDevDemoStudents()
    .then(() => process.exit(0))
    .catch((error) => {
      // Defensive scrub: never let a connection error print URI credentials.
      const safeMessage = String(error?.message || error).replace(
        /\/\/[^@\s]+@/g,
        '//***@'
      );
      console.error('Failed to seed development demo students:', safeMessage);
      process.exit(1);
    });
}
