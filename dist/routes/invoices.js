"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const invoiceController_1 = require("../controllers/invoiceController");
const router = express_1.default.Router();
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status').optional().isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], invoiceController_1.getAllInvoices);
router.get('/status/:status', invoiceController_1.getInvoicesByStatus);
router.get('/customer/:customerId', invoiceController_1.getInvoicesByCustomer);
router.get('/:id', invoiceController_1.getInvoiceById);
router.get('/:id/pdf', invoiceController_1.generateInvoicePDF);
router.post('/', [
    (0, express_validator_1.body)('orderId').optional().isString().withMessage('Order ID must be a string'),
    (0, express_validator_1.body)('customerId').optional().isString().withMessage('Customer ID must be a string'),
    (0, express_validator_1.body)('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
    validation_1.validateRequest
], invoiceController_1.createInvoice);
router.put('/:id', [
    (0, express_validator_1.body)('status').optional().isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).withMessage('Invalid status'),
    validation_1.validateRequest
], invoiceController_1.updateInvoice);
router.delete('/:id', invoiceController_1.deleteInvoice);
exports.default = router;
//# sourceMappingURL=invoices.js.map