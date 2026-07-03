import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const demoUsers = [
  {
    name: 'Demo Student',
    email: 'student@hostel.com',
    password: 'Pass@123',
    role: 'Student',
    department: 'CSE',
    year: '2',
  },
  {
    name: 'Demo HOD',
    email: 'hod@hostel.com',
    password: 'Pass@123',
    role: 'HOD',
    department: 'CSE',
    year: 'NA',
  },
  {
    name: 'Demo Sister',
    email: 'sister@hostel.com',
    password: 'Pass@123',
    role: 'Sister',
    department: 'Hostel',
    year: 'NA',
  },
  {
    name: 'Demo Warden',
    email: 'warden@hostel.com',
    password: 'Pass@123',
    role: 'Warden',
    department: 'Hostel',
    year: 'NA',
  },
];

const seed = async () => {
  await connectDB();

  for (const userData of demoUsers) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      await User.create(userData);
    }
  }

  console.log('Demo users seeded successfully');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Failed to seed demo users', error);
  process.exit(1);
});
