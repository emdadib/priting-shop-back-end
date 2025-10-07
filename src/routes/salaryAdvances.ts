import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth';
import {
  getAllSalaryAdvances,
  getSalaryAdvanceById,
  createSalaryAdvance,
  approveSalaryAdvance,
  paySalaryAdvance,
  rejectSalaryAdvance,
  deleteSalaryAdvance,
  getEmployeeAdvanceSummary
} from '../controllers/salaryAdvanceController';

const router = express.Router();

// Get all salary advances with optional filtering
router.get('/', [
  query('userId').optional().isString().withMessage('User ID must be a string'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']).withMessage('Invalid status'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  validateRequest
], getAllSalaryAdvances);

// Get employee advance summary
router.get('/summary/:userId', [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  validateRequest
], getEmployeeAdvanceSummary);

// Get salary advance by ID
router.get('/:id', getSalaryAdvanceById);

// Create salary advance request
router.post('/', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
], createSalaryAdvance);

// Approve salary advance (admin only)
router.patch('/:id/approve', [
  requireAdmin,
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
], approveSalaryAdvance);

// Pay salary advance (admin only)
router.patch('/:id/pay', [
  requireAdmin,
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
], paySalaryAdvance);

// Reject salary advance (admin only)
router.patch('/:id/reject', [
  requireAdmin,
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validateRequest
], rejectSalaryAdvance);

// Delete salary advance
router.delete('/:id', deleteSalaryAdvance);

export default router;
