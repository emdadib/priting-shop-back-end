"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/', paymentController_1.createPayment);
router.get('/customer/:customerId/due', paymentController_1.getCustomerDueAmount);
router.get('/order/:orderId/due', paymentController_1.getOrderDueAmount);
router.get('/order/:orderId', paymentController_1.getOrderPayments);
exports.default = router;
//# sourceMappingURL=payments.js.map