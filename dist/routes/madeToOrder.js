"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const madeToOrderController_1 = require("../controllers/madeToOrderController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('category').optional().isString().withMessage('Category must be a string'),
    validation_1.validateRequest
], madeToOrderController_1.getMadeToOrderProducts);
router.get('/summary', madeToOrderController_1.getMadeToOrderSummary);
exports.default = router;
//# sourceMappingURL=madeToOrder.js.map