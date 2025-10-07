"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canViewMenu = exports.requirePermission = exports.requireCashier = exports.requireManager = exports.requireAdmin = exports.requireSuperAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                isActive: true
            }
        });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireSuperAdmin = (0, exports.requireRole)(['SUPER_ADMIN']);
exports.requireAdmin = (0, exports.requireRole)(['SUPER_ADMIN', 'ADMIN']);
exports.requireManager = (0, exports.requireRole)(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
exports.requireCashier = (0, exports.requireRole)(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']);
const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }
            const permission = await index_1.prisma.permission.findFirst({
                where: {
                    resource,
                    action,
                    isActive: true
                }
            });
            if (!permission) {
                return res.status(403).json({
                    success: false,
                    message: 'Permission not found'
                });
            }
            const userPermission = await index_1.prisma.userPermission.findFirst({
                where: {
                    userId: req.user.id,
                    permissionId: permission.id,
                    granted: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            });
            if (!userPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions: ${resource}.${action}`
                });
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};
exports.requirePermission = requirePermission;
const canViewMenu = async (userId, menuName) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        if (!user)
            return false;
        if (user.role === 'SUPER_ADMIN')
            return true;
        const menu = await index_1.prisma.menu.findUnique({
            where: { name: menuName }
        });
        if (!menu || !menu.isActive)
            return false;
        const menuPermission = await index_1.prisma.userMenuPermission.findFirst({
            where: {
                userId,
                menuId: menu.id,
                canView: true
            }
        });
        if (menuPermission)
            return true;
        if (menu.requiresRole) {
            const roleHierarchy = {
                'SUPER_ADMIN': 6,
                'ADMIN': 5,
                'MANAGER': 4,
                'CASHIER': 3,
                'OPERATOR': 2,
                'STAFF': 1
            };
            const userRoleLevel = roleHierarchy[user.role] || 0;
            const requiredRoleLevel = roleHierarchy[menu.requiresRole] || 0;
            return userRoleLevel >= requiredRoleLevel;
        }
        return true;
    }
    catch (error) {
        console.error('Menu permission check error:', error);
        return false;
    }
};
exports.canViewMenu = canViewMenu;
//# sourceMappingURL=auth.js.map