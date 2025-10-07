import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getPhotocopyProducts,
  createPhotocopyOrder,
  getPhotocopyOrder,
  getPhotocopyLedger
} from '../controllers/photocopyController';

const router = express.Router();

// Public routes for photocopy service (no authentication required)

// Get photocopy products
router.get('/products', getPhotocopyProducts);

// Create photocopy order
router.post('/order', [
  body('oneSidedCopies').optional().isInt({ min: 0 }).withMessage('One-sided copies must be a non-negative integer'),
  body('bothSidedCopies').optional().isInt({ min: 0 }).withMessage('Both-sided copies must be a non-negative integer'),
  body('customerName').optional().isString().withMessage('Customer name must be a string'),
  body('customerPhone').optional().isString().withMessage('Customer phone must be a string'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a non-negative number'),
  validateRequest
], createPhotocopyOrder);

// Get photocopy order by order number
router.get('/order/:orderNumber', [
  param('orderNumber').notEmpty().withMessage('Order number is required'),
  validateRequest
], getPhotocopyOrder);

// Get photocopy ledger (admin endpoint - requires authentication)
router.get('/ledger', getPhotocopyLedger);

export default router;
