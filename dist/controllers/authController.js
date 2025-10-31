"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.logout = exports.refreshToken = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const generateTokens = (userId) => {
    const accessToken = jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
const login = async (req, res) => {
    try {
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured!');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please contact administrator.'
            });
        }
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        console.log('Login attempt:', { email, timestamp: new Date().toISOString() });
        const user = await index_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLogin: true
            }
        });
        if (!user) {
            console.log('Login failed: User not found', { email });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        if (!user.isActive) {
            console.log('Login failed: User inactive', { email, userId: user.id });
            return res.status(401).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('Login failed: Invalid password', { email, userId: user.id });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const { accessToken, refreshToken } = generateTokens(user.id);
        await index_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: user.id,
            action: 'LOGIN',
            entity: 'USER',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('Login error:', {
            message: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        if (error.code === 'P1001') {
            return res.status(500).json({
                success: false,
                message: 'Database connection error. Please try again later.'
            });
        }
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? 'Login failed. Please try again.'
                : error.message || 'Login failed'
        });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { email, username, password, firstName, lastName, role } = req.body;
        const existingUser = await index_1.prisma.user.findFirst({
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
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const user = await index_1.prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                firstName,
                lastName,
                role
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'CREATE',
            entity: 'USER',
            entityId: user.id,
            newValues: { email, username, firstName, lastName, role },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};
exports.register = register;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                isActive: true
            }
        });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
        const tokens = generateTokens(user.id);
        res.json({
            success: true,
            data: tokens
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};
exports.logout = logout;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        const saltRounds = 12;
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await index_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'CHANGE_PASSWORD',
            entity: 'USER',
            entityId: userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password change failed'
        });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map