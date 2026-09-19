import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const reset = async () => {
  await connectDB();

  const accounts = [
    { role: 'Warden', name: 'Demo Warden', email: 'warden@demo.com', password: process.env.DEMO_WARDEN_PASSWORD || 'demo1234' },
    { role: 'Sister', name: 'Demo Sister', email: 'sister@demo.com', password: process.env.DEMO_SISTER_PASSWORD || 'demo1234' },
    { role: 'HOD', name: 'Demo HOD', email: 'hod@demo.com', password: process.env.DEMO_HOD_PASSWORD || 'demo1234' },
    { role: 'Student', name: 'Demo Student', email: 'student@demo.com', password: process.env.DEMO_STUDENT_PASSWORD || 'demo1234' },
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