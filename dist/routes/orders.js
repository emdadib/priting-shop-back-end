"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const orderController_1 = require("../controllers/orderController");
const enhancedOrderController_1 = require("../controllers/enhancedOrderController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], orderController_1.getAllOrders);
router.get('/status/:status', orderController_1.getOrdersByStatus);
router.get('/customer/:customerId', orderController_1.getOrdersByCustomer);
router.get('/date-range', [
    (0, express_validator_1.query)('startDate').isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], orderController_1.getOrdersByDateRange);
router.get('/:id', orderController_1.getOrderById);
router.post('/', [
    (0, express_validator_1.body)('customerId').optional().isString().withMessage('Customer ID must be a string'),
    (0, express_validator_1.body)('items').isArray().withMessage('Items must be an array'),
    (0, express_validator_1.body)('items.*.productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    (0, express_validator_1.body)('type').optional().isIn(['SALE', 'DIRECT_SALE', 'PURCHASE', 'RETURN', 'TRANSFER']).withMessage('Invalid order type'),
    validation_1.validateRequest
], orderController_1.createOrder);
router.put('/:id', [
    (0, express_validator_1.body)('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
    validation_1.validateRequest
], orderController_1.updateOrder);
router.delete('/:id', orderController_1.deleteOrder);
router.patch('/:id/status', [
    (0, express_validator_1.body)('status').isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
    validation_1.validateRequest
], orderController_1.updateOrderStatus);
router.post('/custom', [
    (0, express_validator_1.body)('customerId').optional().isString().withMessage('Customer ID must be a string'),
    (0, express_validator_1.body)('items').isArray().withMessage('Items must be an array'),
    (0, express_validator_1.body)('items.*.productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    (0, express_validator_1.body)('items.*.customUnitPrice').optional().isFloat({ min: 0 }).withMessage('Custom unit price must be a positive number'),
    (0, express_validator_1.body)('items.*.unit').optional().isString().withMessage('Unit must be a string'),
    (0, express_validator_1.body)('items.*.customDimensions').optional().isString().withMessage('Custom dimensions must be a string'),
    (0, express_validator_1.body)('items.*.customRequirements').optional().isString().withMessage('Custom requirements must be a string'),
    (0, express_validator_1.body)('orderType').optional().isIn(['RETAIL', 'CUSTOM', 'WHOLESALE', 'BULK']).withMessage('Invalid order type'),
    validation_1.validateRequest
], enhancedOrderController_1.createCustomOrder);
router.get('/custom', enhancedOrderController_1.getCustomOrders);
router.get('/products/:productId/pricing', enhancedOrderController_1.getProductPricing);
router.post('/products/:productId/pricing-tiers', [
    (0, express_validator_1.body)('minQuantity').isInt({ min: 1 }).withMessage('Minimum quantity must be a positive integer'),
    (0, express_validator_1.body)('maxQuantity').optional().isInt({ min: 1 }).withMessage('Maximum quantity must be a positive integer'),
    (0, express_validator_1.body)('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    (0, express_validator_1.body)('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    (0, express_validator_1.body)('discount').optional().isFloat({ min: 0, max: 1 }).withMessage('Discount must be between 0 and 1'),
    validation_1.validateRequest
], enhancedOrderController_1.createPricingTier);
router.get('/products/:productId/pricing-tiers', enhancedOrderController_1.getProductPricingTiers);
router.put('/products/:productId/pricing-model', [
    (0, express_validator_1.body)('pricingModel').isIn(['FIXED', 'VARIABLE', 'CUSTOM', 'AREA_BASED', 'TIME_BASED']).withMessage('Invalid pricing model'),
    (0, express_validator_1.body)('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    (0, express_validator_1.body)('baseCostPrice').optional().isFloat({ min: 0 }).withMessage('Base cost price must be a positive number'),
    (0, express_validator_1.body)('isCustomOrder').optional().isBoolean().withMessage('isCustomOrder must be a boolean'),
    (0, express_validator_1.body)('requiresSpecifications').optional().isBoolean().withMessage('requiresSpecifications must be a boolean'),
    validation_1.validateRequest
], enhancedOrderController_1.updateProductPricingModel);
exports.default = router;
//# sourceMappingURL=orders.js.map