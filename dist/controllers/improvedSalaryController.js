"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalaryPayment = exports.getSalaryPaymentById = exports.getMonthlySalarySummary = exports.markPaymentAsPaid = exports.processMonthlyPayment = exports.setEmployeeSalary = exports.getEmployeeSalaryProfiles = void 0;
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const getEmployeeSalaryProfiles = async (req, res) => {
    try {
        const profiles = await index_1.prisma.employeeSalaryProfile.findMany({
            where: { isActive: true },
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
                salaryPayments: {
                    where: {
                        year: new Date().getFullYear()
                    },
                    orderBy: {
                        month: 'desc'
                    },
                    take: 12
                }
            },
            orderBy: {
                user: {
                    firstName: 'asc'
                }
            }
        });
        res.json({
            success: true,
            data: profiles
        });
    }
    catch (error) {
        console.error('Get employee salary profiles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee salary profiles'
        });
    }
};
exports.getEmployeeSalaryProfiles = getEmployeeSalaryProfiles;
const setEmployeeSalary = async (req, res) => {
    try {
        const { userId, baseSalary, notes } = req.body;
        const currentUser = req.user;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const existingProfile = await index_1.prisma.employeeSalaryProfile.findUnique({
            where: { userId }
        });
        let profile;
        if (existingProfile) {
            profile = await index_1.prisma.employeeSalaryProfile.update({
                where: { userId },
                data: {
                    baseSalary: parseFloat(baseSalary),
                    notes,
                    updatedAt: new Date()
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
        }
        else {
            profile = await index_1.prisma.employeeSalaryProfile.create({
                data: {
                    userId,
                    baseSalary: parseFloat(baseSalary),
                    notes,
                    isActive: true
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
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: existingProfile ? 'UPDATE' : 'CREATE',
            entity: 'EMPLOYEE_SALARY_PROFILE',
            entityId: profile.id,
            newValues: { userId, baseSalary, notes },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: profile
        });
    }
    catch (error) {
        console.error('Set employee salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set employee salary'
        });
    }
};
exports.setEmployeeSalary = setEmployeeSalary;
const processMonthlyPayment = async (req, res) => {
    try {
        const { userId, month, year, amount, deductions, bonuses, notes } = req.body;
        const currentUser = req.user;
        const profile = await index_1.prisma.employeeSalaryProfile.findUnique({
            where: { userId, isActive: true }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Employee salary profile not found'
            });
        }
        const existingPayment = await index_1.prisma.salaryPayment.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            }
        });
        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Salary payment already exists for this month and year'
            });
        }
        const paymentAmount = amount ? parseFloat(amount) : profile.baseSalary;
        const payment = await index_1.prisma.salaryPayment.create({
            data: {
                userId,
                profileId: profile.id,
                amount: paymentAmount,
                month: parseInt(month),
                year: parseInt(year),
                deductions: deductions ? parseFloat(deductions) : null,
                bonuses: bonuses ? parseFloat(bonuses) : null,
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
                },
                profile: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'CREATE',
            entity: 'SALARY_PAYMENT',
            entityId: payment.id,
            newValues: { userId, month, year, amount: paymentAmount, deductions, bonuses, notes },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Process monthly payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process monthly payment'
        });
    }
};
exports.processMonthlyPayment = processMonthlyPayment;
const markPaymentAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const currentUser = req.user;
        const payment = await index_1.prisma.salaryPayment.findUnique({
            where: { id }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Salary payment not found'
            });
        }
        if (payment.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Payment is already marked as paid'
            });
        }
        const updatedPayment = await index_1.prisma.salaryPayment.update({
            where: { id },
            data: {
                status: 'PAID',
                paidBy: currentUser?.id,
                paidAt: new Date(),
                notes: notes || payment.notes
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
                profile: true,
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
            entity: 'SALARY_PAYMENT',
            entityId: id,
            oldValues: { status: payment.status },
            newValues: { status: 'PAID', paidBy: currentUser?.id, paidAt: new Date() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedPayment
        });
    }
    catch (error) {
        console.error('Mark payment as paid error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark payment as paid'
        });
    }
};
exports.markPaymentAsPaid = markPaymentAsPaid;
const getMonthlySalarySummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const currentYear = year ? parseInt(year) : new Date().getFullYear();
        const pendingPayments = await index_1.prisma.salaryPayment.findMany({
            where: {
                month: currentMonth,
                year: currentYear,
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
                },
                profile: true
            },
            orderBy: {
                user: {
                    firstName: 'asc'
                }
            }
        });
        const paidPayments = await index_1.prisma.salaryPayment.findMany({
            where: {
                month: currentMonth,
                year: currentYear,
                status: 'PAID'
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
                profile: true,
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                paidAt: 'desc'
            }
        });
        const totalPending = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalPaid = paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalEmployees = pendingPayments.length + paidPayments.length;
        res.json({
            success: true,
            data: {
                month: currentMonth,
                year: currentYear,
                summary: {
                    totalEmployees,
                    totalPending,
                    totalPaid,
                    totalAmount: totalPending + totalPaid
                },
                pendingPayments,
                paidPayments
            }
        });
    }
    catch (error) {
        console.error('Get monthly salary summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly salary summary'
        });
    }
};
exports.getMonthlySalarySummary = getMonthlySalarySummary;
const getSalaryPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await index_1.prisma.salaryPayment.findUnique({
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
                profile: true,
                paidByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Salary payment not found'
            });
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Get salary payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary payment'
        });
    }
};
exports.getSalaryPaymentById = getSalaryPaymentById;
const deleteSalaryPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const payment = await index_1.prisma.salaryPayment.findUnique({
            where: { id }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Salary payment not found'
            });
        }
        if (payment.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete paid salary payment'
            });
        }
        await index_1.prisma.salaryPayment.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: currentUser?.id || 'unknown',
            action: 'DELETE',
            entity: 'SALARY_PAYMENT',
            entityId: id,
            oldValues: payment,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Salary payment deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete salary payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete salary payment'
        });
    }
};
exports.deleteSalaryPayment = deleteSalaryPayment;
//# sourceMappingURL=improvedSalaryController.js.map