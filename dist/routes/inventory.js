"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const inventoryController_1 = require("../controllers/inventoryController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    (0, express_validator_1.query)('lowStock').optional().isBoolean().withMessage('lowStock must be a boolean'),
    validation_1.validateRequest
], inventoryController_1.getInventory);
router.get('/product/:productId', inventoryController_1.getInventoryByProduct);
router.post('/update-stock', [
    auth_1.requireManager,
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('quantity').isInt().withMessage('Quantity must be an integer'),
    (0, express_validator_1.body)('type').isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
    (0, express_validator_1.body)('reference').optional().isString().withMessage('Reference must be a string'),
    validation_1.validateRequest
], inventoryController_1.updateStock);
router.get('/movements', [
    (0, express_validator_1.query)('productId').optional().isString().withMessage('Product ID must be a string'),
    (0, express_validator_1.query)('type').optional().isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validation_1.validateRequest
], inventoryController_1.getInventoryMovements);
router.get('/low-stock-alerts', inventoryController_1.getLowStockAlerts);
router.post('/bulk-update', [
    auth_1.requireManager,
    (0, express_validator_1.body)('updates').isArray().withMessage('Updates must be an array'),
    (0, express_validator_1.body)('updates.*.productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('updates.*.quantity').isInt().withMessage('Quantity must be an integer'),
    (0, express_validator_1.body)('updates.*.type').isIn(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE', 'EXPIRY']).withMessage('Invalid movement type'),
    validation_1.validateRequest
], inventoryController_1.bulkUpdateInventory);
router.get('/report', [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    validation_1.validateRequest
], inventoryController_1.getInventoryReport);
exports.default = router;
//# sourceMappingURL=inventory.js.map