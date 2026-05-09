import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireManager } from '../middleware/auth';
import {
  checkIn,
  lunchOut,
  lunchIn,
  checkOut,
  getTodayStatus,
  getMyHistory,
  getAllAttendance,
  getMonthlyReport,
  getConfig,
  updateConfig,
  calculateMonthlyDeductions,
  getMonthlyDeductions,
  adminMarkAttendance,
  deleteAttendanceRecord,
  updateAttendance,
  listShopClosures,
  createShopClosure,
  deleteShopClosure,
  listMyLeaves,
  requestLeave,
  cancelMyLeavePending,
  reviewLeaveRequest,
  listLeavesForManager,
} from '../controllers/attendanceController';

const router = express.Router();

// ---- Employee self-service ----
router.post('/check-in', checkIn);
router.post('/lunch-out', lunchOut);
router.post('/lunch-in', lunchIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayStatus);
router.get('/my-history', [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2020 }),
  validateRequest,
], getMyHistory);

// ---- Shop closed periods (readable by anyone; edits manager+) ----
router.get(
  '/shop-closures',
  [
    query('year').optional().isInt({ min: 2020 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
    validateRequest,
  ],
  listShopClosures
);
router.post('/shop-closures', [
  requireManager,
  body('startDate').isISO8601().withMessage('startDate required (ISO format)'),
  body('endDate').isISO8601().withMessage('endDate required (ISO format)'),
  body('reason').optional().isString(),
  validateRequest,
], createShopClosure);
router.delete('/shop-closures/:closureId', requireManager, deleteShopClosure);

// ---- Leave requests ----
router.get('/leaves/mine', listMyLeaves);
router.post('/leaves', [
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('leaveType').optional().isString(),
  body('reason').optional().isString(),
  validateRequest,
], requestLeave);
router.delete('/leaves/:leaveId', cancelMyLeavePending);

router.get('/leaves', [
  requireManager,
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  validateRequest,
], listLeavesForManager);
router.patch('/leaves/:leaveId/review', [
  requireManager,
  body('approved').isBoolean().withMessage('approved must be boolean'),
  body('reviewNote').optional().isString(),
  validateRequest,
], reviewLeaveRequest);

// ---- Config (readable by all, writable by manager+) ----
router.get('/config', getConfig);
router.put('/config', [
  requireManager,
  body('checkInTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Must be HH:MM format'),
  body('checkInLateThreshold').optional().matches(/^\d{2}:\d{2}$/),
  body('lunchBreakStartEarliest').optional().matches(/^\d{2}:\d{2}$/),
  body('lunchBreakEndLatest').optional().matches(/^\d{2}:\d{2}$/),
  body('checkOutTime').optional().matches(/^\d{2}:\d{2}$/),
  body('lateCountThreshold').optional().isInt({ min: 1 }),
  body('absentDaysThreshold').optional().isInt({ min: 1 }),
  body('lunchBreakMandatory').optional().isBoolean(),
  validateRequest,
], updateConfig);

// ---- Admin / Manager reports ----
router.get('/report', [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2020 }),
  validateRequest,
], getMonthlyReport);

router.post('/calculate-deductions', [
  requireManager,
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2020 }),
  validateRequest,
], calculateMonthlyDeductions);

router.get('/deductions', [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2020 }),
  validateRequest,
], getMonthlyDeductions);

router.post('/admin/mark', [
  requireManager,
  body('userId').notEmpty().withMessage('userId is required'),
  body('date').isISO8601().withMessage('date must be a valid date'),
  validateRequest,
], adminMarkAttendance);

// ---- General list & CRUD ----
router.get('/', [
  query('userId').optional().isString(),
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2020 }),
  validateRequest,
], getAllAttendance);

router.put('/:id', [
  body('clockIn').optional().isISO8601(),
  body('clockOut').optional().isISO8601(),
  validateRequest,
], updateAttendance);

router.delete('/:id', requireManager, deleteAttendanceRecord);

export default router;
