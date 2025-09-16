import express from 'express';
import { getAllDepartments, createDepartment } from '../controllers/departmentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllDepartments);
router.post('/', requireRole(['admin', 'hr']), createDepartment);

export default router;