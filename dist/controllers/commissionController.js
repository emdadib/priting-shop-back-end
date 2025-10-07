"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCommissions = exports.getCommissionReport = exports.getCommissions = exports.deleteCommission = exports.updateCommission = exports.createCommission = exports.getCommissionById = exports.getAllCommissions = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllCommissions = async (req, res) => {
    res.json({ success: true, data: [] });
};
exports.getAllCommissions = getAllCommissions;
const getCommissionById = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.getCommissionById = getCommissionById;
const createCommission = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.createCommission = createCommission;
const updateCommission = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.updateCommission = updateCommission;
const deleteCommission = async (req, res) => {
    res.json({ success: true, message: 'Commission deleted' });
};
exports.deleteCommission = deleteCommission;
exports.getCommissions = exports.getAllCommissions;
const getCommissionReport = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        if (userId) {
            where.userId = userId;
        }
        const commissions = await prisma.commission.findMany({
            where,
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const totalAmount = commissions.reduce((sum, commission) => sum + Number(commission.amount), 0);
        const pendingAmount = commissions
            .filter(commission => commission.status === 'PENDING')
            .reduce((sum, commission) => sum + Number(commission.amount), 0);
        const paidAmount = commissions
            .filter(commission => commission.status === 'PAID')
            .reduce((sum, commission) => sum + Number(commission.amount), 0);
        res.json({
            success: true,
            data: {
                commissions,
                totalAmount,
                pendingAmount,
                paidAmount,
                commissionCount: commissions.length
            }
        });
    }
    catch (error) {
        console.error('Get commission report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate commission report'
        });
    }
};
exports.getCommissionReport = getCommissionReport;
const calculateCommissions = async (req, res) => {
    try {
        const { period, userId } = req.body;
        const startDate = new Date(period + '-01');
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'COMPLETED',
                ...(userId && { userId })
            },
            include: {
                items: true,
                user: true
            }
        });
        const commissions = [];
        for (const order of orders) {
            const commissionRate = 0.05;
            const commissionAmount = Number(order.total) * commissionRate;
            if (commissionAmount > 0) {
                const commission = await prisma.commission.create({
                    data: {
                        userId: order.userId,
                        orderId: order.id,
                        amount: commissionAmount,
                        rate: commissionRate,
                        period,
                        status: 'PENDING'
                    },
                    include: {
                        user: true
                    }
                });
                commissions.push(commission);
            }
        }
        res.json({
            success: true,
            data: {
                commissions,
                period,
                totalCommissions: commissions.length,
                totalAmount: commissions.reduce((sum, commission) => sum + Number(commission.amount), 0)
            }
        });
    }
    catch (error) {
        console.error('Calculate commissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate commissions'
        });
    }
};
exports.calculateCommissions = calculateCommissions;
//# sourceMappingURL=commissionController.js.map