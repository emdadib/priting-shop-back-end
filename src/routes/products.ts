import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireManager } from '../middleware/auth';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  getProductsByType,
  getProductSummary,
  bulkUpdateProducts,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  generateSKU,
  getSKUStats,
  validateSKU,
  generateMultipleSKUs
} from '../controllers/productController';

const router = express.Router();

// Product routes
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('type').optional().isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validateRequest
], getAllProducts);

router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  validateRequest
], searchProducts);

router.get('/category/:categoryId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], getProductsByCategory);

// New routes for product types
router.get('/type/:type', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  validateRequest
], getProductsByType);

router.get('/summary', getProductSummary);

router.get('/:id', getProductById);

router.post('/', [
  requireManager,
  body('name').notEmpty().withMessage('Product name is required'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('type').isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('baseCostPrice').isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
  body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative integer'),
  body('maxStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be a non-negative integer'),
  body('unit').optional().isString().withMessage('Unit must be a string'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('barcode').optional().isString().withMessage('Barcode must be a string'),
  body('hasWarranty').optional().isBoolean().withMessage('hasWarranty must be a boolean'),
  body('warrantyPeriod').optional().isInt({ min: 0 }).withMessage('Warranty period must be a non-negative integer'),
  body('warrantyPeriodType').optional().isIn(['SIX_MONTHS', 'ONE_YEAR', 'TWO_YEARS', 'THREE_YEARS', 'FIVE_YEARS', 'LIFETIME', 'CUSTOM']).withMessage('Invalid warranty period type'),
  body('warrantyDescription').optional().isString().withMessage('Warranty description must be a string'),
  validateRequest
], createProduct);

router.put('/:id', [
  requireManager,
  body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('sku').optional().notEmpty().withMessage('SKU cannot be empty'),
  body('barcode').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string';
  }).withMessage('Barcode must be a string'),
  body('categoryId').optional().notEmpty().withMessage('Category cannot be empty'),
  body('type').optional().isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
  body('pricingModel').optional().isIn(['FIXED', 'VARIABLE', 'CUSTOM', 'AREA_BASED', 'TIME_BASED']).withMessage('Invalid pricing model'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('baseCostPrice').optional().isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
  body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
  body('hasInventory').optional().isBoolean().withMessage('hasInventory must be a boolean'),
  body('isCustomOrder').optional().isBoolean().withMessage('isCustomOrder must be a boolean'),
  body('requiresSpecifications').optional().isBoolean().withMessage('requiresSpecifications must be a boolean'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative integer'),
  body('maxStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be a non-negative integer'),
  body('unit').optional().isString().withMessage('Unit must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('hasWarranty').optional().isBoolean().withMessage('hasWarranty must be a boolean'),
  body('warrantyPeriod').optional().isInt({ min: 0 }).withMessage('Warranty period must be a non-negative integer'),
  body('warrantyPeriodType').optional().isIn(['SIX_MONTHS', 'ONE_YEAR', 'TWO_YEARS', 'THREE_YEARS', 'FIVE_YEARS', 'LIFETIME', 'CUSTOM']).withMessage('Invalid warranty period type'),
  body('warrantyDescription').optional().isString().withMessage('Warranty description must be a string'),
  validateRequest
], updateProduct);

router.delete('/:id', requireManager, deleteProduct);

router.post('/bulk-update', [
  requireManager,
  body('products').isArray().withMessage('Products must be an array'),
  body('products.*.id').notEmpty().withMessage('Product ID is required'),
  validateRequest
], bulkUpdateProducts);

// Category routes
router.get('/categories/all', getAllCategories);

router.post('/categories', [
  body('name').notEmpty().withMessage('Category name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('parentId').optional().isString().withMessage('Parent ID must be a string'),
  body('sortOrder').optional().isInt().withMessage('Sort order must be an integer'),
  validateRequest
], createCategory);

router.put('/categories/:id', [
  body('name').optional().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('parentId').optional().isString().withMessage('Parent ID must be a string'),
  body('sortOrder').optional().isInt().withMessage('Sort order must be an integer'),
  validateRequest
], updateCategory);

router.delete('/categories/:id', deleteCategory);

// SKU Generation routes
router.post('/generate-sku', [
  body('categoryId').isString().notEmpty().withMessage('Category ID is required'),
  body('customPrefix').optional().isString().withMessage('Custom prefix must be a string'),
  validateRequest
], generateSKU);

router.get('/sku-stats/:categoryId', getSKUStats);

router.post('/validate-sku', [
  body('sku').isString().notEmpty().withMessage('SKU is required'),
  body('excludeId').optional().isString().withMessage('Exclude ID must be a string'),
  validateRequest
], validateSKU);

router.post('/generate-multiple-skus', [
  body('categoryId').isString().notEmpty().withMessage('Category ID is required'),
  body('count').isInt({ min: 1, max: 100 }).withMessage('Count must be between 1 and 100'),
  body('customPrefix').optional().isString().withMessage('Custom prefix must be a string'),
  validateRequest
], generateMultipleSKUs);

export default router; 