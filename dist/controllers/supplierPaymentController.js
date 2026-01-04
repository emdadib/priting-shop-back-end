"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierPaymentSummary = exports.getPurchaseOrderPayments = exports.recordSupplierPayment = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const recordSupplierPayment = async (req, res) => {
    try {
        const { purchaseOrderId, amount, paymentMethod, notes, userId } = req.body;
        if (!purchaseOrderId || !amount || !paymentMethod || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: purchaseOrderId, amount, paymentMethod, userId'
            });
        }
        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { supplier: true }
        });
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }
        const paymentAmount = parseFloat(amount);
        const currentPaidAmount = parseFloat(purchaseOrder.paidAmount?.toString() || '0');
        const totalAmount = parseFloat(purchaseOrder.total.toString());
        const newPaidAmount = currentPaidAmount + paymentAmount;
        const newDueAmount = totalAmount - newPaidAmount;
        if (paymentAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }
        if (newPaidAmount > totalAmount) {
            return res.status(400).json({
                success: false,
                message: `Payment amount exceeds total. Total: ${totalAmount}, Already paid: ${currentPaidAmount}, Max payment: ${totalAmount - currentPaidAmount}`
            });
        }
        let paymentStatus = 'PENDING';
        if (newPaidAmount >= totalAmount) {
            paymentStatus = 'COMPLETED';
        }
        else if (newPaidAmount > 0) {
            paymentStatus = 'COMPLETED';
        }
        await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
                paidAmount: newPaidAmount,
                dueAmount: newDueAmount,
                paymentStatus: paymentStatus
            }
        });
        await prisma.supplierTransaction.create({
            data: {
                supplierId: purchaseOrder.supplierId,
                type: 'DEBIT',
                amount: paymentAmount,
                description: `Payment for Purchase Order ${purchaseOrder.poNumber}`,
                reference: purchaseOrder.poNumber,
                referenceType: 'PURCHASE_ORDER',
                referenceId: purchaseOrderId,
                date: new Date(),
                isActive: true
            }
        });
        await prisma.companyTransaction.create({
            data: {
                accountType: paymentMethod === 'CASH' ? 'CASH' : 'BANK',
                type: 'CREDIT',
                amount: paymentAmount,
                description: `Payment to ${purchaseOrder.supplier.name} - PO ${purchaseOrder.poNumber}`,
                reference: purchaseOrder.poNumber,
                referenceType: 'PURCHASE_ORDER',
                referenceId: purchaseOrderId,
                date: new Date(),
                isActive: true
            }
        });
        const payment = await prisma.payment.create({
            data: {
                supplierId: purchaseOrder.supplierId,
                amount: paymentAmount,
                method: paymentMethod,
                status: 'COMPLETED',
                notes: notes || `Payment for Purchase Order ${purchaseOrder.poNumber}`,
                userId: userId
            },
            include: {
                supplier: true,
                user: true
            }
        });
        console.log('Supplier payment recorded successfully:', {
            paymentId: payment.id,
            purchaseOrderId: purchaseOrderId,
            amount: paymentAmount,
            supplier: purchaseOrder.supplier.name,
            newPaidAmount,
            newDueAmount,
            paymentStatus
        });
        res.status(201).json({
            success: true,
            data: {
                payment,
                purchaseOrder: {
                    id: purchaseOrder.id,
                    poNumber: purchaseOrder.poNumber,
                    total: totalAmount,
                    paidAmount: newPaidAmount,
                    dueAmount: newDueAmount,
                    paymentStatus
                }
            }
        });
    }
    catch (error) {
        console.error('Error recording supplier payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record supplier payment'
        });
    }
};
exports.recordSupplierPayment = recordSupplierPayment;
const getPurchaseOrderPayments = async (req, res) => {
    try {
        const { purchaseOrderId } = req.params;
        const payments = await prisma.payment.findMany({
            where: {
                supplierId: {
                    not: null
                },
                notes: {
                    contains: purchaseOrderId
                }
            },
            include: {
                supplier: true,
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Error fetching purchase order payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase order payments'
        });
    }
};
exports.getPurchaseOrderPayments = getPurchaseOrderPayments;
const getSupplierPaymentSummary = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { supplierId },
            select: {
                id: true,
                poNumber: true,
                total: true,
                paidAmount: true,
                dueAmount: true,
                paymentStatus: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const totalOrders = purchaseOrders.length;
        const totalAmount = purchaseOrders.reduce((sum, po) => sum + parseFloat(po.total.toString()), 0);
        const totalPaid = purchaseOrders.reduce((sum, po) => sum + parseFloat(po.paidAmount?.toString() || '0'), 0);
        const totalDue = purchaseOrders.reduce((sum, po) => sum + parseFloat(po.dueAmount?.toString() || '0'), 0);
        res.json({
            success: true,
            data: {
                purchaseOrders,
                summary: {
                    totalOrders,
                    totalAmount,
                    totalPaid,
                    totalDue,
                    paymentStatus: totalDue === 0 ? 'FULLY_PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching supplier payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supplier payment summary'
        });
    }
};
exports.getSupplierPaymentSummary = getSupplierPaymentSummary;
//# sourceMappingURL=supplierPaymentController.js.map