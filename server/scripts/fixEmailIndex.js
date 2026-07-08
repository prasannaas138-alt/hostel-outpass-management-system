/**
 * Migration script: Fix the User collection index.
 *
 * The old schema had `unique: true` on the `email` field alone,
 * which prevents the same email from being used across multiple roles.
 *
 * This script:
 *  1. Drops the old single-field `email_1` unique index (if it exists).
 *  2. Creates the correct compound `email_1_role_1` unique index.
 *
 * Run once with:  node scripts/fixEmailIndex.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

async function fixIndex() {
  await connectDB();

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  // List all current indexes
  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map((i) => i.name));

  // Drop the old single-field email unique index if present
  const hasOldIndex = indexes.some((i) => i.name === 'email_1');
  if (hasOldIndex) {
    await collection.dropIndex('email_1');
    console.log('✅ Dropped old email_1 unique index');
  } else {
    console.log('ℹ️  Old email_1 index not found, nothing to drop');
  }

  // Ensure the correct compound index exists
  await collection.createIndex({ email: 1, role: 1 }, { unique: true });
  console.log('✅ Created compound email_1_role_1 unique index');

  // Show final index list
  const finalIndexes = await collection.indexes();
  console.log('Final indexes:', finalIndexes.map((i) => i.name));

  await mongoose.disconnect();
  console.log('Done.');
}

fixIndex().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
