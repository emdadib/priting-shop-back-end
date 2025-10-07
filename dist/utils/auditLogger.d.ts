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
export declare const createAuditLog: (data: AuditLogData) => Promise<void>;
export declare const getAuditLogs: (filters: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
}, page?: number, limit?: number) => Promise<{
    logs: {
        oldValues: any;
        newValues: any;
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        } | null;
        id: string;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}>;
//# sourceMappingURL=auditLogger.d.ts.map