"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalarySummary = exports.deleteSalary = exports.markSalaryAsPaid = exports.updateSalary = exports.createSalary = exports.getSalaryById = exports.getAllSalaries = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllSalaries = async (req, res) => {
    try {
        const { month, year, userId, status } = req.query;
        const where = {};
        if (month)
            where.month = parseInt(month);
        if (year)
            where.year = parseInt(year);
        if (userId)
            where.userId = userId;
        if (status)
            where.status = status;
        const salaries = await prisma.salary.findMany({
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
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json({
            success: true,
            data: salaries
        });
    }
    catch (error) {
        console.error('Get all salaries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salaries'
        });
    }
};
exports.getAllSalaries = getAllSalaries;
const getSalaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const salary = await prisma.salary.findUnique({
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
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }
        res.json({
            success: true,
            data: salary
        });
    }
    catch (error) {
        console.error('Get salary by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary'
        });
    }
};
exports.getSalaryById = getSalaryById;
const createSalary = async (req, res) => {
    try {
        const { userId, amount, month, year, notes, deductions, bonuses } = req.body;
        const currentUser = req.user;
        const existingSalary = await prisma.salary.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            }
        });
        if (existingSalary) {
            return res.status(400).json({
                success: false,
                message: 'Salary record already exists for this user, month, and year'
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const salary = await prisma.salary.create({
            data: {
                userId,
                amount: parseFloat(amount),
                month: parseInt(month),
                year: parseInt(year),
                notes,
                deductions: deductions ? parseFloat(deductions) : null,
                bonuses: bonuses ? parseFloat(bonuses) : null,
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
            entity: 'SALARY',
            entityId: salary.id,
            newValues: { userId, amount, month, year, notes, deductions, bonuses },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: salary
        });
    }
    catch (error) {
        console.error('Create salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create salary record'
        });
    }
};
exports.createSalary = createSalary;
const updateSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, notes, deductions, bonuses, status } = req.body;
        const currentUser = req.user;
        const existingSalary = await prisma.salary.findUnique({
            where: { id }
        });
        if (!existingSalary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }
        const updateData = {};
        if (amount !== undefined)
            updateData.amount = parseFloat(amount);
        if (notes !== undefined)
            updateData.notes = notes;
        if (deductions !== undefined)
            updateData.deductions = deductions ? parseFloat(deductions) : null;
        if (bonuses !== undefined)
            updateData.bonuses = bonuses ? parseFloat(bonuses) : null;
        if (status !== undefined)
            updateData.status = status;
        const updatedSalary = await prisma.salary.update({
            where: { id },
            data: updateData,
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
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'UPDATE',
            entity: 'SALARY',
            entityId: id,
            oldValues: {
                amount: existingSalary.amount,
                notes: existingSalary.notes,
                deductions: existingSalary.deductions,
                bonuses: existingSalary.bonuses,
                status: existingSalary.status
            },
            newValues: updateData,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedSalary
        });
    }
    catch (error) {
        console.error('Update salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update salary record'
        });
    }
};
exports.updateSalary = updateSalary;
const markSalaryAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const currentUser = req.user;
        const existingSalary = await prisma.salary.findUnique({
            where: { id }
        });
        if (!existingSalary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }
        if (existingSalary.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Salary is already marked as paid'
            });
        }
        const updatedSalary = await prisma.salary.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paidBy: currentUser?.id,
                notes: notes || existingSalary.notes
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
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'UPDATE',
            entity: 'SALARY',
            entityId: id,
            oldValues: {
                status: existingSalary.status,
                paidAt: existingSalary.paidAt,
                paidBy: existingSalary.paidBy
            },
            newValues: {
                status: 'PAID',
                paidAt: new Date(),
                paidBy: currentUser?.id
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedSalary
        });
    }
    catch (error) {
        console.error('Mark salary as paid error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark salary as paid'
        });
    }
};
exports.markSalaryAsPaid = markSalaryAsPaid;
const deleteSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const existingSalary = await prisma.salary.findUnique({
            where: { id }
        });
        if (!existingSalary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }
        if (existingSalary.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete paid salary records'
            });
        }
        await prisma.salary.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'DELETE',
            entity: 'SALARY',
            entityId: id,
            oldValues: {
                userId: existingSalary.userId,
                amount: existingSalary.amount,
                month: existingSalary.month,
                year: existingSalary.year,
                status: existingSalary.status
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Salary record deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete salary record'
        });
    }
};
exports.deleteSalary = deleteSalary;
const getSalarySummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }
        const salaries = await prisma.salary.findMany({
            where: {
                month: parseInt(month),
                year: parseInt(year)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });
        const summary = {
            totalSalaries: salaries.length,
            totalAmount: salaries.reduce((sum, salary) => sum + Number(salary.amount), 0),
            totalDeductions: salaries.reduce((sum, salary) => sum + Number(salary.deductions || 0), 0),
            totalBonuses: salaries.reduce((sum, salary) => sum + Number(salary.bonuses || 0), 0),
            paidSalaries: salaries.filter(s => s.status === 'PAID').length,
            pendingSalaries: salaries.filter(s => s.status === 'PENDING').length,
            approvedSalaries: salaries.filter(s => s.status === 'APPROVED').length,
            salaries: salaries
        };
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Get salary summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary summary'
        });
    }
};
exports.getSalarySummary = getSalarySummary;
//# sourceMappingURL=salaryController.js.map