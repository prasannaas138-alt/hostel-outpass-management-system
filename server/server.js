import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { seedDemoUsers } from './scripts/seedDemoUsers.js';
import { backfillOutpassIds } from './models/Outpass.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log('Database connected');
    return seedDemoUsers();
  })
  .then(() => backfillOutpassIds())
  .then((backfilled) => {
    if (backfilled > 0) {
      console.log(`Assigned permanent outpass IDs to ${backfilled} existing outpass(es)`);
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
