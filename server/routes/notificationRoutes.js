import { Router } from 'express';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

// In-app notifications for review roles only. All routes require authentication.
router.get('/', protect, authorizeRoles('Sister', 'Warden'), getMyNotifications);
router.patch('/read-all', protect, authorizeRoles('Sister', 'Warden'), markAllNotificationsRead);
router.patch('/:id/read', protect, authorizeRoles('Sister', 'Warden'), markNotificationRead);

export default router;
