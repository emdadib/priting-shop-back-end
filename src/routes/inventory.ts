import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireManager } from '../middleware/auth';
import {
  getInventory,
  getInventoryByProduct,
  updateStock,
  getInventoryMovements,
  getLowStockAlerts,
  bulkUpdateInventory,
  getInventoryReport
} from '../controllers/inventoryController';

const router = express.Router();

// Get all inventory with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('lowStock').optional().isBoolean().withMessage('lowStock must be a boolean'),
  validateRequest
], getInventory);

// Get inventory for specific product
router.get('/product/:productId', getInventoryByProduct);

// Update stock levels
router.post('/update-stock', [
  requireManager,
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('type').isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('reference').optional().isString().withMessage('Reference must be a string'),
  validateRequest
], updateStock);

// Get inventory movements
router.get('/movements', [
  query('productId').optional().isString().withMessage('Product ID must be a string'),
  query('type').optional().isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], getInventoryMovements);

// Get low stock alerts
router.get('/low-stock-alerts', getLowStockAlerts);

// Bulk update inventory
router.post('/bulk-update', [
  requireManager,
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.productId').notEmpty().withMessage('Product ID is required'),
  body('updates.*.quantity').isInt().withMessage('Quantity must be an integer'),
  body('updates.*.type').isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
  validateRequest
], bulkUpdateInventory);

// Get inventory report
router.get('/report', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('category').optional().isString().withMessage('Category must be a string'),
  validateRequest
], getInventoryReport);

export default router; 