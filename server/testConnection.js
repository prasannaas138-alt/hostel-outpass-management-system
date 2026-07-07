import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

console.log("URI:", process.env.MONGO_URI);

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected Successfully");
  process.exit(0);
} catch (err) {
  console.error("❌ Connection Error");
  console.error(err);
  process.exit(1);
}