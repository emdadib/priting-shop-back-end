import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createPayment,
  getCustomerDueAmount,
  getOrderDueAmount,
  getOrderPayments
} from '../controllers/paymentController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Payment routes
router.post('/', createPayment);
router.get('/customer/:customerId/due', getCustomerDueAmount);
router.get('/order/:orderId/due', getOrderDueAmount);
router.get('/order/:orderId', getOrderPayments);

export default router; 