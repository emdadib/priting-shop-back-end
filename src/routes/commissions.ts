import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getCommissions,
  createCommission,
  updateCommission,
  getCommissionReport,
  calculateCommissions
} from '../controllers/commissionController';

const router = express.Router();

router.get('/', [
  query('userId').optional().isString().withMessage('User ID must be a string'),
  query('period').optional().isString().withMessage('Period must be a string'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], getCommissions);

router.post('/', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('rate').isFloat({ min: 0, max: 1 }).withMessage('Rate must be between 0 and 1'),
  body('period').notEmpty().withMessage('Period is required'),
  validateRequest
], createCommission);

router.put('/:id', [
  body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], updateCommission);

router.get('/report', getCommissionReport);

router.post('/calculate', [
  body('period').notEmpty().withMessage('Period is required'),
  body('userId').optional().isString().withMessage('User ID must be a string'),
  validateRequest
], calculateCommissions);

export default router; 