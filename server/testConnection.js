import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected Successfully");
  process.exit(0);
} catch (err) {
  console.error("❌ Connection Error");
  console.error(err);
  process.exit(1);
}