"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const warrantyController_1 = require("../controllers/warrantyController");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
router.get('/', [
    auth_1.authenticateToken,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']).withMessage('Invalid status'),
    (0, express_validator_1.query)('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    validation_1.validateRequest
], warrantyController_1.getAllWarranties);
router.get('/:id', [
    auth_1.authenticateToken,
    (0, express_validator_1.param)('id').isString().notEmpty().withMessage('Warranty ID is required'),
    validation_1.validateRequest
], warrantyController_1.getWarrantyById);
router.post('/', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('productId').isString().notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('orderId').isString().notEmpty().withMessage('Order ID is required'),
    (0, express_validator_1.body)('customerId').isString().notEmpty().withMessage('Customer ID is required'),
    (0, express_validator_1.body)('issueDescription').isString().notEmpty().withMessage('Issue description is required'),
    (0, express_validator_1.body)('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    validation_1.validateRequest
], warrantyController_1.createWarranty);
router.put('/:id', [
    auth_1.authenticateToken,
    (0, express_validator_1.param)('id').isString().notEmpty().withMessage('Warranty ID is required'),
    (0, express_validator_1.body)('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']).withMessage('Invalid status'),
    (0, express_validator_1.body)('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    (0, express_validator_1.body)('resolution').optional().isString().withMessage('Resolution must be a string'),
    (0, express_validator_1.body)('replacementProductId').optional().isString().withMessage('Replacement product ID must be a string'),
    (0, express_validator_1.body)('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    (0, express_validator_1.body)('assignedTo').optional().isString().withMessage('Assigned to must be a string'),
    validation_1.validateRequest
], warrantyController_1.updateWarranty);
router.get('/stats/overview', [
    auth_1.authenticateToken,
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], warrantyController_1.getWarrantyStats);
exports.default = router;
//# sourceMappingURL=warranties.js.map