"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const attendanceController_1 = require("../controllers/attendanceController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('userId').optional().isString().withMessage('User ID must be a string'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validation_1.validateRequest
], attendanceController_1.getAttendance);
router.post('/clock-in', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    validation_1.validateRequest
], attendanceController_1.clockIn);
router.post('/clock-out', [
    (0, express_validator_1.body)('userId').notEmpty().withMessage('User ID is required'),
    validation_1.validateRequest
], attendanceController_1.clockOut);
router.get('/report', attendanceController_1.getAttendanceReport);
router.put('/:id', [
    (0, express_validator_1.body)('clockIn').optional().isISO8601().withMessage('Clock in must be a valid date'),
    (0, express_validator_1.body)('clockOut').optional().isISO8601().withMessage('Clock out must be a valid date'),
    validation_1.validateRequest
], attendanceController_1.updateAttendance);
exports.default = router;
//# sourceMappingURL=attendance.js.map