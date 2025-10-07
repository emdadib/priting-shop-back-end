import express from 'express';
import {
  getAllWarranties,
  getWarrantyById,
  createWarranty,
  updateWarranty,
  getWarrantyStats
} from '../controllers/warrantyController';
import { authenticateToken, requireManager } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Get all warranties
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']).withMessage('Invalid status'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  validateRequest
], getAllWarranties);

// Get warranty by ID
router.get('/:id', [
  authenticateToken,
  param('id').isString().notEmpty().withMessage('Warranty ID is required'),
  validateRequest
], getWarrantyById);

// Create new warranty
router.post('/', [
  authenticateToken,
  body('productId').isString().notEmpty().withMessage('Product ID is required'),
  body('orderId').isString().notEmpty().withMessage('Order ID is required'),
  body('customerId').isString().notEmpty().withMessage('Customer ID is required'),
  body('issueDescription').isString().notEmpty().withMessage('Issue description is required'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
], createWarranty);

// Update warranty
router.put('/:id', [
  authenticateToken,
  param('id').isString().notEmpty().withMessage('Warranty ID is required'),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']).withMessage('Invalid status'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('resolution').optional().isString().withMessage('Resolution must be a string'),
  body('replacementProductId').optional().isString().withMessage('Replacement product ID must be a string'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('assignedTo').optional().isString().withMessage('Assigned to must be a string'),
  validateRequest
], updateWarranty);

// Get warranty statistics
router.get('/stats/overview', [
  authenticateToken,
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getWarrantyStats);

export default router;
