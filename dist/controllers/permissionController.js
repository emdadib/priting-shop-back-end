"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAccessibleMenus = exports.revokeMenuPermission = exports.grantMenuPermission = exports.getUserMenuPermissions = exports.getAllMenus = exports.revokePermission = exports.grantPermission = exports.getUserPermissions = exports.getAllPermissions = void 0;
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const getAllPermissions = async (req, res) => {
    try {
        const permissions = await index_1.prisma.permission.findMany({
            where: { isActive: true },
            orderBy: [
                { resource: 'asc' },
                { action: 'asc' }
            ]
        });
        res.json({
            success: true,
            data: permissions
        });
    }
    catch (error) {
        console.error('Get all permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions'
        });
    }
};
exports.getAllPermissions = getAllPermissions;
const getUserPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const userPermissions = await index_1.prisma.userPermission.findMany({
            where: { userId },
            include: {
                permission: true
            }
        });
        res.json({
            success: true,
            data: userPermissions
        });
    }
    catch (error) {
        console.error('Get user permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user permissions'
        });
    }
};
exports.getUserPermissions = getUserPermissions;
const grantPermission = async (req, res) => {
    try {
        const { userId, permissionId, expiresAt } = req.body;
        const grantedBy = req.user?.id;
        if (!grantedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const existingPermission = await index_1.prisma.userPermission.findFirst({
            where: {
                userId,
                permissionId
            }
        });
        let userPermission;
        if (existingPermission) {
            userPermission = await index_1.prisma.userPermission.update({
                where: { id: existingPermission.id },
                data: {
                    granted: true,
                    grantedBy,
                    grantedAt: new Date(),
                    expiresAt: expiresAt ? new Date(expiresAt) : null
                },
                include: {
                    permission: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        }
        else {
            userPermission = await index_1.prisma.userPermission.create({
                data: {
                    userId,
                    permissionId,
                    granted: true,
                    grantedBy,
                    expiresAt: expiresAt ? new Date(expiresAt) : null
                },
                include: {
                    permission: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: grantedBy,
            action: 'GRANT_PERMISSION',
            entity: 'USER_PERMISSION',
            entityId: userPermission.id,
            newValues: {
                userId,
                permissionId,
                granted: true,
                expiresAt
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: userPermission
        });
    }
    catch (error) {
        console.error('Grant permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant permission'
        });
    }
};
exports.grantPermission = grantPermission;
const revokePermission = async (req, res) => {
    try {
        const { userId, permissionId } = req.body;
        const revokedBy = req.user?.id;
        if (!revokedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const userPermission = await index_1.prisma.userPermission.findFirst({
            where: {
                userId,
                permissionId
            }
        });
        if (!userPermission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found'
            });
        }
        await index_1.prisma.userPermission.update({
            where: { id: userPermission.id },
            data: {
                granted: false,
                grantedBy: revokedBy,
                grantedAt: new Date()
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: revokedBy,
            action: 'REVOKE_PERMISSION',
            entity: 'USER_PERMISSION',
            entityId: userPermission.id,
            oldValues: {
                userId,
                permissionId,
                granted: true
            },
            newValues: {
                userId,
                permissionId,
                granted: false
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Permission revoked successfully'
        });
    }
    catch (error) {
        console.error('Revoke permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke permission'
        });
    }
};
exports.revokePermission = revokePermission;
const getAllMenus = async (req, res) => {
    try {
        const menus = await index_1.prisma.menu.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });
        res.json({
            success: true,
            data: menus
        });
    }
    catch (error) {
        console.error('Get all menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch menus'
        });
    }
};
exports.getAllMenus = getAllMenus;
const getUserMenuPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const userMenuPermissions = await index_1.prisma.userMenuPermission.findMany({
            where: { userId },
            include: {
                menu: true
            }
        });
        res.json({
            success: true,
            data: userMenuPermissions
        });
    }
    catch (error) {
        console.error('Get user menu permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user menu permissions'
        });
    }
};
exports.getUserMenuPermissions = getUserMenuPermissions;
const grantMenuPermission = async (req, res) => {
    try {
        const { userId, menuId } = req.body;
        const grantedBy = req.user?.id;
        if (!grantedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const existingPermission = await index_1.prisma.userMenuPermission.findFirst({
            where: {
                userId,
                menuId
            }
        });
        let userMenuPermission;
        if (existingPermission) {
            userMenuPermission = await index_1.prisma.userMenuPermission.update({
                where: { id: existingPermission.id },
                data: {
                    canView: true,
                    grantedBy,
                    grantedAt: new Date()
                },
                include: {
                    menu: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        }
        else {
            userMenuPermission = await index_1.prisma.userMenuPermission.create({
                data: {
                    userId,
                    menuId,
                    canView: true,
                    grantedBy
                },
                include: {
                    menu: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: grantedBy,
            action: 'GRANT_MENU_PERMISSION',
            entity: 'USER_MENU_PERMISSION',
            entityId: userMenuPermission.id,
            newValues: {
                userId,
                menuId,
                canView: true
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: userMenuPermission
        });
    }
    catch (error) {
        console.error('Grant menu permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant menu permission'
        });
    }
};
exports.grantMenuPermission = grantMenuPermission;
const revokeMenuPermission = async (req, res) => {
    try {
        const { userId, menuId } = req.body;
        const revokedBy = req.user?.id;
        if (!revokedBy) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const userMenuPermission = await index_1.prisma.userMenuPermission.findFirst({
            where: {
                userId,
                menuId
            }
        });
        if (!userMenuPermission) {
            return res.status(404).json({
                success: false,
                message: 'Menu permission not found'
            });
        }
        await index_1.prisma.userMenuPermission.update({
            where: { id: userMenuPermission.id },
            data: {
                canView: false,
                grantedBy: revokedBy,
                grantedAt: new Date()
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: revokedBy,
            action: 'REVOKE_MENU_PERMISSION',
            entity: 'USER_MENU_PERMISSION',
            entityId: userMenuPermission.id,
            oldValues: {
                userId,
                menuId,
                canView: true
            },
            newValues: {
                userId,
                menuId,
                canView: false
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Menu permission revoked successfully'
        });
    }
    catch (error) {
        console.error('Revoke menu permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke menu permission'
        });
    }
};
exports.revokeMenuPermission = revokeMenuPermission;
const getUserAccessibleMenus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.role === 'SUPER_ADMIN') {
            const allMenus = await index_1.prisma.menu.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                include: {
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: 'asc' }
                    }
                }
            });
            return res.json({
                success: true,
                data: allMenus
            });
        }
        const roleHierarchy = {
            'ADMIN': 5,
            'MANAGER': 4,
            'CASHIER': 3,
            'OPERATOR': 2,
            'STAFF': 1
        };
        const userRoleLevel = roleHierarchy[user.role] || 0;
        const accessibleMenus = await index_1.prisma.menu.findMany({
            where: {
                isActive: true,
                OR: [
                    { requiresRole: null },
                    { requiresRole: { in: Object.keys(roleHierarchy).filter(role => roleHierarchy[role] <= userRoleLevel) } }
                ]
            },
            orderBy: { sortOrder: 'asc' },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });
        const userMenuPermissions = await index_1.prisma.userMenuPermission.findMany({
            where: {
                userId,
                canView: true
            },
            include: {
                menu: true
            }
        });
        const allAccessibleMenus = [...accessibleMenus];
        userMenuPermissions.forEach(permission => {
            if (!allAccessibleMenus.find(menu => menu.id === permission.menu.id)) {
                const menuWithChildren = {
                    ...permission.menu,
                    children: []
                };
                allAccessibleMenus.push(menuWithChildren);
            }
        });
        res.json({
            success: true,
            data: allAccessibleMenus.sort((a, b) => a.sortOrder - b.sortOrder)
        });
    }
    catch (error) {
        console.error('Get user accessible menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accessible menus'
        });
    }
};
exports.getUserAccessibleMenus = getUserAccessibleMenus;
//# sourceMappingURL=permissionController.js.map