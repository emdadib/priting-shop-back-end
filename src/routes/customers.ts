import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerOrders,
  updateLoyaltyPoints
} from '../controllers/customerController';

const router = express.Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  validateRequest
], getAllCustomers);

router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  validateRequest
], searchCustomers);

router.get('/:id', getCustomerById);

router.get('/:id/orders', getCustomerOrders);

router.post('/', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  validateRequest
], createCustomer);

router.put('/:id', [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  validateRequest
], updateCustomer);

router.delete('/:id', deleteCustomer);

router.post('/:id/loyalty-points', [
  body('points').isInt().withMessage('Points must be an integer'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validateRequest
], updateLoyaltyPoints);

export default router; 