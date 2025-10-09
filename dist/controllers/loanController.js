"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoanSummary = exports.getLoanPayments = exports.addLoanPayment = exports.deleteLoan = exports.updateLoan = exports.createLoan = exports.getLoan = exports.getLoans = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getLoans = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { isActive: true };
        if (status) {
            where.status = status;
        }
        const loans = await prisma.loan.findMany({
            where,
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 1
                },
                _count: {
                    select: { payments: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        });
        const total = await prisma.loan.count({ where });
        const loansWithSummary = loans.map(loan => {
            const totalPaid = loan.payments.reduce((sum, payment) => sum + Number(payment.totalAmount), 0);
            const remainingBalance = Number(loan.principalAmount) - totalPaid;
            const nextPaymentDate = calculateNextPaymentDate(loan);
            const isOverdue = nextPaymentDate && new Date() > nextPaymentDate;
            return {
                ...loan,
                totalPaid,
                remainingBalance,
                nextPaymentDate,
                isOverdue,
                paymentProgress: (totalPaid / Number(loan.principalAmount)) * 100
            };
        });
        return res.json({
            loans: loansWithSummary,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching loans:', error);
        return res.status(500).json({ error: 'Failed to fetch loans' });
    }
};
exports.getLoans = getLoans;
const getLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await prisma.loan.findUnique({
            where: { id },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        const totalPaid = loan.payments.reduce((sum, payment) => sum + Number(payment.totalAmount), 0);
        const remainingBalance = Number(loan.principalAmount) - totalPaid;
        const nextPaymentDate = calculateNextPaymentDate(loan);
        const isOverdue = nextPaymentDate && new Date() > nextPaymentDate;
        return res.json({
            ...loan,
            totalPaid,
            remainingBalance,
            nextPaymentDate,
            isOverdue,
            paymentProgress: (totalPaid / Number(loan.principalAmount)) * 100
        });
    }
    catch (error) {
        console.error('Error fetching loan:', error);
        return res.status(500).json({ error: 'Failed to fetch loan' });
    }
};
exports.getLoan = getLoan;
const createLoan = async (req, res) => {
    try {
        const { loanNumber, lenderName, lenderType, loanType, principalAmount, interestRate, loanTerm, startDate, endDate, purpose, notes } = req.body;
        const existingLoan = await prisma.loan.findUnique({
            where: { loanNumber }
        });
        if (existingLoan) {
            return res.status(400).json({ error: 'Loan number already exists' });
        }
        const loan = await prisma.loan.create({
            data: {
                loanNumber,
                lenderName,
                lenderType: lenderType,
                loanType: loanType,
                principalAmount: parseFloat(principalAmount.toString()),
                interestRate: parseFloat(interestRate.toString()),
                loanTerm,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                purpose,
                notes,
                isActive: true
            }
        });
        return res.status(201).json(loan);
    }
    catch (error) {
        console.error('Error creating loan:', error);
        return res.status(500).json({ error: 'Failed to create loan' });
    }
};
exports.createLoan = createLoan;
const updateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { lenderName, lenderType, loanType, principalAmount, interestRate, loanTerm, startDate, endDate, status, purpose, notes } = req.body;
        const loan = await prisma.loan.update({
            where: { id },
            data: {
                lenderName,
                lenderType,
                loanType,
                principalAmount: principalAmount ? parseFloat(principalAmount.toString()) : undefined,
                interestRate: interestRate ? parseFloat(interestRate.toString()) : undefined,
                loanTerm,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                purpose,
                notes
            }
        });
        return res.json(loan);
    }
    catch (error) {
        console.error('Error updating loan:', error);
        return res.status(500).json({ error: 'Failed to update loan' });
    }
};
exports.updateLoan = updateLoan;
const deleteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.loan.update({
            where: { id },
            data: { isActive: false }
        });
        return res.json({ message: 'Loan deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting loan:', error);
        return res.status(500).json({ error: 'Failed to delete loan' });
    }
};
exports.deleteLoan = deleteLoan;
const addLoanPayment = async (req, res) => {
    try {
        const { loanId, paymentNumber, paymentDate, principalAmount, interestAmount, totalAmount, remainingBalance, paymentMethod, notes } = req.body;
        const payment = await prisma.loanPayment.create({
            data: {
                loanId,
                paymentNumber,
                paymentDate: new Date(paymentDate),
                principalAmount: parseFloat(principalAmount.toString()),
                interestAmount: parseFloat(interestAmount.toString()),
                totalAmount: parseFloat(totalAmount.toString()),
                remainingBalance: parseFloat(remainingBalance.toString()),
                paymentMethod: paymentMethod,
                notes,
                status: 'COMPLETED'
            }
        });
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: { payments: true }
        });
        if (loan) {
            const totalPaid = loan.payments.reduce((sum, payment) => sum + Number(payment.totalAmount), 0);
            if (totalPaid >= Number(loan.principalAmount)) {
                await prisma.loan.update({
                    where: { id: loanId },
                    data: { status: 'COMPLETED' }
                });
            }
        }
        return res.status(201).json(payment);
    }
    catch (error) {
        console.error('Error adding loan payment:', error);
        return res.status(500).json({ error: 'Failed to add loan payment' });
    }
};
exports.addLoanPayment = addLoanPayment;
const getLoanPayments = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const payments = await prisma.loanPayment.findMany({
            where: { loanId },
            orderBy: { paymentDate: 'desc' },
            skip,
            take: Number(limit)
        });
        const total = await prisma.loanPayment.count({ where: { loanId } });
        return res.json({
            payments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching loan payments:', error);
        return res.status(500).json({ error: 'Failed to fetch loan payments' });
    }
};
exports.getLoanPayments = getLoanPayments;
const getLoanSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { isActive: true };
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const loans = await prisma.loan.findMany({
            where,
            include: { payments: true }
        });
        const totalLoans = loans.length;
        const totalPrincipal = loans.reduce((sum, loan) => sum + Number(loan.principalAmount), 0);
        const totalPaid = loans.reduce((sum, loan) => sum + loan.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.totalAmount), 0), 0);
        const totalRemaining = totalPrincipal - totalPaid;
        const loansByStatus = loans.reduce((acc, loan) => {
            acc[loan.status] = (acc[loan.status] || 0) + 1;
            return acc;
        }, {});
        const loansByType = loans.reduce((acc, loan) => {
            acc[loan.loanType] = (acc[loan.loanType] || 0) + 1;
            return acc;
        }, {});
        const overdueLoans = loans.filter(loan => {
            const nextPaymentDate = calculateNextPaymentDate(loan);
            return nextPaymentDate && new Date() > nextPaymentDate;
        });
        const monthlyPayments = calculateMonthlyPaymentSchedule(loans);
        return res.json({
            totalLoans,
            totalPrincipal,
            totalPaid,
            totalRemaining,
            loansByStatus,
            loansByType,
            overdueLoans: overdueLoans.length,
            monthlyPayments,
            averageInterestRate: loans.length > 0 ?
                loans.reduce((sum, loan) => sum + Number(loan.interestRate), 0) / loans.length : 0
        });
    }
    catch (error) {
        console.error('Error fetching loan summary:', error);
        return res.status(500).json({ error: 'Failed to fetch loan summary' });
    }
};
exports.getLoanSummary = getLoanSummary;
function calculateNextPaymentDate(loan) {
    if (loan.status !== 'ACTIVE')
        return null;
    const startDate = new Date(loan.startDate);
    const lastPayment = loan.payments?.[0];
    if (lastPayment) {
        const lastPaymentDate = new Date(lastPayment.paymentDate);
        const nextPaymentDate = new Date(lastPaymentDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        return nextPaymentDate;
    }
    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    return nextPaymentDate;
}
function calculateMonthlyPaymentSchedule(loans) {
    const schedule = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
        const monthDate = new Date(currentDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        const monthLoans = loans.filter(loan => {
            const nextPaymentDate = calculateNextPaymentDate(loan);
            return nextPaymentDate &&
                nextPaymentDate.getMonth() === monthDate.getMonth() &&
                nextPaymentDate.getFullYear() === monthDate.getFullYear();
        });
        const totalMonthlyPayment = monthLoans.reduce((sum, loan) => {
            const monthlyRate = Number(loan.interestRate) / 100 / 12;
            const monthlyPayment = Number(loan.principalAmount) *
                (monthlyRate * Math.pow(1 + monthlyRate, loan.loanTerm)) /
                (Math.pow(1 + monthlyRate, loan.loanTerm) - 1);
            return sum + monthlyPayment;
        }, 0);
        schedule.push({
            month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            amount: totalMonthlyPayment,
            loanCount: monthLoans.length
        });
    }
    return schedule;
}
//# sourceMappingURL=loanController.js.map