import express from 'express';
import { 
  recordSupplierPayment, 
  getPurchaseOrderPayments, 
  getSupplierPaymentSummary 
} from '../controllers/supplierPaymentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Record payment to supplier
router.post('/payments', authenticateToken, recordSupplierPayment);

// Get payment history for a purchase order
router.get('/purchase-orders/:purchaseOrderId/payments', authenticateToken, getPurchaseOrderPayments);

// Get payment summary for a supplier
router.get('/suppliers/:supplierId/payment-summary', authenticateToken, getSupplierPaymentSummary);

export default router;
