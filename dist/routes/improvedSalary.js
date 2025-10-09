"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const improvedSalaryController_1 = require("../controllers/improvedSalaryController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/profiles', improvedSalaryController_1.getEmployeeSalaryProfiles);
router.post('/set-salary', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('baseSalary').isFloat({ min: 0 }).withMessage('Base salary must be a positive number'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string')
], improvedSalaryController_1.setEmployeeSalary);
router.post('/process-payment', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.body)('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a positive number'),
    (0, express_validator_1.body)('bonuses').optional().isFloat({ min: 0 }).withMessage('Bonuses must be a positive number'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string')
], improvedSalaryController_1.processMonthlyPayment);
router.get('/monthly-summary', [
    (0, express_validator_1.query)('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    (0, express_validator_1.query)('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030')
], improvedSalaryController_1.getMonthlySalarySummary);
router.get('/payments/:id', [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Payment ID is required')
], improvedSalaryController_1.getSalaryPaymentById);
router.patch('/payments/:id/pay', [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Payment ID is required'),
    (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string')
], improvedSalaryController_1.markPaymentAsPaid);
router.delete('/payments/:id', [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Payment ID is required')
], improvedSalaryController_1.deleteSalaryPayment);
exports.default = router;
//# sourceMappingURL=improvedSalary.js.map