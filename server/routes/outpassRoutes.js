import { Router } from 'express';
import {
  createOutpass,
  downloadOutpassPdf,
  getMyOutpasses,
  getOutpassById,
  getPendingHodRequests,
  getPendingSisterRequests,
  getPendingWardenRequests,
  hodReviewOutpass,
  sisterReviewOutpass,
  updateOutpass,
  wardenReviewOutpass,
} from '../controllers/outpassController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, authorizeRoles('Student'), createOutpass);
router.put('/:id', protect, authorizeRoles('Student'), updateOutpass);
router.get('/me', protect, authorizeRoles('Student'), getMyOutpasses);
router.get('/pending/hod', protect, authorizeRoles('HOD'), getPendingHodRequests);
router.get('/pending/sister', protect, authorizeRoles('Sister'), getPendingSisterRequests);
router.get('/pending/warden', protect, authorizeRoles('Warden'), getPendingWardenRequests);
router.get('/:id', protect, getOutpassById);
router.get('/:id/pdf', protect, downloadOutpassPdf);
router.patch('/:id/hod', protect, authorizeRoles('HOD'), hodReviewOutpass);
router.patch('/:id/sister', protect, authorizeRoles('Sister'), sisterReviewOutpass);
router.patch('/:id/warden', protect, authorizeRoles('Warden'), wardenReviewOutpass);

export default router;
