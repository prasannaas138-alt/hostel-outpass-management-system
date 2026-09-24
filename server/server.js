import { createServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import User from './models/User.js';
import { seedDemoUsers } from './scripts/seedDemoUsers.js';
import { backfillOutpassIds } from './models/Outpass.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required but not set');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = 'hostel-outpass-management-system.vercel.app';
const STAFF_MOVEMENT_ROOM = 'staff:movements';
const STAFF_ROLES = new Set(['HOD', 'Sister', 'Warden']);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
});

app.set('io', io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.warn('Staff socket rejected: token missing');
    return next(new Error('Staff authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    const user = userId
      ? await User.findById(userId).select('name role registerNumber')
      : null;

    if (!user) {
      console.warn('Staff socket rejected: user not found');
      return next(new Error('Staff authentication failed'));
    }

    if (!STAFF_ROLES.has(user.role)) {
      console.warn('Staff socket rejected: role not permitted');
      return next(new Error('Staff access required'));
    }

    socket.data.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      registerNumber: user.registerNumber,
    };

    return next();
  } catch (error) {
    console.warn('Staff socket rejected: token invalid or expired');
    return next(new Error('Staff authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join(STAFF_MOVEMENT_ROOM);
  console.log(`Staff socket connected: ${socket.id} (${socket.data.user.role})`);

  socket.on('disconnect', () => {
    console.log(`Staff socket disconnected: ${socket.id}`);
  });
});

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
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
