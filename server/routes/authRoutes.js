import { Router } from 'express';
import {
  changeMyPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateCurrentUser);
router.put('/me/password', protect, changeMyPassword);

export default router;
