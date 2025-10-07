"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgingReport = exports.getAccountingSummary = exports.addCompanyTransaction = exports.addSupplierTransaction = exports.addCustomerTransaction = exports.getCompanyLedger = exports.getSupplierLedger = exports.getCustomerLedger = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getCustomerLedger = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            customerId,
            isActive: true
        };
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma.customerTransaction.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });
        const total = await prisma.customerTransaction.count({ where });
        const balance = await prisma.customerTransaction.aggregate({
            where: {
                customerId,
                isActive: true
            },
            _sum: {
                amount: true
            }
        });
        return res.json({
            transactions,
            balance: Number(balance._sum.amount || 0),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching customer ledger:', error);
        return res.status(500).json({ error: 'Failed to fetch customer ledger' });
    }
};
exports.getCustomerLedger = getCustomerLedger;
const getSupplierLedger = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            supplierId,
            isActive: true
        };
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma.supplierTransaction.findMany({
            where,
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        company: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });
        const total = await prisma.supplierTransaction.count({ where });
        const balance = await prisma.supplierTransaction.aggregate({
            where: {
                supplierId,
                isActive: true
            },
            _sum: {
                amount: true
            }
        });
        return res.json({
            transactions,
            balance: Number(balance._sum.amount || 0),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching supplier ledger:', error);
        return res.status(500).json({ error: 'Failed to fetch supplier ledger' });
    }
};
exports.getSupplierLedger = getSupplierLedger;
const getCompanyLedger = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 50, accountType } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true
        };
        if (accountType) {
            where.accountType = accountType;
        }
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma.companyTransaction.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });
        const total = await prisma.companyTransaction.count({ where });
        const balance = await prisma.companyTransaction.aggregate({
            where: {
                isActive: true
            },
            _sum: {
                amount: true
            }
        });
        return res.json({
            transactions,
            balance: Number(balance._sum.amount || 0),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching company ledger:', error);
        return res.status(500).json({ error: 'Failed to fetch company ledger' });
    }
};
exports.getCompanyLedger = getCompanyLedger;
const addCustomerTransaction = async (req, res) => {
    try {
        const { customerId, type, amount, description, reference, referenceType, referenceId, date } = req.body;
        const transaction = await prisma.customerTransaction.create({
            data: {
                customerId,
                type,
                amount: parseFloat(amount),
                description,
                reference,
                referenceType,
                referenceId,
                date: date ? new Date(date) : new Date(),
                isActive: true
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        return res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Error adding customer transaction:', error);
        return res.status(500).json({ error: 'Failed to add customer transaction' });
    }
};
exports.addCustomerTransaction = addCustomerTransaction;
const addSupplierTransaction = async (req, res) => {
    try {
        const { supplierId, type, amount, description, reference, referenceType, referenceId, date } = req.body;
        const transaction = await prisma.supplierTransaction.create({
            data: {
                supplierId,
                type,
                amount: parseFloat(amount),
                description,
                reference,
                referenceType,
                referenceId,
                date: date ? new Date(date) : new Date(),
                isActive: true
            },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        company: true
                    }
                }
            }
        });
        return res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Error adding supplier transaction:', error);
        return res.status(500).json({ error: 'Failed to add supplier transaction' });
    }
};
exports.addSupplierTransaction = addSupplierTransaction;
const addCompanyTransaction = async (req, res) => {
    try {
        const { accountType, type, amount, description, reference, referenceType, referenceId, date } = req.body;
        const transaction = await prisma.companyTransaction.create({
            data: {
                accountType,
                type,
                amount: parseFloat(amount),
                description,
                reference,
                referenceType,
                referenceId,
                date: date ? new Date(date) : new Date(),
                isActive: true
            }
        });
        return res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Error adding company transaction:', error);
        return res.status(500).json({ error: 'Failed to add company transaction' });
    }
};
exports.addCompanyTransaction = addCompanyTransaction;
const getAccountingSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {
            isActive: true
        };
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const customerBalances = await prisma.customerTransaction.groupBy({
            by: ['customerId'],
            where,
            _sum: {
                amount: true
            }
        });
        const supplierBalances = await prisma.supplierTransaction.groupBy({
            by: ['supplierId'],
            where,
            _sum: {
                amount: true
            }
        });
        const companyBalances = await prisma.companyTransaction.groupBy({
            by: ['accountType'],
            where,
            _sum: {
                amount: true
            }
        });
        const totalReceivables = customerBalances.reduce((sum, balance) => {
            return sum + Number(balance._sum.amount || 0);
        }, 0);
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                status: {
                    in: ['RECEIVED', 'CONFIRMED', 'PARTIAL_RECEIVED']
                }
            },
            select: {
                dueAmount: true,
                paidAmount: true,
                total: true
            }
        });
        const totalPayables = purchaseOrders.reduce((sum, po) => {
            return sum + Number(po.dueAmount?.toString() || '0');
        }, 0);
        return res.json({
            customerBalances,
            supplierBalances,
            companyBalances,
            totalReceivables,
            totalPayables,
            netPosition: totalReceivables - totalPayables
        });
    }
    catch (error) {
        console.error('Error fetching accounting summary:', error);
        return res.status(500).json({ error: 'Failed to fetch accounting summary' });
    }
};
exports.getAccountingSummary = getAccountingSummary;
const getAgingReport = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const customerAging = await prisma.customerTransaction.groupBy({
            by: ['customerId'],
            where: {
                isActive: true,
                type: 'DEBIT'
            },
            _sum: {
                amount: true
            }
        });
        const supplierAging = await prisma.supplierTransaction.groupBy({
            by: ['supplierId'],
            where: {
                isActive: true,
                type: 'CREDIT'
            },
            _sum: {
                amount: true
            }
        });
        return res.json({
            customerAging,
            supplierAging,
            agingBuckets: {
                current: '0-30 days',
                thirtyDays: '31-60 days',
                sixtyDays: '61-90 days',
                overNinety: 'Over 90 days'
            }
        });
    }
    catch (error) {
        console.error('Error fetching aging report:', error);
        return res.status(500).json({ error: 'Failed to fetch aging report' });
    }
};
exports.getAgingReport = getAgingReport;
//# sourceMappingURL=accountingController.js.map