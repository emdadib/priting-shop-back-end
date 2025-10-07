import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController';

const router = express.Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
  validateRequest
], getAllUsers);

router.get('/profile', getUserProfile);

router.get('/:id', getUserById);

router.post('/', [
  requireAdmin,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
  validateRequest
], createUser);

router.put('/profile', [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  validateRequest
], updateUserProfile);

router.put('/:id', [
  requireAdmin,
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validateRequest
], updateUser);

router.delete('/:id', requireAdmin, deleteUser);

export default router; 