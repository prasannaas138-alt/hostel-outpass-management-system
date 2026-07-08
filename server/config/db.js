import mongoose from 'mongoose';
import dns from 'dns';

// Force Node.js to use Google's public DNS (8.8.8.8) for SRV lookups.
// The local/system DNS on this machine does not support SRV queries,
// which are required by the mongodb+srv:// connection scheme.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully');
};

export default connectDB;
