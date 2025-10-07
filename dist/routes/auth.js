"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long'),
    validation_1.validateRequest
], authController_1.login);
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
    validation_1.validateRequest
], authController_1.register);
router.post('/refresh', [
    (0, express_validator_1.body)('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validation_1.validateRequest
], authController_1.refreshToken);
router.post('/logout', authController_1.logout);
router.post('/change-password', [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    validation_1.validateRequest
], authController_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map