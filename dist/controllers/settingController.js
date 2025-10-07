"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetting = exports.updateSetting = exports.deleteSetting = exports.upsertSetting = exports.getSettingByKey = exports.getAllSettings = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllSettings = async (req, res) => {
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
    }
    catch (error) {
        console.error('Get all settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
};
exports.getAllSettings = getAllSettings;
const getSettingByKey = async (req, res) => {
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
    }
    catch (error) {
        console.error('Get setting by key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch setting'
        });
    }
};
exports.getSettingByKey = getSettingByKey;
const upsertSetting = async (req, res) => {
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
        await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (error) {
        console.error('Upsert setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting'
        });
    }
};
exports.upsertSetting = upsertSetting;
const deleteSetting = async (req, res) => {
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
        await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete setting'
        });
    }
};
exports.deleteSetting = deleteSetting;
const updateSetting = async (req, res) => {
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
    }
    catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting'
        });
    }
};
exports.updateSetting = updateSetting;
const createSetting = async (req, res) => {
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
    }
    catch (error) {
        console.error('Create setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create setting'
        });
    }
};
exports.createSetting = createSetting;
//# sourceMappingURL=settingController.js.map