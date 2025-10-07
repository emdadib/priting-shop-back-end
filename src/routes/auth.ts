import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { login, register, refreshToken, logout, changePassword } from '../controllers/authController';

const router = express.Router();

// Login route
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long'),
  validateRequest
], login);

// Register route (admin only)
router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF']).withMessage('Invalid role'),
  validateRequest
], register);

// Refresh token route
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validateRequest
], refreshToken);

// Logout route
router.post('/logout', logout);

// Change password route
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validateRequest
], changePassword);

export default router; 