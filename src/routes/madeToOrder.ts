import express from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getMadeToOrderProducts,
  getMadeToOrderSummary
} from '../controllers/madeToOrderController';

const router = express.Router();

// Get all made-to-order products
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  validateRequest
], getMadeToOrderProducts);

// Get made-to-order summary
router.get('/summary', getMadeToOrderSummary);

export default router;
