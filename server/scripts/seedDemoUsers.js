import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

// Default demo accounts — these are only created if they don't already exist.
// The server will NOT overwrite or reset existing users on startup.
const demoUsers = [
  {
    name: 'Demo Student',
    email: 'student@demo.com',
    registerNumber: 'STU1001',
    department: 'CSE',
    hostelBlock: 'A Block',
    roomNumber: 'A-101',
    password: 'demo1234',
    role: 'Student',
    year: '2',
  },
  {
    name: 'Demo HOD',
    email: 'hod@demo.com',
    registerNumber: 'HOD1001',
    department: 'CSE',
    hostelBlock: 'Staff Quarters',
    roomNumber: 'SQ-01',
    password: 'demo1234',
    role: 'HOD',
    year: 'NA',
  },
  {
    name: 'Demo Sister',
    email: 'sister@demo.com',
    registerNumber: 'SIS1001',
    department: 'Hostel',
    hostelBlock: 'Girls Block',
    roomNumber: 'GB-01',
    password: 'demo1234',
    role: 'Sister',
    year: 'NA',
  },
  {
    name: 'Demo Warden',
    email: 'warden@demo.com',
    registerNumber: 'WDR1001',
    department: 'Hostel',
    hostelBlock: 'Admin Block',
    roomNumber: 'AB-01',
    password: 'demo1234',
    role: 'Warden',
    year: 'NA',
  },
];

export const seedDemoUsers = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  console.log('Checking demo accounts...');

  for (const userData of demoUsers) {
    // Only create if this email does not yet exist.
    // We never overwrite existing users so real registered accounts are safe.
    const exists = await User.findOne({ email: userData.email });

    if (!exists) {
      await User.create(userData);
      console.log(`Created demo account: ${userData.email} [${userData.role}]`);
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
