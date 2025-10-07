"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceReport = exports.clockOut = exports.clockIn = exports.getAttendance = exports.deleteAttendance = exports.updateAttendance = exports.createAttendance = exports.getAttendanceById = exports.getAllAttendance = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllAttendance = async (req, res) => {
    res.json({ success: true, data: [] });
};
exports.getAllAttendance = getAllAttendance;
const getAttendanceById = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.getAttendanceById = getAttendanceById;
const createAttendance = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.createAttendance = createAttendance;
const updateAttendance = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.updateAttendance = updateAttendance;
const deleteAttendance = async (req, res) => {
    res.json({ success: true, message: 'Attendance deleted' });
};
exports.deleteAttendance = deleteAttendance;
exports.getAttendance = exports.getAllAttendance;
const clockIn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lt: tomorrow
                },
                clockOut: null
            }
        });
        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'Already clocked in today'
            });
        }
        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: new Date(),
                clockIn: new Date()
            },
            include: {
                user: true
            }
        });
        res.status(201).json({
            success: true,
            data: attendance
        });
    }
    catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clock in'
        });
    }
};
exports.clockIn = clockIn;
const clockOut = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lt: tomorrow
                },
                clockOut: null
            }
        });
        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active clock-in found'
            });
        }
        const clockOutTime = new Date();
        const totalHours = attendance.clockIn ? (clockOutTime.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60) : 0;
        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                clockOut: clockOutTime,
                totalHours: totalHours
            },
            include: {
                user: true
            }
        });
        res.json({
            success: true,
            data: updatedAttendance
        });
    }
    catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clock out'
        });
    }
};
exports.clockOut = clockOut;
const getAttendanceReport = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        if (userId) {
            where.userId = userId;
        }
        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });
        const totalHours = attendance.reduce((sum, record) => sum + Number(record.totalHours || 0), 0);
        const presentDays = attendance.filter(record => record.clockIn !== null).length;
        const absentDays = attendance.filter(record => record.clockIn === null).length;
        res.json({
            success: true,
            data: {
                attendance,
                totalHours,
                presentDays,
                absentDays,
                totalDays: attendance.length
            }
        });
    }
    catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate attendance report'
        });
    }
};
exports.getAttendanceReport = getAttendanceReport;
//# sourceMappingURL=attendanceController.js.map