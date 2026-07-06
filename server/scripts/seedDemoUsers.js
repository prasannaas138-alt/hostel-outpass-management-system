import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const demoUsers = [
  {
    name: 'Test Student',
    email: 'student@test.com',
    password: '123456',
    role: 'Student',
    department: 'CSE',
    year: '2',
  },
  {
    name: 'Test HOD',
    email: 'hod@test.com',
    password: '123456',
    role: 'HOD',
    department: 'CSE',
    year: 'NA',
  },
  {
    name: 'Test Sister',
    email: 'sister@test.com',
    password: '123456',
    role: 'Sister',
    department: 'Hostel',
    year: 'NA',
  },
  {
    name: 'Test Warden',
    email: 'warden@test.com',
    password: '123456',
    role: 'Warden',
    department: 'Hostel',
    year: 'NA',
  },
];

export const seedDemoUsers = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  console.log('Running demo user seeding');

  const userCount = await User.countDocuments();

  if (userCount > 0) {
    console.log('Users already exist, ensuring requested test users are present');
  }

  for (const userData of demoUsers) {
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      existingUser.name = userData.name;
      existingUser.password = userData.password;
      existingUser.role = userData.role;
      existingUser.department = userData.department;
      existingUser.year = userData.year;
      await existingUser.save();
      continue;
    }

    await User.create(userData);
  }

  console.log('Demo users seeded successfully');
};

if (process.argv[1] && process.argv[1].endsWith('seedDemoUsers.js')) {
  seedDemoUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to seed demo users', error);
      process.exit(1);
    });
}
