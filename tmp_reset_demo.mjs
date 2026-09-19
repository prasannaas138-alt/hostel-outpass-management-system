import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const requiredEnvVars = [
  'DEMO_WARDEN_PASSWORD',
  'DEMO_SISTER_PASSWORD',
  'DEMO_HOD_PASSWORD',
  'DEMO_STUDENT_PASSWORD',
];

for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

const reset = async () => {
  await connectDB();

  const accounts = [
    { role: 'Warden', name: 'Demo Warden', email: 'warden@demo.com', password: process.env.DEMO_WARDEN_PASSWORD },
    { role: 'Sister', name: 'Demo Sister', email: 'sister@demo.com', password: process.env.DEMO_SISTER_PASSWORD },
    { role: 'HOD', name: 'Demo HOD', email: 'hod@demo.com', password: process.env.DEMO_HOD_PASSWORD },
    { role: 'Student', name: 'Demo Student', email: 'student@demo.com', password: process.env.DEMO_STUDENT_PASSWORD },
  ];

  for (const a of accounts) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(a.password, salt);
    const result = await User.updateOne(
      { role: a.role },
      { $set: { name: a.name, email: a.email, password: hash } }
    );
    console.log(`Reset ${a.role}: ${result.matchedCount} matched, ${result.modifiedCount} modified`);
  }

  await mongoose.disconnect();
  console.log('Done.');
};

reset().catch((e) => { console.error(e); process.exit(1); });