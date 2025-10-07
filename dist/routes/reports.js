"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const reportController_1 = require("../controllers/reportController");
const router = express_1.default.Router();
router.get('/sales', [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.query)('groupBy').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid group by option'),
    validation_1.validateRequest
], reportController_1.getSalesReport);
router.get('/inventory', [
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    (0, express_validator_1.query)('lowStock').optional().isBoolean().withMessage('Low stock must be a boolean'),
    validation_1.validateRequest
], reportController_1.getInventoryReport);
router.get('/customers', [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], reportController_1.getCustomerReport);
router.get('/financial', [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], reportController_1.getFinancialReport);
router.get('/staff', [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], reportController_1.getStaffReport);
router.get('/dashboard', reportController_1.getDashboardStats);
exports.default = router;
//# sourceMappingURL=reports.js.map