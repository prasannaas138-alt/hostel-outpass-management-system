import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Create one in-app notification per Sister/Warden when a new outpass is submitted.
// Failures must never block the outpass creation, so callers can fire-and-forget this.
export const notifyNewOutpass = async (outpass) => {
  try {
    const recipients = await User.find({ role: { $in: ['Sister', 'Warden'] } }).select('_id role');

    if (!recipients.length || !outpass) {
      return;
    }

    await Notification.insertMany(
      recipients.map((user) => ({
        recipient: user._id,
        role: user.role,
        outpass: outpass._id,
        studentName: outpass.studentName,
        requestType: outpass.requestType,
      }))
    );
  } catch (error) {
    // Notifications are non-critical: log and continue.
    console.error('Failed to create outpass notifications:', error.message);
  }
};

// Once a request is reviewed (approved/rejected) it no longer needs attention,
// so mark its notifications read to keep unread counts truthful.
// Pass a role to mark only that role's notifications (e.g. Sister approved -> Sister's copy read,
// Warden's copy stays unread because the request is still awaiting Warden review).
export const markOutpassNotificationsRead = async (outpassId, role = null) => {
  try {
    const filter = { outpass: outpassId, read: false };
    if (role) {
      filter.role = role;
    }

    await Notification.updateMany(filter, { $set: { read: true } });
  } catch (error) {
    console.error('Failed to update outpass notifications:', error.message);
  }
};
