import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
} from '../controllers/employeeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/stats', getEmployeeStats);
router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', requireRole(['admin', 'hr']), createEmployee);
router.put('/:id', requireRole(['admin', 'hr']), updateEmployee);
router.delete('/:id', requireRole(['admin']), deleteEmployee);

export default router;