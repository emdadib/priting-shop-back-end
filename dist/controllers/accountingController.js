"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchaseOrderLedgerEntries = exports.cleanupOrphanedTransactions = exports.findOrphanedTransactions = exports.getProfitSummary = exports.calculateAndRecordProfit = exports.withdrawProfit = exports.ownerWithdrawal = exports.depositProfit = exports.deleteExpenseCategory = exports.updateExpenseCategory = exports.addExpenseCategory = exports.getExpenseCategories = exports.getExpenseSummary = exports.deleteExpense = exports.updateExpense = exports.addExpense = exports.getExpenses = exports.getAgingReport = exports.getAccountingSummary = exports.addCompanyTransaction = exports.addSupplierTransaction = exports.addCustomerTransaction = exports.getCompanyLedger = exports.getSupplierLedger = exports.getCustomerLedger = void 0;
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
        const allTransactions = await prisma.customerTransaction.findMany({
            where: {
                customerId,
                isActive: true
            },
            select: {
                type: true,
                amount: true
            }
        });
        let balance = 0;
        allTransactions.forEach(transaction => {
            const amount = Number(transaction.amount);
            const transactionType = transaction.type;
            if (transactionType === 'DEBIT') {
                balance += amount;
            }
            else if (transactionType === 'CREDIT') {
                balance -= amount;
            }
        });
        return res.json({
            transactions,
            balance: balance,
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
        const allTransactions = await prisma.supplierTransaction.findMany({
            where: {
                supplierId,
                isActive: true
            },
            select: {
                type: true,
                amount: true
            }
        });
        let balance = 0;
        allTransactions.forEach(transaction => {
            const amount = Number(transaction.amount);
            const transactionType = transaction.type;
            if (transactionType === 'CREDIT') {
                balance += amount;
            }
            else if (transactionType === 'DEBIT') {
                balance -= amount;
            }
        });
        return res.json({
            transactions,
            balance: balance,
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
        const { startDate, endDate, page = 1, limit = 50, accountType, transactionType } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true
        };
        if (accountType) {
            where.accountType = accountType;
        }
        if (transactionType) {
            where.type = transactionType;
        }
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma.companyTransaction.findMany({
            where,
            orderBy: {
                date: 'desc'
            },
            skip,
            take: Number(limit)
        });
        const total = await prisma.companyTransaction.count({ where });
        const balanceWhere = {
            isActive: true
        };
        if (accountType) {
            balanceWhere.accountType = accountType;
        }
        const allTransactions = await prisma.companyTransaction.findMany({
            where: balanceWhere,
            select: {
                accountType: true,
                type: true,
                amount: true
            }
        });
        if (accountType) {
            let balance = 0;
            allTransactions.forEach(transaction => {
                const amount = Number(transaction.amount);
                const transactionAccountType = transaction.accountType;
                const transactionType = transaction.type;
                if (transactionAccountType === 'CASH' || transactionAccountType === 'BANK') {
                    if (transactionType === 'DEBIT') {
                        balance += amount;
                    }
                    else {
                        balance -= amount;
                    }
                }
                else if (transactionAccountType === 'EQUITY') {
                    if (transactionType === 'CREDIT') {
                        balance += amount;
                    }
                    else {
                        balance -= amount;
                    }
                }
                else if (transactionAccountType === 'SALES') {
                    if (transactionType === 'CREDIT') {
                        balance += amount;
                    }
                    else {
                        balance -= amount;
                    }
                }
                else if (transactionAccountType === 'EXPENSES' || transactionAccountType === 'PURCHASES') {
                    if (transactionType === 'DEBIT') {
                        balance += amount;
                    }
                    else {
                        balance -= amount;
                    }
                }
                else {
                    if (transactionType === 'DEBIT') {
                        balance += amount;
                    }
                    else {
                        balance -= amount;
                    }
                }
            });
            return res.json({
                transactions,
                balance: balance,
                accountType: accountType,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        }
        const balancesByAccountType = {
            CASH: 0,
            BANK: 0,
            EQUITY: 0,
            SALES: 0,
            EXPENSES: 0,
            PURCHASES: 0
        };
        allTransactions.forEach(transaction => {
            const amount = Number(transaction.amount);
            const transactionAccountType = transaction.accountType;
            const transactionType = transaction.type;
            if (!balancesByAccountType.hasOwnProperty(transactionAccountType)) {
                balancesByAccountType[transactionAccountType] = 0;
            }
            const currentBalance = balancesByAccountType[transactionAccountType] ?? 0;
            if (transactionAccountType === 'CASH' || transactionAccountType === 'BANK') {
                if (transactionType === 'DEBIT') {
                    balancesByAccountType[transactionAccountType] = currentBalance + amount;
                }
                else {
                    balancesByAccountType[transactionAccountType] = currentBalance - amount;
                }
            }
            else if (transactionAccountType === 'EQUITY') {
                if (transactionType === 'CREDIT') {
                    balancesByAccountType[transactionAccountType] = currentBalance + amount;
                }
                else {
                    balancesByAccountType[transactionAccountType] = currentBalance - amount;
                }
            }
            else if (transactionAccountType === 'SALES') {
                if (transactionType === 'CREDIT') {
                    balancesByAccountType[transactionAccountType] = currentBalance + amount;
                }
                else {
                    balancesByAccountType[transactionAccountType] = currentBalance - amount;
                }
            }
            else if (transactionAccountType === 'EXPENSES' || transactionAccountType === 'PURCHASES') {
                if (transactionType === 'DEBIT') {
                    balancesByAccountType[transactionAccountType] = currentBalance + amount;
                }
                else {
                    balancesByAccountType[transactionAccountType] = currentBalance - amount;
                }
            }
            else {
                if (transactionType === 'DEBIT') {
                    balancesByAccountType[transactionAccountType] = currentBalance + amount;
                }
                else {
                    balancesByAccountType[transactionAccountType] = currentBalance - amount;
                }
            }
        });
        const netAssets = (balancesByAccountType.CASH ?? 0) + (balancesByAccountType.BANK ?? 0);
        return res.json({
            transactions,
            balance: netAssets,
            balancesByAccountType: balancesByAccountType,
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
        const allCustomerTransactions = await prisma.customerTransaction.findMany({
            where,
            select: {
                customerId: true,
                type: true,
                amount: true
            }
        });
        const customerBalancesMap = new Map();
        allCustomerTransactions.forEach(transaction => {
            const customerId = transaction.customerId;
            const currentBalance = customerBalancesMap.get(customerId) || 0;
            const amount = Number(transaction.amount);
            if (transaction.type === 'DEBIT') {
                customerBalancesMap.set(customerId, currentBalance + amount);
            }
            else if (transaction.type === 'CREDIT') {
                customerBalancesMap.set(customerId, currentBalance - amount);
            }
        });
        const customerBalances = Array.from(customerBalancesMap.entries()).map(([customerId, balance]) => ({
            customerId,
            balance
        }));
        const allSupplierTransactions = await prisma.supplierTransaction.findMany({
            where,
            select: {
                supplierId: true,
                type: true,
                amount: true
            }
        });
        const supplierBalancesMap = new Map();
        allSupplierTransactions.forEach(transaction => {
            const supplierId = transaction.supplierId;
            const currentBalance = supplierBalancesMap.get(supplierId) || 0;
            const amount = Number(transaction.amount);
            if (transaction.type === 'CREDIT') {
                supplierBalancesMap.set(supplierId, currentBalance + amount);
            }
            else if (transaction.type === 'DEBIT') {
                supplierBalancesMap.set(supplierId, currentBalance - amount);
            }
        });
        const supplierBalances = Array.from(supplierBalancesMap.entries()).map(([supplierId, balance]) => ({
            supplierId,
            balance
        }));
        const companyBalances = await prisma.companyTransaction.groupBy({
            by: ['accountType'],
            where,
            _sum: {
                amount: true
            }
        });
        const totalReceivables = customerBalances.reduce((sum, balance) => {
            return sum + (balance.balance > 0 ? balance.balance : 0);
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
const getExpenses = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 50, categoryId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true,
            accountType: 'EXPENSES'
        };
        if (categoryId) {
            where.expenseCategoryId = categoryId;
        }
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const transactions = await prisma.companyTransaction.findMany({
            where,
            include: {
                expenseCategory: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            },
            skip,
            take: Number(limit)
        });
        const total = await prisma.companyTransaction.count({ where });
        return res.json({
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};
exports.getExpenses = getExpenses;
const addExpense = async (req, res) => {
    try {
        const { accountType, type, amount, description, reference, expenseCategoryId, date, paymentMethod = 'CASH' } = req.body;
        const expenseAmount = parseFloat(amount);
        const transactionDate = date ? new Date(date) : new Date();
        const expenseReference = reference || `EXPENSE-${Date.now()}`;
        const expenseDescription = description || 'Expense';
        const result = await prisma.$transaction(async (tx) => {
            const expenseTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: 'EXPENSES',
                    type: 'DEBIT',
                    amount: expenseAmount,
                    description: expenseDescription,
                    reference: expenseReference,
                    expenseCategoryId: expenseCategoryId || null,
                    date: transactionDate,
                    isActive: true
                },
                include: {
                    expenseCategory: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    }
                }
            });
            const cashAccountType = (paymentMethod === 'BANK' ? 'BANK' : 'CASH');
            await tx.companyTransaction.create({
                data: {
                    accountType: cashAccountType,
                    type: 'CREDIT',
                    amount: expenseAmount,
                    description: `${expenseDescription} - Payment`,
                    reference: expenseReference,
                    referenceType: 'ADJUSTMENT',
                    referenceId: expenseTransaction.id,
                    date: transactionDate,
                    isActive: true
                }
            });
            return expenseTransaction;
        });
        return res.status(201).json(result);
    }
    catch (error) {
        console.error('Error adding expense:', error);
        return res.status(500).json({ error: 'Failed to add expense' });
    }
};
exports.addExpense = addExpense;
const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { accountType, type, amount, description, reference, expenseCategoryId, date, paymentMethod = 'CASH' } = req.body;
        const expenseAmount = parseFloat(amount);
        const transactionDate = date ? new Date(date) : new Date();
        const expenseDescription = description || 'Expense';
        const result = await prisma.$transaction(async (tx) => {
            const expenseTransaction = await tx.companyTransaction.update({
                where: { id },
                data: {
                    accountType: 'EXPENSES',
                    type: 'DEBIT',
                    amount: expenseAmount,
                    description: expenseDescription,
                    reference,
                    expenseCategoryId: expenseCategoryId || null,
                    date: transactionDate
                },
                include: {
                    expenseCategory: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    }
                }
            });
            const cashAccountType = (paymentMethod === 'BANK' ? 'BANK' : 'CASH');
            const relatedCashTransaction = await tx.companyTransaction.findFirst({
                where: {
                    referenceId: id,
                    referenceType: 'ADJUSTMENT',
                    accountType: { in: ['CASH', 'BANK'] }
                }
            });
            if (relatedCashTransaction) {
                await tx.companyTransaction.update({
                    where: { id: relatedCashTransaction.id },
                    data: {
                        accountType: cashAccountType,
                        amount: expenseAmount,
                        description: `${expenseDescription} - Payment`,
                        date: transactionDate
                    }
                });
            }
            else {
                await tx.companyTransaction.create({
                    data: {
                        accountType: cashAccountType,
                        type: 'CREDIT',
                        amount: expenseAmount,
                        description: `${expenseDescription} - Payment`,
                        reference: reference || expenseTransaction.reference,
                        referenceType: 'ADJUSTMENT',
                        referenceId: id,
                        date: transactionDate,
                        isActive: true
                    }
                });
            }
            return expenseTransaction;
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Error updating expense:', error);
        return res.status(500).json({ error: 'Failed to update expense' });
    }
};
exports.updateExpense = updateExpense;
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.$transaction(async (tx) => {
            await tx.companyTransaction.update({
                where: { id },
                data: { isActive: false }
            });
            const relatedCashTransaction = await tx.companyTransaction.findFirst({
                where: {
                    referenceId: id,
                    referenceType: 'ADJUSTMENT',
                    accountType: { in: ['CASH', 'BANK'] }
                }
            });
            if (relatedCashTransaction) {
                await tx.companyTransaction.update({
                    where: { id: relatedCashTransaction.id },
                    data: { isActive: false }
                });
            }
        });
        return res.json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        return res.status(500).json({ error: 'Failed to delete expense' });
    }
};
exports.deleteExpense = deleteExpense;
const getExpenseSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {
            isActive: true,
            accountType: 'EXPENSES'
        };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const totalExpenses = await prisma.companyTransaction.aggregate({
            where: {
                ...where,
                type: 'DEBIT'
            },
            _sum: {
                amount: true
            }
        });
        const currentMonth = new Date();
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const monthlyExpenses = await prisma.companyTransaction.aggregate({
            where: {
                ...where,
                type: 'DEBIT',
                date: {
                    gte: monthStart,
                    lte: monthEnd
                }
            },
            _sum: {
                amount: true
            }
        });
        const categoryBreakdown = await prisma.companyTransaction.groupBy({
            by: ['expenseCategoryId'],
            where: {
                ...where,
                type: 'DEBIT'
            },
            _sum: {
                amount: true
            }
        });
        const categories = await prisma.expenseCategory.findMany({
            select: {
                id: true,
                name: true
            }
        });
        const categoryBreakdownWithNames = categoryBreakdown.map(item => {
            const category = categories.find(c => c.id === item.expenseCategoryId);
            const amount = Number(item._sum.amount || 0);
            const total = Number(totalExpenses._sum.amount || 0);
            return {
                category: category?.name || 'Uncategorized',
                amount,
                percentage: total > 0 ? Math.round((amount / total) * 100) : 0
            };
        });
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const monthExpenses = await prisma.companyTransaction.aggregate({
                where: {
                    ...where,
                    type: 'DEBIT',
                    date: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                },
                _sum: {
                    amount: true
                }
            });
            monthlyTrend.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                amount: Number(monthExpenses._sum.amount || 0)
            });
        }
        const topExpenses = await prisma.companyTransaction.findMany({
            where: {
                ...where,
                type: 'DEBIT'
            },
            include: {
                expenseCategory: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                amount: 'desc'
            },
            take: 5
        });
        const topExpensesFormatted = topExpenses.map(expense => ({
            description: expense.description,
            amount: Number(expense.amount),
            category: expense.expenseCategory?.name || 'Uncategorized',
            date: expense.date.toISOString().split('T')[0]
        }));
        return res.json({
            totalExpenses: Number(totalExpenses._sum.amount || 0),
            monthlyExpenses: Number(monthlyExpenses._sum.amount || 0),
            categoryBreakdown: categoryBreakdownWithNames,
            monthlyTrend,
            topExpenses: topExpensesFormatted
        });
    }
    catch (error) {
        console.error('Error fetching expense summary:', error);
        return res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
};
exports.getExpenseSummary = getExpenseSummary;
const getExpenseCategories = async (req, res) => {
    try {
        const categories = await prisma.expenseCategory.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        return res.json(categories);
    }
    catch (error) {
        console.error('Error fetching expense categories:', error);
        return res.status(500).json({ error: 'Failed to fetch expense categories' });
    }
};
exports.getExpenseCategories = getExpenseCategories;
const addExpenseCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.expenseCategory.create({
            data: {
                name,
                description,
                isActive: true
            }
        });
        return res.status(201).json(category);
    }
    catch (error) {
        console.error('Error adding expense category:', error);
        return res.status(500).json({ error: 'Failed to add expense category' });
    }
};
exports.addExpenseCategory = addExpenseCategory;
const updateExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const category = await prisma.expenseCategory.update({
            where: { id },
            data: {
                name,
                description
            }
        });
        return res.json(category);
    }
    catch (error) {
        console.error('Error updating expense category:', error);
        return res.status(500).json({ error: 'Failed to update expense category' });
    }
};
exports.updateExpenseCategory = updateExpenseCategory;
const deleteExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.expenseCategory.update({
            where: { id },
            data: { isActive: false }
        });
        return res.json({ message: 'Expense category deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting expense category:', error);
        return res.status(500).json({ error: 'Failed to delete expense category' });
    }
};
exports.deleteExpenseCategory = deleteExpenseCategory;
const depositProfit = async (req, res) => {
    try {
        const { amount, accountType, description, reference, date, profitType = 'PROFIT' } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        if (!accountType || (accountType !== 'CASH' && accountType !== 'BANK')) {
            return res.status(400).json({ error: 'Account type must be CASH or BANK' });
        }
        const transactionDate = date ? new Date(date) : new Date();
        const profitDescription = description || `${profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit'} Deposit`;
        const transactionReference = reference || `PROFIT-${Date.now()}`;
        const result = await prisma.$transaction(async (tx) => {
            const cashTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: accountType,
                    type: 'DEBIT',
                    amount: parseFloat(amount),
                    description: `${profitDescription} - Cash Deposit`,
                    reference: transactionReference,
                    referenceType: 'ADJUSTMENT',
                    date: transactionDate,
                    isActive: true
                }
            });
            const equityTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: 'EQUITY',
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    description: `${profitDescription} - Equity Increase`,
                    reference: transactionReference,
                    referenceType: 'ADJUSTMENT',
                    referenceId: cashTransaction.id,
                    date: transactionDate,
                    isActive: true
                }
            });
            return {
                cashTransaction,
                equityTransaction
            };
        });
        return res.status(201).json({
            success: true,
            message: 'Profit deposited successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error depositing profit:', error);
        return res.status(500).json({ error: 'Failed to deposit profit' });
    }
};
exports.depositProfit = depositProfit;
const ownerWithdrawal = async (req, res) => {
    try {
        const { amount, accountType = 'CASH', description, reference, date } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        if (accountType !== 'CASH' && accountType !== 'BANK') {
            return res.status(400).json({ error: 'Account type must be CASH or BANK' });
        }
        const transactionDate = date ? new Date(date) : new Date();
        const withdrawalDescription = description || `Owner Withdrawal`;
        const transactionReference = reference || `OWNER-WITHDRAW-${Date.now()}`;
        const result = await prisma.$transaction(async (tx) => {
            const cashTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: accountType,
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    description: withdrawalDescription,
                    reference: transactionReference,
                    referenceType: 'ADJUSTMENT',
                    date: transactionDate,
                    isActive: true
                }
            });
            return {
                cashTransaction
            };
        });
        return res.status(201).json({
            success: true,
            message: 'Owner withdrawal recorded successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error recording owner withdrawal:', error);
        return res.status(500).json({ error: 'Failed to record owner withdrawal' });
    }
};
exports.ownerWithdrawal = ownerWithdrawal;
const withdrawProfit = async (req, res) => {
    try {
        const { amount, accountType, description, reference, date, profitType = 'PROFIT' } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        if (!accountType || (accountType !== 'CASH' && accountType !== 'BANK')) {
            return res.status(400).json({ error: 'Account type must be CASH or BANK' });
        }
        const equityTransactions = await prisma.companyTransaction.findMany({
            where: {
                isActive: true,
                accountType: 'EQUITY'
            }
        });
        const equityBalance = equityTransactions.reduce((balance, transaction) => {
            const amount = Number(transaction.amount);
            if (transaction.type === 'CREDIT') {
                return balance + amount;
            }
            else {
                return balance - amount;
            }
        }, 0);
        const withdrawalAmount = parseFloat(amount);
        if (withdrawalAmount > equityBalance) {
            return res.status(400).json({
                error: `Insufficient equity balance. Available: ${equityBalance.toFixed(2)}, Requested: ${withdrawalAmount.toFixed(2)}`
            });
        }
        const transactionDate = date ? new Date(date) : new Date();
        const profitDescription = description || `${profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit'} Withdrawal`;
        const transactionReference = reference || `WITHDRAW-${Date.now()}`;
        const result = await prisma.$transaction(async (tx) => {
            const cashTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: accountType,
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    description: `${profitDescription} - Cash Withdrawal`,
                    reference: transactionReference,
                    referenceType: 'ADJUSTMENT',
                    date: transactionDate,
                    isActive: true
                }
            });
            const equityTransaction = await tx.companyTransaction.create({
                data: {
                    accountType: 'EQUITY',
                    type: 'DEBIT',
                    amount: parseFloat(amount),
                    description: `${profitDescription} - Equity Decrease`,
                    reference: transactionReference,
                    referenceType: 'ADJUSTMENT',
                    referenceId: cashTransaction.id,
                    date: transactionDate,
                    isActive: true
                }
            });
            return {
                cashTransaction,
                equityTransaction
            };
        });
        return res.status(201).json({
            success: true,
            message: 'Profit withdrawn successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error withdrawing profit:', error);
        return res.status(500).json({ error: 'Failed to withdraw profit' });
    }
};
exports.withdrawProfit = withdrawProfit;
const calculateAndRecordProfit = async (req, res) => {
    try {
        const { startDate, endDate, description } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        const periodStart = new Date(startDate);
        const periodEnd = new Date(endDate);
        periodEnd.setHours(23, 59, 59, 999);
        const salesTransactions = await prisma.companyTransaction.findMany({
            where: {
                accountType: 'SALES',
                type: 'CREDIT',
                isActive: true,
                date: {
                    gte: periodStart,
                    lte: periodEnd
                }
            },
            select: {
                id: true,
                amount: true,
                date: true,
                referenceId: true,
                reference: true,
                referenceType: true
            }
        });
        const totalRevenue = salesTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const orderIdsFromSales = salesTransactions
            .filter(t => t.referenceType === 'ORDER' && t.referenceId)
            .map(t => t.referenceId)
            .filter((id) => id !== null);
        const ordersWithRevenue = orderIdsFromSales.length > 0
            ? await prisma.order.findMany({
                where: {
                    id: { in: orderIdsFromSales },
                    status: 'COMPLETED'
                },
                include: {
                    items: {
                        select: {
                            id: true,
                            quantity: true,
                            costPrice: true
                        }
                    }
                }
            })
            : [];
        let totalCOGS = 0;
        ordersWithRevenue.forEach(order => {
            if (order.items) {
                order.items.forEach((item) => {
                    const itemCost = Number(item.costPrice) * Number(item.quantity);
                    totalCOGS += itemCost;
                });
            }
        });
        const expenseTransactions = await prisma.companyTransaction.findMany({
            where: {
                accountType: 'EXPENSES',
                type: 'DEBIT',
                isActive: true,
                date: {
                    gte: periodStart,
                    lte: periodEnd
                }
            }
        });
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const netProfit = totalRevenue - totalCOGS - totalExpenses;
        if (netProfit !== 0) {
            const profitDescription = description || `Period Profit/Loss ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`;
            const transactionReference = `PROFIT-CALC-${Date.now()}`;
            const transactionDate = new Date();
            await prisma.$transaction(async (tx) => {
                if (netProfit > 0) {
                    await tx.companyTransaction.create({
                        data: {
                            accountType: 'SALES',
                            type: 'DEBIT',
                            amount: totalRevenue,
                            description: `${profitDescription} - Close Sales Revenue`,
                            reference: transactionReference,
                            referenceType: 'ADJUSTMENT',
                            date: transactionDate,
                            isActive: true
                        }
                    });
                    if (totalCOGS > 0) {
                        await tx.companyTransaction.create({
                            data: {
                                accountType: 'EXPENSES',
                                type: 'DEBIT',
                                amount: totalCOGS,
                                description: `${profitDescription} - Cost of Goods Sold`,
                                reference: transactionReference,
                                referenceType: 'ADJUSTMENT',
                                date: transactionDate,
                                isActive: true
                            }
                        });
                    }
                    await tx.companyTransaction.create({
                        data: {
                            accountType: 'EQUITY',
                            type: 'CREDIT',
                            amount: netProfit,
                            description: `${profitDescription} - Net Profit`,
                            reference: transactionReference,
                            referenceType: 'ADJUSTMENT',
                            date: transactionDate,
                            isActive: true
                        }
                    });
                }
                else {
                    await tx.companyTransaction.create({
                        data: {
                            accountType: 'SALES',
                            type: 'DEBIT',
                            amount: totalRevenue,
                            description: `${profitDescription} - Close Sales Revenue`,
                            reference: transactionReference,
                            referenceType: 'ADJUSTMENT',
                            date: transactionDate,
                            isActive: true
                        }
                    });
                    if (totalCOGS > 0) {
                        await tx.companyTransaction.create({
                            data: {
                                accountType: 'EXPENSES',
                                type: 'DEBIT',
                                amount: totalCOGS,
                                description: `${profitDescription} - Cost of Goods Sold`,
                                reference: transactionReference,
                                referenceType: 'ADJUSTMENT',
                                date: transactionDate,
                                isActive: true
                            }
                        });
                    }
                    await tx.companyTransaction.create({
                        data: {
                            accountType: 'EQUITY',
                            type: 'DEBIT',
                            amount: Math.abs(netProfit),
                            description: `${profitDescription} - Net Loss`,
                            reference: transactionReference,
                            referenceType: 'ADJUSTMENT',
                            date: transactionDate,
                            isActive: true
                        }
                    });
                }
            });
            return res.json({
                success: true,
                message: 'Profit calculated and recorded successfully',
                data: {
                    period: {
                        startDate: periodStart,
                        endDate: periodEnd
                    },
                    calculation: {
                        totalRevenue,
                        totalCOGS,
                        totalExpenses,
                        netProfit
                    },
                    recorded: true
                }
            });
        }
        else {
            return res.json({
                success: true,
                message: 'No profit or loss for this period',
                data: {
                    period: {
                        startDate: periodStart,
                        endDate: periodEnd
                    },
                    calculation: {
                        totalRevenue,
                        totalCOGS,
                        totalExpenses,
                        netProfit
                    },
                    recorded: false
                }
            });
        }
    }
    catch (error) {
        console.error('Error calculating profit:', error);
        return res.status(500).json({ error: 'Failed to calculate and record profit' });
    }
};
exports.calculateAndRecordProfit = calculateAndRecordProfit;
const getProfitSummary = async (req, res) => {
    try {
        const { startDate, endDate, profitType } = req.query;
        const where = {
            isActive: true,
            accountType: 'EQUITY'
        };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        if (profitType) {
            const profitTypeStr = profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit';
            where.description = {
                contains: profitTypeStr
            };
        }
        const equityTransactions = await prisma.companyTransaction.findMany({
            where,
            orderBy: {
                date: 'desc'
            }
        });
        const profitLossTransactions = equityTransactions.filter(t => (t.description?.toLowerCase().includes('net profit') ?? false) ||
            (t.description?.toLowerCase().includes('net loss') ?? false) ||
            t.reference?.startsWith('PROFIT-CALC-'));
        const operationalProfit = profitLossTransactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const operationalLoss = profitLossTransactions
            .filter(t => t.type === 'DEBIT')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const netOperationalProfit = operationalProfit - operationalLoss;
        const manualTransactions = equityTransactions.filter(t => !(t.description?.toLowerCase().includes('net profit') ?? false) &&
            !(t.description?.toLowerCase().includes('net loss') ?? false) &&
            !t.reference?.startsWith('PROFIT-CALC-'));
        const deposits = manualTransactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const withdrawals = manualTransactions
            .filter(t => t.type === 'DEBIT')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const netProfit = netOperationalProfit + deposits - withdrawals;
        const investorDeposits = manualTransactions
            .filter(t => t.type === 'CREDIT' && (t.description?.toLowerCase().includes('investor') ?? false))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const investorWithdrawals = manualTransactions
            .filter(t => t.type === 'DEBIT' && (t.description?.toLowerCase().includes('investor') ?? false))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const regularDeposits = manualTransactions
            .filter(t => t.type === 'CREDIT' && !(t.description?.toLowerCase().includes('investor') ?? false))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const regularWithdrawals = manualTransactions
            .filter(t => t.type === 'DEBIT' && !(t.description?.toLowerCase().includes('investor') ?? false))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return res.json({
            total: {
                deposits,
                withdrawals,
                netProfit,
                operationalProfit,
                operationalLoss,
                netOperationalProfit
            },
            regular: {
                deposits: regularDeposits,
                withdrawals: regularWithdrawals,
                netProfit: regularDeposits - regularWithdrawals
            },
            investor: {
                deposits: investorDeposits,
                withdrawals: investorWithdrawals,
                netProfit: investorDeposits - investorWithdrawals
            },
            operational: {
                profit: operationalProfit,
                loss: operationalLoss,
                net: netOperationalProfit
            },
            transactions: equityTransactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                date: t.date,
                reference: t.reference
            }))
        });
    }
    catch (error) {
        console.error('Error fetching profit summary:', error);
        return res.status(500).json({ error: 'Failed to fetch profit summary' });
    }
};
exports.getProfitSummary = getProfitSummary;
const findOrphanedTransactions = async (req, res) => {
    try {
        const orderTransactions = await prisma.companyTransaction.findMany({
            where: {
                referenceType: 'ORDER',
                isActive: true
            },
            select: {
                id: true,
                accountType: true,
                type: true,
                amount: true,
                description: true,
                reference: true,
                referenceId: true,
                date: true,
                createdAt: true
            }
        });
        const customerOrderTransactions = await prisma.customerTransaction.findMany({
            where: {
                referenceType: 'ORDER',
                isActive: true
            },
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                referenceId: true,
                date: true,
                createdAt: true
            }
        });
        const existingOrders = await prisma.order.findMany({
            select: { id: true }
        });
        const existingOrderIds = new Set(existingOrders.map(o => o.id));
        const orphanedCompanyTransactions = orderTransactions.filter(t => t.referenceId && !existingOrderIds.has(t.referenceId));
        const orphanedCustomerTransactions = customerOrderTransactions.filter(t => t.referenceId && !existingOrderIds.has(t.referenceId));
        return res.json({
            orphanedCompanyTransactions: orphanedCompanyTransactions.map(t => ({
                id: t.id,
                accountType: t.accountType,
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                reference: t.reference,
                referenceId: t.referenceId,
                date: t.date,
                createdAt: t.createdAt
            })),
            orphanedCustomerTransactions: orphanedCustomerTransactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                referenceId: t.referenceId,
                date: t.date,
                createdAt: t.createdAt
            })),
            totalOrphaned: orphanedCompanyTransactions.length + orphanedCustomerTransactions.length
        });
    }
    catch (error) {
        console.error('Error finding orphaned transactions:', error);
        return res.status(500).json({ error: 'Failed to find orphaned transactions' });
    }
};
exports.findOrphanedTransactions = findOrphanedTransactions;
const cleanupOrphanedTransactions = async (req, res) => {
    try {
        const existingOrders = await prisma.order.findMany({
            select: { id: true }
        });
        const existingOrderIds = new Set(existingOrders.map(o => o.id));
        const orphanedCompanyTransactions = await prisma.companyTransaction.findMany({
            where: {
                referenceType: 'ORDER',
                isActive: true
            },
            select: { id: true, referenceId: true }
        });
        const orphanedCompanyIds = orphanedCompanyTransactions
            .filter(t => t.referenceId && !existingOrderIds.has(t.referenceId))
            .map(t => t.id);
        if (orphanedCompanyIds.length > 0) {
            await prisma.companyTransaction.updateMany({
                where: {
                    id: { in: orphanedCompanyIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        const orphanedCustomerTransactions = await prisma.customerTransaction.findMany({
            where: {
                referenceType: 'ORDER',
                isActive: true
            },
            select: { id: true, referenceId: true }
        });
        const orphanedCustomerIds = orphanedCustomerTransactions
            .filter(t => t.referenceId && !existingOrderIds.has(t.referenceId))
            .map(t => t.id);
        if (orphanedCustomerIds.length > 0) {
            await prisma.customerTransaction.updateMany({
                where: {
                    id: { in: orphanedCustomerIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        const existingPayments = await prisma.payment.findMany({
            select: { id: true }
        });
        const existingPaymentIds = new Set(existingPayments.map(p => p.id));
        const orphanedPaymentCompanyTransactions = await prisma.companyTransaction.findMany({
            where: {
                referenceType: 'PAYMENT',
                isActive: true
            },
            select: { id: true, referenceId: true }
        });
        const orphanedPaymentCompanyIds = orphanedPaymentCompanyTransactions
            .filter(t => t.referenceId && !existingPaymentIds.has(t.referenceId))
            .map(t => t.id);
        if (orphanedPaymentCompanyIds.length > 0) {
            await prisma.companyTransaction.updateMany({
                where: {
                    id: { in: orphanedPaymentCompanyIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        const orphanedPaymentCustomerTransactions = await prisma.customerTransaction.findMany({
            where: {
                referenceType: 'PAYMENT',
                isActive: true
            },
            select: { id: true, referenceId: true }
        });
        const orphanedPaymentCustomerIds = orphanedPaymentCustomerTransactions
            .filter(t => t.referenceId && !existingPaymentIds.has(t.referenceId))
            .map(t => t.id);
        if (orphanedPaymentCustomerIds.length > 0) {
            await prisma.customerTransaction.updateMany({
                where: {
                    id: { in: orphanedPaymentCustomerIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        return res.json({
            success: true,
            message: 'Orphaned transactions cleaned up successfully',
            cleanedCompanyTransactions: orphanedCompanyIds.length,
            cleanedCustomerTransactions: orphanedCustomerIds.length,
            cleanedPaymentCompanyTransactions: orphanedPaymentCompanyIds.length,
            cleanedPaymentCustomerTransactions: orphanedPaymentCustomerIds.length,
            totalCleaned: orphanedCompanyIds.length + orphanedCustomerIds.length + orphanedPaymentCompanyIds.length + orphanedPaymentCustomerIds.length
        });
    }
    catch (error) {
        console.error('Error cleaning up orphaned transactions:', error);
        return res.status(500).json({ error: 'Failed to clean up orphaned transactions' });
    }
};
exports.cleanupOrphanedTransactions = cleanupOrphanedTransactions;
const deletePurchaseOrderLedgerEntries = async (req, res) => {
    try {
        const purchaseOrderTransactions = await prisma.companyTransaction.findMany({
            where: {
                referenceType: 'PURCHASE_ORDER',
                isActive: true
            },
            select: {
                id: true,
                accountType: true,
                type: true,
                amount: true,
                description: true,
                reference: true,
                referenceId: true
            }
        });
        const transactionIds = purchaseOrderTransactions.map(t => t.id);
        if (transactionIds.length === 0) {
            return res.json({
                success: true,
                message: 'No purchase order ledger entries found to delete',
                deletedCount: 0
            });
        }
        await prisma.companyTransaction.updateMany({
            where: {
                id: { in: transactionIds }
            },
            data: {
                isActive: false
            }
        });
        const supplierTransactions = await prisma.supplierTransaction.findMany({
            where: {
                referenceType: 'PURCHASE_ORDER',
                isActive: true
            },
            select: {
                id: true
            }
        });
        const supplierTransactionIds = supplierTransactions.map(t => t.id);
        if (supplierTransactionIds.length > 0) {
            await prisma.supplierTransaction.updateMany({
                where: {
                    id: { in: supplierTransactionIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        console.log('Purchase order ledger entries deleted:', {
            companyTransactions: transactionIds.length,
            supplierTransactions: supplierTransactionIds.length,
            total: transactionIds.length + supplierTransactionIds.length
        });
        return res.json({
            success: true,
            message: 'Purchase order ledger entries deleted successfully',
            deletedCompanyTransactions: transactionIds.length,
            deletedSupplierTransactions: supplierTransactionIds.length,
            totalDeleted: transactionIds.length + supplierTransactionIds.length,
            details: {
                companyTransactions: purchaseOrderTransactions.map(t => ({
                    accountType: t.accountType,
                    type: t.type,
                    amount: t.amount.toString(),
                    description: t.description,
                    reference: t.reference
                }))
            }
        });
    }
    catch (error) {
        console.error('Error deleting purchase order ledger entries:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete purchase order ledger entries'
        });
    }
};
exports.deletePurchaseOrderLedgerEntries = deletePurchaseOrderLedgerEntries;
//# sourceMappingURL=accountingController.js.map