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
    password: 'demo1234',
    role: 'Student',
    department: 'CSE',
    year: '2',
  },
  {
    name: 'Demo HOD',
    email: 'hod@demo.com',
    password: 'demo1234',
    role: 'HOD',
    department: 'CSE',
    year: 'NA',
  },
  {
    name: 'Demo Sister',
    email: 'sister@demo.com',
    password: 'demo1234',
    role: 'Sister',
    department: 'Hostel',
    year: 'NA',
  },
  {
    name: 'Demo Warden',
    email: 'warden@demo.com',
    password: 'demo1234',
    role: 'Warden',
    department: 'Hostel',
    year: 'NA',
  },
];

export const seedDemoUsers = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  console.log('Checking demo accounts...');

  for (const userData of demoUsers) {
    // Only create if this exact (email + role) pair does not yet exist.
    // We never overwrite existing users so real registered accounts are safe.
    const exists = await User.findOne({ email: userData.email, role: userData.role });

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
