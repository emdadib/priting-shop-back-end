import express from 'express';
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  permanentlyDeleteSupplier,
  getSupplierStats
} from '../controllers/supplierController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all suppliers
router.get('/', getAllSuppliers);

// Get supplier statistics
router.get('/stats', getSupplierStats);

// Get supplier by ID
router.get('/:id', getSupplierById);

// Create new supplier
router.post('/', createSupplier);

// Update supplier
router.put('/:id', updateSupplier);

// Delete supplier (soft delete)
router.delete('/:id', deleteSupplier);

// Permanently delete supplier
router.delete('/:id/permanent', permanentlyDeleteSupplier);

export default router;
