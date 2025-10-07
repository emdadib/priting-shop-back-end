import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth';
import {
  getAllSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  markSalaryAsPaid,
  deleteSalary,
  getSalarySummary
} from '../controllers/salaryController';

const router = express.Router();

// Get all salaries with optional filtering
router.get('/', [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  query('userId').optional().isString().withMessage('User ID must be a string'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], getAllSalaries);

// Get salary summary for a specific period
router.get('/summary', [
  query('month').isInt({ min: 1, max: 12 }).withMessage('Month is required and must be between 1 and 12'),
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('Year is required and must be between 2000 and 2100'),
  validateRequest
], getSalarySummary);

// Get salary by ID
router.get('/:id', getSalaryById);

// Create salary record (admin only)
router.post('/', [
  requireAdmin,
  body('userId').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
  body('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
  validateRequest
], createSalary);

// Update salary record (admin only)
router.put('/:id', [
  requireAdmin,
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
  body('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], updateSalary);

// Mark salary as paid (admin only)
router.patch('/:id/pay', [
  requireAdmin,
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
], markSalaryAsPaid);

// Delete salary record (admin only)
router.delete('/:id', requireAdmin, deleteSalary);

export default router;
