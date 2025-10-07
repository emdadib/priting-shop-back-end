"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const productController_1 = require("../controllers/productController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    (0, express_validator_1.query)('type').optional().isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
    (0, express_validator_1.query)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validation_1.validateRequest
], productController_1.getAllProducts);
router.get('/search', [
    (0, express_validator_1.query)('q').notEmpty().withMessage('Search query is required'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    validation_1.validateRequest
], productController_1.searchProducts);
router.get('/category/:categoryId', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validation_1.validateRequest
], productController_1.getProductsByCategory);
router.get('/type/:type', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    validation_1.validateRequest
], productController_1.getProductsByType);
router.get('/summary', productController_1.getProductSummary);
router.get('/:id', productController_1.getProductById);
router.post('/', [
    auth_1.requireManager,
    (0, express_validator_1.body)('name').notEmpty().withMessage('Product name is required'),
    (0, express_validator_1.body)('sku').notEmpty().withMessage('SKU is required'),
    (0, express_validator_1.body)('categoryId').notEmpty().withMessage('Category is required'),
    (0, express_validator_1.body)('type').isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
    (0, express_validator_1.body)('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    (0, express_validator_1.body)('baseCostPrice').isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
    (0, express_validator_1.body)('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
    (0, express_validator_1.body)('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative integer'),
    (0, express_validator_1.body)('maxStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be a non-negative integer'),
    (0, express_validator_1.body)('unit').optional().isString().withMessage('Unit must be a string'),
    (0, express_validator_1.body)('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    (0, express_validator_1.body)('barcode').optional().isString().withMessage('Barcode must be a string'),
    validation_1.validateRequest
], productController_1.createProduct);
router.put('/:id', [
    auth_1.requireManager,
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Product name cannot be empty'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('sku').optional().notEmpty().withMessage('SKU cannot be empty'),
    (0, express_validator_1.body)('barcode').optional().custom((value) => {
        if (value === null || value === undefined || value === '')
            return true;
        return typeof value === 'string';
    }).withMessage('Barcode must be a string'),
    (0, express_validator_1.body)('categoryId').optional().notEmpty().withMessage('Category cannot be empty'),
    (0, express_validator_1.body)('type').optional().isIn(['PHYSICAL', 'SERVICE', 'DIGITAL']).withMessage('Invalid product type'),
    (0, express_validator_1.body)('pricingModel').optional().isIn(['FIXED', 'VARIABLE', 'CUSTOM', 'AREA_BASED', 'TIME_BASED']).withMessage('Invalid pricing model'),
    (0, express_validator_1.body)('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    (0, express_validator_1.body)('baseCostPrice').optional().isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
    (0, express_validator_1.body)('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
    (0, express_validator_1.body)('hasInventory').optional().isBoolean().withMessage('hasInventory must be a boolean'),
    (0, express_validator_1.body)('isCustomOrder').optional().isBoolean().withMessage('isCustomOrder must be a boolean'),
    (0, express_validator_1.body)('requiresSpecifications').optional().isBoolean().withMessage('requiresSpecifications must be a boolean'),
    (0, express_validator_1.body)('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative integer'),
    (0, express_validator_1.body)('maxStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be a non-negative integer'),
    (0, express_validator_1.body)('unit').optional().isString().withMessage('Unit must be a string'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validation_1.validateRequest
], productController_1.updateProduct);
router.delete('/:id', auth_1.requireManager, productController_1.deleteProduct);
router.post('/bulk-update', [
    auth_1.requireManager,
    (0, express_validator_1.body)('products').isArray().withMessage('Products must be an array'),
    (0, express_validator_1.body)('products.*.id').notEmpty().withMessage('Product ID is required'),
    validation_1.validateRequest
], productController_1.bulkUpdateProducts);
router.get('/categories/all', productController_1.getAllCategories);
router.post('/categories', [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Category name is required'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('parentId').optional().isString().withMessage('Parent ID must be a string'),
    (0, express_validator_1.body)('sortOrder').optional().isInt().withMessage('Sort order must be an integer'),
    validation_1.validateRequest
], productController_1.createCategory);
router.put('/categories/:id', [
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Category name cannot be empty'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('parentId').optional().isString().withMessage('Parent ID must be a string'),
    (0, express_validator_1.body)('sortOrder').optional().isInt().withMessage('Sort order must be an integer'),
    validation_1.validateRequest
], productController_1.updateCategory);
router.delete('/categories/:id', productController_1.deleteCategory);
router.post('/generate-sku', [
    (0, express_validator_1.body)('categoryId').isString().notEmpty().withMessage('Category ID is required'),
    (0, express_validator_1.body)('customPrefix').optional().isString().withMessage('Custom prefix must be a string'),
    validation_1.validateRequest
], productController_1.generateSKU);
router.get('/sku-stats/:categoryId', productController_1.getSKUStats);
router.post('/validate-sku', [
    (0, express_validator_1.body)('sku').isString().notEmpty().withMessage('SKU is required'),
    (0, express_validator_1.body)('excludeId').optional().isString().withMessage('Exclude ID must be a string'),
    validation_1.validateRequest
], productController_1.validateSKU);
router.post('/generate-multiple-skus', [
    (0, express_validator_1.body)('categoryId').isString().notEmpty().withMessage('Category ID is required'),
    (0, express_validator_1.body)('count').isInt({ min: 1, max: 100 }).withMessage('Count must be between 1 and 100'),
    (0, express_validator_1.body)('customPrefix').optional().isString().withMessage('Custom prefix must be a string'),
    validation_1.validateRequest
], productController_1.generateMultipleSKUs);
exports.default = router;
//# sourceMappingURL=products.js.map