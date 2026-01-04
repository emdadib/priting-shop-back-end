"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const purchaseOrderController_1 = require("../controllers/purchaseOrderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', purchaseOrderController_1.getAllPurchaseOrders);
router.get('/stats', purchaseOrderController_1.getPurchaseOrderStats);
router.get('/with-due-amount', purchaseOrderController_1.getPurchaseOrdersWithDueAmount);
router.get('/supplier/:supplierId', purchaseOrderController_1.getPurchaseOrdersBySupplier);
router.get('/:id', purchaseOrderController_1.getPurchaseOrderById);
router.post('/', purchaseOrderController_1.createPurchaseOrder);
router.put('/:id', purchaseOrderController_1.updatePurchaseOrder);
router.patch('/:id/status', purchaseOrderController_1.updatePurchaseOrderStatus);
router.delete('/:id', purchaseOrderController_1.deletePurchaseOrder);
exports.default = router;
//# sourceMappingURL=purchaseOrders.js.map