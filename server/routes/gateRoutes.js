import { Router } from 'express';
import {
  createGate,
  getGateById,
  getGateQrPayload,
  listGates,
} from '../controllers/gateController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

// Nothing here is public: every gate route requires a valid JWT, and a gate can
// only be managed by staff roles (the existing Student / HOD / Sister / Warden
// roles - no new authentication system).
router.use(protect);

// Gate information for the staff workflow. Reading is open to all three staff
// roles, exactly like the existing staff-readable outpass endpoints.
router.get('/', authorizeRoles('HOD', 'Sister', 'Warden'), listGates);
router.get('/:id', authorizeRoles('HOD', 'Sister', 'Warden'), getGateById);

// The permanent QR PAYLOAD is what gets printed and pinned at the physical
// gate, so it is limited to the two roles that manage gates on site.
router.get('/:id/qr', authorizeRoles('HOD', 'Warden'), getGateQrPayload);

// Creating a gate is an administrative setup action: HOD only, matching the
// existing HOD-only administrative convention used by the monthly archive
// routes. A Student can never create a gate, and the QR token is generated
// server-side by the Gate model in every case.
router.post('/', authorizeRoles('HOD'), createGate);

export default router;
