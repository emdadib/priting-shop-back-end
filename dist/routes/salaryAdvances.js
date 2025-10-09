"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const salaryAdvanceController_1 = require("../controllers/salaryAdvanceController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('userId').optional().isString().withMessage('User ID must be a string'),
    (0, express_validator_1.query)('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']).withMessage('Invalid status'),
    (0, express_validator_1.query)('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.query)('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
    validation_1.validateRequest
], salaryAdvanceController_1.getAllSalaryAdvances);
router.get('/summary/:userId', [
    (0, express_validator_1.query)('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.query)('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
    validation_1.validateRequest
], salaryAdvanceController_1.getEmployeeAdvanceSummary);
router.get('/:id', salaryAdvanceController_1.getSalaryAdvanceById);
router.post('/', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    validation_1.validateRequest
], salaryAdvanceController_1.createSalaryAdvance);
router.patch('/:id/approve', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    validation_1.validateRequest
], salaryAdvanceController_1.approveSalaryAdvance);
router.patch('/:id/pay', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    validation_1.validateRequest
], salaryAdvanceController_1.paySalaryAdvance);
router.patch('/:id/reject', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('reason').optional().isString().withMessage('Reason must be a string'),
    validation_1.validateRequest
], salaryAdvanceController_1.rejectSalaryAdvance);
router.delete('/:id', salaryAdvanceController_1.deleteSalaryAdvance);
exports.default = router;
//# sourceMappingURL=salaryAdvances.js.map