import { Router } from 'express';
import {
  deleteMonthlyOutpasses,
  downloadMonthlyExcel,
  getMonthlyOverview,
} from '../controllers/monthlyDownloadController.js';
import { authorizeRoles, protect } from '../middleware/auth.js';

const router = Router();

// The monthly archive is an HOD-only administrative tool. Guarding the whole
// router means a Student, Sister or Warden receives 403 even if they call the
// delete endpoint directly, not just when the React button is hidden.
router.use(protect, authorizeRoles('HOD'));

// Completed months overview (real counts from the `outpasses` collection).
router.get('/', getMonthlyOverview);

// Download a completed month as .xlsx, e.g. September-2026-OutpassHistory.xlsx
router.get('/:year/:month/download', downloadMonthlyExcel);

// Permanently delete that month's real outpass documents from MongoDB.
router.delete('/:year/:month', deleteMonthlyOutpasses);

export default router;
