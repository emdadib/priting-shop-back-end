import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all settings
export const getAllSettings = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: {
        key: 'asc'
      }
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

// Get setting by key
export const getSettingByKey = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { key } = req.params;

    const setting = await prisma.setting.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
};

// Create or update setting
export const upsertSetting = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { key, value, description } = req.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        description
      },
      create: {
        key,
        value,
        description
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE',
      entity: 'SETTING',
      entityId: setting.id,
      newValues: { key, value, description },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Upsert setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
};

// Delete setting
export const deleteSetting = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { key } = req.params;

    const existingSetting = await prisma.setting.findUnique({
      where: { key }
    });

    if (!existingSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    await prisma.setting.delete({
      where: { key }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'DELETE',
      entity: 'SETTING',
      entityId: existingSetting.id,
      oldValues: {
        key: existingSetting.key,
        value: existingSetting.value,
        description: existingSetting.description
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete setting'
    });
  }
};

// Update setting
export const updateSetting = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const existingSetting = await prisma.setting.findUnique({
      where: { key }
    });

    if (!existingSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const updatedSetting = await prisma.setting.update({
      where: { key },
      data: {
        value,
        description
      }
    });

    res.json({
      success: true,
      data: updatedSetting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
};

// Create setting
export const createSetting = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { key, value, description, isPublic } = req.body;

    const existingSetting = await prisma.setting.findUnique({
      where: { key }
    });

    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: 'Setting with this key already exists'
      });
    }

    const newSetting = await prisma.setting.create({
      data: {
        key,
        value,
        description,
        isPublic: isPublic || false
      }
    });

    res.status(201).json({
      success: true,
      data: newSetting
    });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create setting'
    });
  }
}; 