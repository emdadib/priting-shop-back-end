"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accountingController_1 = require("../controllers/accountingController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/customers/:customerId/ledger', accountingController_1.getCustomerLedger);
router.post('/customers/transactions', accountingController_1.addCustomerTransaction);
router.get('/suppliers/:supplierId/ledger', accountingController_1.getSupplierLedger);
router.post('/suppliers/transactions', accountingController_1.addSupplierTransaction);
router.get('/company/ledger', accountingController_1.getCompanyLedger);
router.post('/company/transactions', accountingController_1.addCompanyTransaction);
router.get('/summary', accountingController_1.getAccountingSummary);
router.get('/aging-report', accountingController_1.getAgingReport);
exports.default = router;
//# sourceMappingURL=accounting.js.map