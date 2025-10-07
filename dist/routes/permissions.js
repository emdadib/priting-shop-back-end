"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const permissionController_1 = require("../controllers/permissionController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/permissions', permissionController_1.getAllPermissions);
router.get('/permissions/user/:userId', [
    (0, express_validator_1.param)('userId').isString().withMessage('User ID must be a string'),
    validation_1.validateRequest
], permissionController_1.getUserPermissions);
router.post('/permissions/grant', [
    auth_1.requireSuperAdmin,
    (0, express_validator_1.body)('userId').isString().withMessage('User ID is required'),
    (0, express_validator_1.body)('permissionId').isString().withMessage('Permission ID is required'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date'),
    validation_1.validateRequest
], permissionController_1.grantPermission);
router.post('/permissions/revoke', [
    auth_1.requireSuperAdmin,
    (0, express_validator_1.body)('userId').isString().withMessage('User ID is required'),
    (0, express_validator_1.body)('permissionId').isString().withMessage('Permission ID is required'),
    validation_1.validateRequest
], permissionController_1.revokePermission);
router.get('/menus', permissionController_1.getAllMenus);
router.get('/menus/user/:userId', [
    (0, express_validator_1.param)('userId').isString().withMessage('User ID must be a string'),
    validation_1.validateRequest
], permissionController_1.getUserMenuPermissions);
router.get('/menus/accessible/:userId', [
    (0, express_validator_1.param)('userId').isString().withMessage('User ID must be a string'),
    validation_1.validateRequest
], permissionController_1.getUserAccessibleMenus);
router.post('/menus/grant', [
    auth_1.requireSuperAdmin,
    (0, express_validator_1.body)('userId').isString().withMessage('User ID is required'),
    (0, express_validator_1.body)('menuId').isString().withMessage('Menu ID is required'),
    validation_1.validateRequest
], permissionController_1.grantMenuPermission);
router.post('/menus/revoke', [
    auth_1.requireSuperAdmin,
    (0, express_validator_1.body)('userId').isString().withMessage('User ID is required'),
    (0, express_validator_1.body)('menuId').isString().withMessage('Menu ID is required'),
    validation_1.validateRequest
], permissionController_1.revokeMenuPermission);
exports.default = router;
//# sourceMappingURL=permissions.js.map