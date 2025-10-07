"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
    validation_1.validateRequest
], userController_1.getAllUsers);
router.get('/profile', userController_1.getUserProfile);
router.get('/:id', userController_1.getUserById);
router.post('/', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
    validation_1.validateRequest
], userController_1.createUser);
router.put('/profile', [
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    validation_1.validateRequest
], userController_1.updateUserProfile);
router.put('/:id', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validation_1.validateRequest
], userController_1.updateUser);
router.delete('/:id', auth_1.requireAdmin, userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=users.js.map