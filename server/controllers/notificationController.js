import Notification from '../models/Notification.js';

// List the signed-in Sister/Warden notifications, newest first, with an unread count.
// Only existing outpass data fields are exposed (student name, request type, status via outpass ref).
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('outpass', 'status hodStatus sisterStatus wardenStatus');

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
