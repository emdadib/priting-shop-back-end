import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getAttendance,
  clockIn,
  clockOut,
  getAttendanceReport,
  updateAttendance
} from '../controllers/attendanceController';

const router = express.Router();

router.get('/', [
  query('userId').optional().isString().withMessage('User ID must be a string'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  validateRequest
], getAttendance);

router.post('/clock-in', [
  body('userId').notEmpty().withMessage('User ID is required'),
  validateRequest
], clockIn);

router.post('/clock-out', [
  body('userId').notEmpty().withMessage('User ID is required'),
  validateRequest
], clockOut);

router.get('/report', getAttendanceReport);

router.put('/:id', [
  body('clockIn').optional().isISO8601().withMessage('Clock in must be a valid date'),
  body('clockOut').optional().isISO8601().withMessage('Clock out must be a valid date'),
  validateRequest
], updateAttendance);

export default router; 