import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  getEmployeeSalaryProfiles,
  setEmployeeSalary,
  processMonthlyPayment,
  markPaymentAsPaid,
  getMonthlySalarySummary,
  getSalaryPaymentById,
  deleteSalaryPayment
} from '../controllers/improvedSalaryController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all employee salary profiles
router.get('/profiles', getEmployeeSalaryProfiles);

// Set employee salary (create or update profile)
router.post('/set-salary', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('baseSalary').isFloat({ min: 0 }).withMessage('Base salary must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], setEmployeeSalary);

// Process monthly payment
router.post('/process-payment', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
  body('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], processMonthlyPayment);

// Get monthly salary summary
router.get('/monthly-summary', [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030')
], getMonthlySalarySummary);

// Get salary payment by ID
router.get('/payments/:id', [
  param('id').notEmpty().withMessage('Payment ID is required')
], getSalaryPaymentById);

// Mark salary payment as paid
router.patch('/payments/:id/pay', [
  param('id').notEmpty().withMessage('Payment ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], markPaymentAsPaid);

// Delete salary payment
router.delete('/payments/:id', [
  param('id').notEmpty().withMessage('Payment ID is required')
], deleteSalaryPayment);

export default router;
