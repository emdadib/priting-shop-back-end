"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supplierPaymentController_1 = require("../controllers/supplierPaymentController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/payments', auth_1.authenticateToken, supplierPaymentController_1.recordSupplierPayment);
router.get('/purchase-orders/:purchaseOrderId/payments', auth_1.authenticateToken, supplierPaymentController_1.getPurchaseOrderPayments);
router.get('/suppliers/:supplierId/payment-summary', auth_1.authenticateToken, supplierPaymentController_1.getSupplierPaymentSummary);
exports.default = router;
//# sourceMappingURL=supplierPayments.js.map