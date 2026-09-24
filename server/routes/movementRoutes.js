import { Router } from 'express';
import { scanGateQr } from '../controllers/movementController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

// A gate scan is always performed by the authenticated student for their own
// movement: the student identity comes from the JWT, and the role guard means a
// Student token is required (the existing roles, no new authentication).
router.post('/scan', protect, authorizeRoles('Student'), scanGateQr);

export default router;
