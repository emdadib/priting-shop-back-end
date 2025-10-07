import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { authenticateToken, requireSuperAdmin, requireAdmin } from '../middleware/auth';
import {
  getAllPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission,
  getAllMenus,
  getUserMenuPermissions,
  grantMenuPermission,
  revokeMenuPermission,
  getUserAccessibleMenus
} from '../controllers/permissionController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Permission routes
router.get('/permissions', getAllPermissions);

router.get('/permissions/user/:userId', [
  param('userId').isString().withMessage('User ID must be a string'),
  validateRequest
], getUserPermissions);

router.post('/permissions/grant', [
  requireSuperAdmin,
  body('userId').isString().withMessage('User ID is required'),
  body('permissionId').isString().withMessage('Permission ID is required'),
  body('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date'),
  validateRequest
], grantPermission);

router.post('/permissions/revoke', [
  requireSuperAdmin,
  body('userId').isString().withMessage('User ID is required'),
  body('permissionId').isString().withMessage('Permission ID is required'),
  validateRequest
], revokePermission);

// Menu routes
router.get('/menus', getAllMenus);

router.get('/menus/user/:userId', [
  param('userId').isString().withMessage('User ID must be a string'),
  validateRequest
], getUserMenuPermissions);

router.get('/menus/accessible/:userId', [
  param('userId').isString().withMessage('User ID must be a string'),
  validateRequest
], getUserAccessibleMenus);

router.post('/menus/grant', [
  requireSuperAdmin,
  body('userId').isString().withMessage('User ID is required'),
  body('menuId').isString().withMessage('Menu ID is required'),
  validateRequest
], grantMenuPermission);

router.post('/menus/revoke', [
  requireSuperAdmin,
  body('userId').isString().withMessage('User ID is required'),
  body('menuId').isString().withMessage('Menu ID is required'),
  validateRequest
], revokeMenuPermission);

export default router;
