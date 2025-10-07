import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth';
import {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  createSetting,
  deleteSetting
} from '../controllers/settingController';

const router = express.Router();

router.get('/', getAllSettings);

router.get('/:key', getSettingByKey);

router.post('/', [
  requireAdmin,
  body('key').notEmpty().withMessage('Key is required'),
  body('value').notEmpty().withMessage('Value is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  validateRequest
], createSetting);

router.put('/:key', [
  requireAdmin,
  body('value').notEmpty().withMessage('Value is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  validateRequest
], updateSetting);

router.delete('/:key', requireAdmin, deleteSetting);

export default router; 