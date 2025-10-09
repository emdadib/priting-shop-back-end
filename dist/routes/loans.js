"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loanController_1 = require("../controllers/loanController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', loanController_1.getLoans);
router.get('/summary', loanController_1.getLoanSummary);
router.get('/:id', loanController_1.getLoan);
router.post('/', loanController_1.createLoan);
router.put('/:id', loanController_1.updateLoan);
router.delete('/:id', loanController_1.deleteLoan);
router.get('/:loanId/payments', loanController_1.getLoanPayments);
router.post('/:loanId/payments', loanController_1.addLoanPayment);
exports.default = router;
//# sourceMappingURL=loans.js.map