"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const salaryController_1 = require("../controllers/salaryController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.query)('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
    (0, express_validator_1.query)('userId').optional().isString().withMessage('User ID must be a string'),
    (0, express_validator_1.query)('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], salaryController_1.getAllSalaries);
router.get('/summary', [
    (0, express_validator_1.query)('month').isInt({ min: 1, max: 12 }).withMessage('Month is required and must be between 1 and 12'),
    (0, express_validator_1.query)('year').isInt({ min: 2000, max: 2100 }).withMessage('Year is required and must be between 2000 and 2100'),
    validation_1.validateRequest
], salaryController_1.getSalarySummary);
router.get('/:id', salaryController_1.getSalaryById);
router.post('/', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.body)('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    (0, express_validator_1.body)('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
    (0, express_validator_1.body)('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
    validation_1.validateRequest
], salaryController_1.createSalary);
router.put('/:id', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    (0, express_validator_1.body)('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
    (0, express_validator_1.body)('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
    (0, express_validator_1.body)('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], salaryController_1.updateSalary);
router.patch('/:id/pay', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'),
    validation_1.validateRequest
], salaryController_1.markSalaryAsPaid);
router.delete('/:id', auth_1.requireAdmin, salaryController_1.deleteSalary);
exports.default = router;
//# sourceMappingURL=salaries.js.map