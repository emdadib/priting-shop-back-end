import express from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getSalesReport,
  getInventoryReport,
  getCustomerReport,
  getFinancialReport,
  getProfitReport,
  getStaffReport,
  getDashboardStats
} from '../controllers/reportController';

const router = express.Router();

router.get('/sales', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid group by option'),
  validateRequest
], getSalesReport);

router.get('/inventory', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('lowStock').optional().isBoolean().withMessage('Low stock must be a boolean'),
  validateRequest
], getInventoryReport);

router.get('/customers', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getCustomerReport);

router.get('/financial', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getFinancialReport);

router.get('/profit', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getProfitReport);

router.get('/staff', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getStaffReport);

router.get('/dashboard', getDashboardStats);

export default router; 