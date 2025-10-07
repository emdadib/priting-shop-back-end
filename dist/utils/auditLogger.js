"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.createAuditLog = void 0;
const index_1 = require("../index");
const createAuditLog = async (data) => {
    try {
        await index_1.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                oldValues: data.oldValues ? JSON.stringify(data.oldValues) : undefined,
                newValues: data.newValues ? JSON.stringify(data.newValues) : undefined,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent
            }
        });
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.createAuditLog = createAuditLog;
const getAuditLogs = async (filters, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const where = {};
    if (filters.userId)
        where.userId = filters.userId;
    if (filters.entity)
        where.entity = filters.entity;
    if (filters.entityId)
        where.entityId = filters.entityId;
    if (filters.action)
        where.action = filters.action;
    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate)
            where.createdAt.gte = filters.startDate;
        if (filters.endDate)
            where.createdAt.lte = filters.endDate;
    }
    const [logs, total] = await Promise.all([
        index_1.prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        index_1.prisma.auditLog.count({ where })
    ]);
    return {
        logs: logs.map(log => ({
            ...log,
            oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
            newValues: log.newValues ? JSON.parse(log.newValues) : null
        })),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};
exports.getAuditLogs = getAuditLogs;
//# sourceMappingURL=auditLogger.js.map