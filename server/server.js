import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { seedDemoUsers } from './scripts/seedDemoUsers.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log('Database connected');
    return seedDemoUsers();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
