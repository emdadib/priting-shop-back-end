"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const photocopyController_1 = require("../controllers/photocopyController");
const router = express_1.default.Router();
router.get('/products', photocopyController_1.getPhotocopyProducts);
router.post('/order', [
    (0, express_validator_1.body)('oneSidedCopies').optional().isInt({ min: 0 }).withMessage('One-sided copies must be a non-negative integer'),
    (0, express_validator_1.body)('bothSidedCopies').optional().isInt({ min: 0 }).withMessage('Both-sided copies must be a non-negative integer'),
    (0, express_validator_1.body)('customerName').optional().isString().withMessage('Customer name must be a string'),
    (0, express_validator_1.body)('customerPhone').optional().isString().withMessage('Customer phone must be a string'),
    (0, express_validator_1.body)('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a non-negative number'),
    validation_1.validateRequest
], photocopyController_1.createPhotocopyOrder);
router.get('/order/:orderNumber', [
    (0, express_validator_1.param)('orderNumber').notEmpty().withMessage('Order number is required'),
    validation_1.validateRequest
], photocopyController_1.getPhotocopyOrder);
router.get('/ledger', photocopyController_1.getPhotocopyLedger);
exports.default = router;
//# sourceMappingURL=photocopy.js.map