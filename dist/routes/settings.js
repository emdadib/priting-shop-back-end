"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const settingController_1 = require("../controllers/settingController");
const router = express_1.default.Router();
router.get('/', settingController_1.getAllSettings);
router.get('/:key', settingController_1.getSettingByKey);
router.post('/', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('key').notEmpty().withMessage('Key is required'),
    (0, express_validator_1.body)('value').notEmpty().withMessage('Value is required'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    validation_1.validateRequest
], settingController_1.createSetting);
router.put('/:key', [
    auth_1.requireAdmin,
    (0, express_validator_1.body)('value').notEmpty().withMessage('Value is required'),
    (0, express_validator_1.body)('description').optional().isString().withMessage('Description must be a string'),
    (0, express_validator_1.body)('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    validation_1.validateRequest
], settingController_1.updateSetting);
router.delete('/:key', auth_1.requireAdmin, settingController_1.deleteSetting);
exports.default = router;
//# sourceMappingURL=settings.js.map