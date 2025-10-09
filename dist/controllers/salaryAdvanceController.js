"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeAdvanceSummary = exports.deleteSalaryAdvance = exports.rejectSalaryAdvance = exports.paySalaryAdvance = exports.approveSalaryAdvance = exports.createSalaryAdvance = exports.getSalaryAdvanceById = exports.getAllSalaryAdvances = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllSalaryAdvances = async (req, res) => {
    try {
        const { userId, status, month, year } = req.query;
        const where = {};
        if (userId)
            where.userId = userId;
        if (status)
            where.status = status;
        if (month && year) {
            where.requestDate = {
                gte: new Date(parseInt(year), parseInt(month) - 1, 1),
                lt: new Date(parseInt(year), parseInt(month), 1)
            };
        }
        const advances = await prisma.salaryAdvance.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                salary: {
                    select: {
                        id: true,
                        month: true,
                        year: true,
                        amount: true
                    }
                },
                approvedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                requestDate: 'desc'
            }
        });
        res.json({
            success: true,
            data: advances
        });
    }
    catch (error) {
        console.error('Get all salary advances error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary advances'
        });
    }
};
exports.getAllSalaryAdvances = getAllSalaryAdvances;
const getSalaryAdvanceById = async (req, res) => {
    try {
        const { id } = req.params;
        const advance = await prisma.salaryAdvance.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                salary: {
                    select: {
                        id: true,
                        month: true,
                        year: true,
                        amount: true
                    }
                },
                approvedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!advance) {
            return res.status(404).json({
                success: false,
                message: 'Salary advance not found'
            });
        }
        res.json({
            success: true,
            data: advance
        });
    }
    catch (error) {
        console.error('Get salary advance by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary advance'
        });
    }
};
exports.getSalaryAdvanceById = getSalaryAdvanceById;
const createSalaryAdvance = async (req, res) => {
    try {
        const { userId, amount, reason, notes } = req.body;
        const currentUser = req.user;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (userId !== currentUser?.id && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You can only request advances for yourself'
            });
        }
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const existingSalary = await prisma.salary.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month: currentMonth,
                    year: currentYear
                }
            }
        });
        const totalAdvances = await prisma.salaryAdvance.aggregate({
            where: {
                userId,
                status: { in: ['PENDING', 'APPROVED', 'PAID'] },
                requestDate: {
                    gte: new Date(currentYear, currentMonth - 1, 1),
                    lt: new Date(currentYear, currentMonth, 1)
                }
            },
            _sum: {
                amount: true
            }
        });
        const totalAdvancesAmount = Number(totalAdvances._sum.amount || 0);
        const requestedAmount = parseFloat(amount);
        if (existingSalary) {
            const remainingSalary = Number(existingSalary.amount) - totalAdvancesAmount;
            if (requestedAmount > remainingSalary) {
                return res.status(400).json({
                    success: false,
                    message: `Advance amount exceeds remaining salary. Available: $${remainingSalary.toLocaleString()}`
                });
            }
        }
        else {
            console.log(`No salary record found for user ${userId} for ${currentMonth}/${currentYear}`);
        }
        const advance = await prisma.salaryAdvance.create({
            data: {
                userId,
                amount: requestedAmount,
                reason,
                notes,
                status: 'PENDING'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'CREATE',
            entity: 'SALARY_ADVANCE',
            entityId: advance.id,
            newValues: { userId, amount: requestedAmount, reason, notes },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: advance
        });
    }
    catch (error) {
        console.error('Create salary advance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create salary advance request'
        });
    }
};
exports.createSalaryAdvance = createSalaryAdvance;
const approveSalaryAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const currentUser = req.user;
        const existingAdvance = await prisma.salaryAdvance.findUnique({
            where: { id }
        });
        if (!existingAdvance) {
            return res.status(404).json({
                success: false,
                message: 'Salary advance not found'
            });
        }
        if (existingAdvance.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only pending advances can be approved'
            });
        }
        const updatedAdvance = await prisma.salaryAdvance.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy: currentUser?.id,
                approvedAt: new Date(),
                notes: notes || existingAdvance.notes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                approvedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'UPDATE',
            entity: 'SALARY_ADVANCE',
            entityId: id,
            oldValues: {
                status: existingAdvance.status,
                approvedBy: existingAdvance.approvedBy,
                approvedAt: existingAdvance.approvedAt
            },
            newValues: {
                status: 'APPROVED',
                approvedBy: currentUser?.id,
                approvedAt: new Date()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedAdvance
        });
    }
    catch (error) {
        console.error('Approve salary advance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve salary advance'
        });
    }
};
exports.approveSalaryAdvance = approveSalaryAdvance;
const paySalaryAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const currentUser = req.user;
        const existingAdvance = await prisma.salaryAdvance.findUnique({
            where: { id }
        });
        if (!existingAdvance) {
            return res.status(404).json({
                success: false,
                message: 'Salary advance not found'
            });
        }
        if (existingAdvance.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Only approved advances can be paid'
            });
        }
        const updatedAdvance = await prisma.salaryAdvance.update({
            where: { id },
            data: {
                status: 'PAID',
                paidBy: currentUser?.id,
                paidAt: new Date(),
                notes: notes || existingAdvance.notes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const existingSalary = await prisma.salary.findUnique({
            where: {
                userId_month_year: {
                    userId: existingAdvance.userId,
                    month: currentMonth,
                    year: currentYear
                }
            }
        });
        if (existingSalary) {
            await prisma.salary.update({
                where: {
                    userId_month_year: {
                        userId: existingAdvance.userId,
                        month: currentMonth,
                        year: currentYear
                    }
                },
                data: {
                    advances: {
                        increment: Number(existingAdvance.amount)
                    }
                }
            });
        }
        else {
            await prisma.salary.create({
                data: {
                    userId: existingAdvance.userId,
                    amount: 0,
                    month: currentMonth,
                    year: currentYear,
                    advances: Number(existingAdvance.amount),
                    status: 'PENDING'
                }
            });
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'UPDATE',
            entity: 'SALARY_ADVANCE',
            entityId: id,
            oldValues: {
                status: existingAdvance.status,
                paidBy: existingAdvance.paidBy,
                paidAt: existingAdvance.paidAt
            },
            newValues: {
                status: 'PAID',
                paidBy: currentUser?.id,
                paidAt: new Date()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedAdvance
        });
    }
    catch (error) {
        console.error('Pay salary advance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pay salary advance'
        });
    }
};
exports.paySalaryAdvance = paySalaryAdvance;
const rejectSalaryAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const currentUser = req.user;
        const existingAdvance = await prisma.salaryAdvance.findUnique({
            where: { id }
        });
        if (!existingAdvance) {
            return res.status(404).json({
                success: false,
                message: 'Salary advance not found'
            });
        }
        if (existingAdvance.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only pending advances can be rejected'
            });
        }
        const updatedAdvance = await prisma.salaryAdvance.update({
            where: { id },
            data: {
                status: 'REJECTED',
                notes: reason || existingAdvance.notes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'UPDATE',
            entity: 'SALARY_ADVANCE',
            entityId: id,
            oldValues: {
                status: existingAdvance.status
            },
            newValues: {
                status: 'REJECTED'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedAdvance
        });
    }
    catch (error) {
        console.error('Reject salary advance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject salary advance'
        });
    }
};
exports.rejectSalaryAdvance = rejectSalaryAdvance;
const deleteSalaryAdvance = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const existingAdvance = await prisma.salaryAdvance.findUnique({
            where: { id }
        });
        if (!existingAdvance) {
            return res.status(404).json({
                success: false,
                message: 'Salary advance not found'
            });
        }
        if (existingAdvance.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only pending advances can be deleted'
            });
        }
        await prisma.salaryAdvance.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'DELETE',
            entity: 'SALARY_ADVANCE',
            entityId: id,
            oldValues: {
                userId: existingAdvance.userId,
                amount: existingAdvance.amount,
                reason: existingAdvance.reason,
                status: existingAdvance.status
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Salary advance deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete salary advance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete salary advance'
        });
    }
};
exports.deleteSalaryAdvance = deleteSalaryAdvance;
const getEmployeeAdvanceSummary = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month, year } = req.query;
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        const advances = await prisma.salaryAdvance.findMany({
            where: {
                userId,
                requestDate: {
                    gte: new Date(targetYear, targetMonth - 1, 1),
                    lt: new Date(targetYear, targetMonth, 1)
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        const summary = {
            userId,
            month: targetMonth,
            year: targetYear,
            totalAdvances: advances.length,
            totalAmount: advances.reduce((sum, advance) => sum + Number(advance.amount), 0),
            pendingAmount: advances
                .filter((a) => a.status === 'PENDING')
                .reduce((sum, advance) => sum + Number(advance.amount), 0),
            approvedAmount: advances
                .filter((a) => a.status === 'APPROVED')
                .reduce((sum, advance) => sum + Number(advance.amount), 0),
            paidAmount: advances
                .filter((a) => a.status === 'PAID')
                .reduce((sum, advance) => sum + Number(advance.amount), 0),
            advances: advances
        };
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Get employee advance summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch advance summary'
        });
    }
};
exports.getEmployeeAdvanceSummary = getEmployeeAdvanceSummary;
//# sourceMappingURL=salaryAdvanceController.js.map