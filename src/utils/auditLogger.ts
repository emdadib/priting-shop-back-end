import { prisma } from '../index';

export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    await prisma.auditLog.create({
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
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

export const getAuditLogs = async (
  filters: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  limit: number = 50
) => {
  const skip = (page - 1) * limit;
  
  const where: any = {};
  
  if (filters.userId) where.userId = filters.userId;
  if (filters.entity) where.entity = filters.entity;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.action) where.action = filters.action;
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
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
    prisma.auditLog.count({ where })
  ]);

  return {
    logs: logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues as string) : null,
      newValues: log.newValues ? JSON.parse(log.newValues as string) : null
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}; 