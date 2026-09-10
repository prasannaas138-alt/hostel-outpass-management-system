import mongoose from 'mongoose';

// Simple in-app notification for review roles (Sister, Warden).
// Created when a student submits a new outpass request.
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['Sister', 'Warden'],
      required: true,
    },
    outpass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outpass',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    requestType: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
