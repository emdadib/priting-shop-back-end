import express from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  getPurchaseOrderStats,
  getPurchaseOrdersBySupplier
} from '../controllers/purchaseOrderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Purchase order routes
router.get('/', getAllPurchaseOrders);
router.get('/stats', getPurchaseOrderStats);
router.get('/supplier/:supplierId', getPurchaseOrdersBySupplier);
router.get('/:id', getPurchaseOrderById);
router.post('/', createPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.patch('/:id/status', updatePurchaseOrderStatus);
router.delete('/:id', deletePurchaseOrder);

export default router;
