import { Router } from 'express';
import {
  changeMyPassword,
  getCurrentUser,
  getMyChangeRequests,
  getProfileChangeRequests,
  getStudentProfile,
  hodUpdateStudentProfile,
  listStudents,
  loginUser,
  registerUser,
  reviewProfileChangeRequest,
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

// Student: view own pending profile-change requests (HOD approval system).
router.get('/me/change-requests', protect, authorizeRoles('Student'), getMyChangeRequests);

// HOD: profile change requests (protected student fields) — HOD ONLY.
router.get('/change-requests', protect, authorizeRoles('HOD'), getProfileChangeRequests);
router.patch('/change-requests/:id', protect, authorizeRoles('HOD'), reviewProfileChangeRequest);

// HOD: Students Profile page + direct student profile editing (no approval).
router.get('/students', protect, authorizeRoles('HOD'), listStudents);
router.put('/students/:id/profile', protect, authorizeRoles('HOD'), hodUpdateStudentProfile);

export default router;
