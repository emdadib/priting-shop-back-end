"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const commissionController_1 = require("../controllers/commissionController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('userId').optional().isString().withMessage('User ID must be a string'),
    (0, express_validator_1.query)('period').optional().isString().withMessage('Period must be a string'),
    (0, express_validator_1.query)('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], commissionController_1.getCommissions);
router.post('/', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('rate').isFloat({ min: 0, max: 1 }).withMessage('Rate must be between 0 and 1'),
    (0, express_validator_1.body)('period').notEmpty().withMessage('Period is required'),
    validation_1.validateRequest
], commissionController_1.createCommission);
router.put('/:id', [
    (0, express_validator_1.body)('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], commissionController_1.updateCommission);
router.get('/report', commissionController_1.getCommissionReport);
router.post('/calculate', [
    (0, express_validator_1.body)('period').notEmpty().withMessage('Period is required'),
    (0, express_validator_1.body)('userId').optional().isString().withMessage('User ID must be a string'),
    validation_1.validateRequest
], commissionController_1.calculateCommissions);
exports.default = router;
//# sourceMappingURL=commissions.js.map