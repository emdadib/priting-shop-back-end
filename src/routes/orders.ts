import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrdersByStatus,
  getOrdersByCustomer,
  getOrdersByDateRange,
  updateOrderStatus,
  getOrdersWithDue
} from '../controllers/orderController';

import {
  createCustomOrder,
  getProductPricing,
  createPricingTier,
  getProductPricingTiers,
  updateProductPricingModel,
  getCustomOrders
} from '../controllers/enhancedOrderController';

const router = express.Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getAllOrders);

router.get('/status/:status', getOrdersByStatus);

router.get('/customer/:customerId', getOrdersByCustomer);

router.get('/date-range', [
  query('startDate').isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getOrdersByDateRange);

router.get('/with-due', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], getOrdersWithDue);

router.get('/:id', getOrderById);

router.post('/', [
  body('customerId').optional().isString().withMessage('Customer ID must be a string'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('type').optional().isIn(['SALE', 'DIRECT_SALE', 'PURCHASE', 'RETURN', 'TRANSFER']).withMessage('Invalid order type'),
  validateRequest
], createOrder);

router.put('/:id', [
  body('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
  validateRequest
], updateOrder);

router.delete('/:id', deleteOrder);

router.patch('/:id/status', [
  body('status').isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
  validateRequest
], updateOrderStatus);

// Enhanced Custom Order Routes
router.post('/custom', [
  body('customerId').optional().isString().withMessage('Customer ID must be a string'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.customUnitPrice').optional().isFloat({ min: 0 }).withMessage('Custom unit price must be a positive number'),
  body('items.*.unit').optional().isString().withMessage('Unit must be a string'),
  body('items.*.customDimensions').optional().isString().withMessage('Custom dimensions must be a string'),
  body('items.*.customRequirements').optional().isString().withMessage('Custom requirements must be a string'),
  body('orderType').optional().isIn(['RETAIL', 'CUSTOM', 'WHOLESALE', 'BULK']).withMessage('Invalid order type'),
  validateRequest
], createCustomOrder);

router.get('/custom', getCustomOrders);

// Product Pricing Routes
router.get('/products/:productId/pricing', getProductPricing);

router.post('/products/:productId/pricing-tiers', [
  body('minQuantity').isInt({ min: 1 }).withMessage('Minimum quantity must be a positive integer'),
  body('maxQuantity').optional().isInt({ min: 1 }).withMessage('Maximum quantity must be a positive integer'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('discount').optional().isFloat({ min: 0, max: 1 }).withMessage('Discount must be between 0 and 1'),
  validateRequest
], createPricingTier);

router.get('/products/:productId/pricing-tiers', getProductPricingTiers);

router.put('/products/:productId/pricing-model', [
  body('pricingModel').isIn(['FIXED', 'VARIABLE', 'CUSTOM', 'AREA_BASED', 'TIME_BASED']).withMessage('Invalid pricing model'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('baseCostPrice').optional().isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
  body('isCustomOrder').optional().isBoolean().withMessage('isCustomOrder must be a boolean'),
  body('requiresSpecifications').optional().isBoolean().withMessage('requiresSpecifications must be a boolean'),
  validateRequest
], updateProductPricingModel);

export default router; 