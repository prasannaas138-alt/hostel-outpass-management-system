import { Router } from 'express';
import {
  getStaffLiveMovements,
  getMyLiveMovements,
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

// The Student Live Movement page reads only the authenticated student's own
// movements from the same read-only snapshot query (identity from the JWT).
router.get('/my/live', protect, authorizeRoles('Student'), getMyLiveMovements);
router.patch('/:id/report', protect, authorizeRoles('Warden'), updateMovementReport);

export default router;
