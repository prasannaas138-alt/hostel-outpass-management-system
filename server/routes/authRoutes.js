import { Router } from 'express';
import {
  changeMyPassword,
  getCurrentUser,
  getStudentProfile,
  loginUser,
  registerUser,
  updateCurrentUser,
  updateMyUsername,
} from '../controllers/authController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.get('/students/:id/profile', protect, authorizeRoles('HOD', 'Sister', 'Warden'), getStudentProfile);
router.put('/me', protect, updateCurrentUser);
router.put('/me/username', protect, authorizeRoles('HOD', 'Sister', 'Warden'), updateMyUsername);
router.put('/me/password', protect, changeMyPassword);

export default router;
