import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicesByStatus,
  getInvoicesByCustomer,
  generateInvoicePDF
} from '../controllers/invoiceController';

const router = express.Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], getAllInvoices);

router.get('/status/:status', getInvoicesByStatus);

router.get('/customer/:customerId', getInvoicesByCustomer);

router.get('/:id', getInvoiceById);

router.get('/:id/pdf', generateInvoicePDF);

router.post('/', [
  body('orderId').optional().isString().withMessage('Order ID must be a string'),
  body('customerId').optional().isString().withMessage('Customer ID must be a string'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
  validateRequest
], createInvoice);

router.put('/:id', [
  body('status').optional().isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).withMessage('Invalid status'),
  validateRequest
], updateInvoice);

router.delete('/:id', deleteInvoice);

export default router; 