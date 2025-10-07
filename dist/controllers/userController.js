"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = exports.updateCurrentUser = exports.getCurrentUser = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const { email, username, firstName, lastName, password, role } = req.body;
        const currentUser = req.user;
        if (role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only SuperAdmin can create SuperAdmin users'
            });
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email,
                username,
                firstName,
                lastName,
                password: hashedPassword,
                role: role || 'STAFF',
                isActive: true
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'CREATE',
            entity: 'USER',
            entityId: user.id,
            newValues: { email, username, firstName, lastName, role },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, username, firstName, lastName, role, isActive } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                email,
                username,
                firstName,
                lastName,
                role,
                isActive
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                updatedAt: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'UPDATE',
            entity: 'USER',
            entityId: id,
            oldValues: {
                email: existingUser.email,
                username: existingUser.username,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                role: existingUser.role,
                isActive: existingUser.isActive
            },
            newValues: { email, username, firstName, lastName, role, isActive },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedUser
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        await prisma.user.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'DELETE',
            entity: 'USER',
            entityId: id,
            oldValues: {
                email: existingUser.email,
                username: existingUser.username,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                role: existingUser.role
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};
exports.deleteUser = deleteUser;
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile'
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const updateCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { email, username, firstName, lastName } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email,
                username,
                firstName,
                lastName
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                updatedAt: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'UPDATE',
            entity: 'USER',
            entityId: userId,
            oldValues: {
                email: existingUser.email,
                username: existingUser.username,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName
            },
            newValues: { email, username, firstName, lastName },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedUser
        });
    }
    catch (error) {
        console.error('Update current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};
exports.updateCurrentUser = updateCurrentUser;
exports.getUserProfile = exports.getCurrentUser;
exports.updateUserProfile = exports.updateCurrentUser;
//# sourceMappingURL=userController.js.map