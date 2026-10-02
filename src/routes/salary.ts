import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireAdmin, requireManager } from '../middleware/auth';
import {
  cancelPayout,
  createPayout,
  deletePayout,
  getEmployeeYear,
  getMonthReport,
  getProfiles,
  payPendingPayout,
  processAllForMonth,
  processMonth,
  setBaseSalary,
  skipMonth,
  undoProcessMonth,
} from '../controllers/salaryController';

const router = express.Router();

// Mounted behind authenticateToken in index.ts. Salary figures are for
// managers and up; anything that moves money or rewrites a month is admin only.
router.use(requireManager);

const periodQuery = [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
];

const periodBody = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
];

// ---- Base salary ------------------------------------------------------------
router.get('/profiles', getProfiles);

router.post('/profiles', [
  requireAdmin,
  body('userId').notEmpty().withMessage('Employee is required'),
  body('baseSalary').isFloat({ min: 0 }).withMessage('Base salary must be zero or more'),
  body('notes').optional({ nullable: true }).isString().withMessage('Notes must be text'),
  validateRequest,
], setBaseSalary);

// ---- Reports ----------------------------------------------------------------
router.get('/month', [...periodQuery, validateRequest], getMonthReport);

router.get('/employee/:userId', [
  param('userId').notEmpty(),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
  validateRequest,
], getEmployeeYear);

// ---- Payouts (cash given during the month) ----------------------------------
router.post('/payouts', [
  body('userId').notEmpty().withMessage('Employee is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  ...periodBody,
  body('date').optional({ nullable: true }).isISO8601().withMessage('Date must be a valid date'),
  body('reason').optional({ nullable: true }).isString().withMessage('Reason must be text'),
  body('notes').optional({ nullable: true }).isString().withMessage('Notes must be text'),
  validateRequest,
], createPayout);

router.patch('/payouts/:id/pay', [param('id').notEmpty(), validateRequest], payPendingPayout);

router.patch('/payouts/:id/cancel', [
  requireAdmin,
  param('id').notEmpty(),
  body('reason').optional({ nullable: true }).isString(),
  validateRequest,
], cancelPayout);

router.delete('/payouts/:id', [requireAdmin, param('id').notEmpty(), validateRequest], deletePayout);

// ---- Month-end processing ---------------------------------------------------
router.post('/process', [
  requireAdmin,
  body('userId').notEmpty().withMessage('Employee is required'),
  ...periodBody,
  body('deductions').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Deductions must be zero or more'),
  body('bonuses').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Bonus must be zero or more'),
  body('notes').optional({ nullable: true }).isString().withMessage('Notes must be text'),
  validateRequest,
], processMonth);

router.post('/process-all', [
  requireAdmin,
  ...periodBody,
  body('userIds').optional({ nullable: true }).isArray().withMessage('userIds must be a list'),
  body('userIds.*').isString().withMessage('userIds must contain employee ids'),
  body('notes').optional({ nullable: true }).isString().withMessage('Notes must be text'),
  validateRequest,
], processAllForMonth);

// Close a month without salary (employee not present for the full month).
router.post('/skip', [
  requireAdmin,
  body('userId').notEmpty().withMessage('Employee is required'),
  ...periodBody,
  body('reason').optional({ nullable: true }).isString().withMessage('Reason must be text'),
  validateRequest,
], skipMonth);

router.delete('/process/:id', [requireAdmin, param('id').notEmpty(), validateRequest], undoProcessMonth);

export default router;
