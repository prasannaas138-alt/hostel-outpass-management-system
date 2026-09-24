import { Router } from 'express';
import {
  getStaffLiveMovements,
  scanGateQr,
  updateMovementReport,
} from '../controllers/movementController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

// A gate scan is always performed by the authenticated student for their own
// movement: the student identity comes from the JWT, and the role guard means a
// Student token is required (the existing roles, no new authentication).
router.post('/scan', protect, authorizeRoles('Student'), scanGateQr);

// Initial read-only movement snapshot for the staff dashboards. The same
// visibility is intentionally shared by HOD, Sister, and Warden; no hostel
// filtering or movement mutation is added here.
router.get('/staff/live', protect, authorizeRoles('HOD', 'Sister', 'Warden'), getStaffLiveMovements);
router.patch('/:id/report', protect, authorizeRoles('Warden'), updateMovementReport);

export default router;
