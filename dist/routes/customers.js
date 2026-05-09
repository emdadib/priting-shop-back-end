"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const customerController_1 = require("../controllers/customerController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    validation_1.validateRequest
], customerController_1.getAllCustomers);
router.get('/search', [
    (0, express_validator_1.query)('q').notEmpty().withMessage('Search query is required'),
    validation_1.validateRequest
], customerController_1.searchCustomers);
router.get('/:id', customerController_1.getCustomerById);
router.get('/:id/orders', customerController_1.getCustomerOrders);
router.post('/', [
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('phone').optional().isString().withMessage('Phone must be a string'),
    validation_1.validateRequest
], customerController_1.createCustomer);
router.put('/:id', [
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    validation_1.validateRequest
], customerController_1.updateCustomer);
router.delete('/:id', customerController_1.deleteCustomer);
router.post('/:id/loyalty-points', [
    (0, express_validator_1.body)('points').isInt().withMessage('Points must be an integer'),
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
    validation_1.validateRequest
], customerController_1.updateLoyaltyPoints);
exports.default = router;
//# sourceMappingURL=customers.js.map