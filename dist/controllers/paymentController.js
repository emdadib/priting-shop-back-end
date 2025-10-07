"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderPayments = exports.getOrderDueAmount = exports.getCustomerDueAmount = exports.createPayment = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createPayment = async (req, res) => {
    try {
        const { customerId, orderId, amount, paymentMethod, notes } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }
        const order = orderId ? await prisma.order.findUnique({
            where: { id: orderId },
            include: { payments: true }
        }) : null;
        if (orderId && !order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        const totalPaid = order ? order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) : 0;
        const orderTotal = order ? Number(order.total) : 0;
        const remainingAmount = orderTotal - totalPaid;
        if (order && amount > remainingAmount) {
            return res.status(400).json({
                success: false,
                message: `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})`
            });
        }
        const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        console.log('Creating payment with data:', {
            customerId,
            orderId,
            amount,
            paymentMethod,
            notes,
            userId
        });
        const payment = await prisma.payment.create({
            data: {
                customerId,
                orderId,
                userId,
                amount,
                method: paymentMethod,
                notes,
                status: 'COMPLETED'
            },
            include: {
                customer: true,
                order: true,
                user: true
            }
        });
        console.log('Payment created successfully:', {
            paymentId: payment.id,
            orderId: payment.orderId,
            amount: payment.amount,
            status: payment.status
        });
        await prisma.customerTransaction.create({
            data: {
                customerId,
                type: 'CREDIT',
                amount,
                description: `Payment ${paymentNumber}${orderId && order ? ` for Order ${order.orderNumber}` : ''}`,
                referenceType: 'PAYMENT',
                referenceId: payment.id,
                date: new Date()
            }
        });
        await prisma.companyTransaction.create({
            data: {
                accountType: paymentMethod === 'CASH' ? 'CASH' : 'BANK',
                type: 'DEBIT',
                amount,
                description: `Payment Received - ${paymentNumber}${orderId && order ? ` for Order ${order.orderNumber}` : ''}`,
                reference: paymentNumber,
                referenceType: 'PAYMENT',
                referenceId: payment.id,
                date: new Date(),
                isActive: true
            }
        });
        res.status(201).json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment'
        });
    }
};
exports.createPayment = createPayment;
const getCustomerDueAmount = async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                orders: {
                    include: {
                        payments: true
                    }
                }
            }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        let totalDue = 0;
        customer.orders.forEach(order => {
            const orderTotal = Number(order.total);
            const totalPaid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            totalDue += orderTotal - totalPaid;
        });
        res.json({
            success: true,
            data: {
                customerId,
                totalDue
            }
        });
    }
    catch (error) {
        console.error('Get customer due amount error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get customer due amount'
        });
    }
};
exports.getCustomerDueAmount = getCustomerDueAmount;
const getOrderDueAmount = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payments: true
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        const orderTotal = Number(order.total);
        const totalPaid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const dueAmount = orderTotal - totalPaid;
        console.log('Due amount calculation for order:', {
            orderId,
            orderNumber: order.orderNumber,
            orderTotal,
            paymentsCount: order.payments.length,
            payments: order.payments.map(p => ({ id: p.id, amount: p.amount, status: p.status })),
            totalPaid,
            dueAmount
        });
        res.json({
            success: true,
            data: {
                orderId,
                dueAmount
            }
        });
    }
    catch (error) {
        console.error('Get order due amount error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order due amount'
        });
    }
};
exports.getOrderDueAmount = getOrderDueAmount;
const getOrderPayments = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payments = await prisma.payment.findMany({
            where: { orderId },
            include: {
                customer: true,
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Payments for order:', {
            orderId,
            paymentsCount: payments.length,
            payments: payments.map(p => ({ id: p.id, amount: p.amount, status: p.status, method: p.method }))
        });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Get order payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order payments'
        });
    }
};
exports.getOrderPayments = getOrderPayments;
//# sourceMappingURL=paymentController.js.map