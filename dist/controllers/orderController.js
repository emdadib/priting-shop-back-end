"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrdersByDateRange = exports.getOrdersByCustomer = exports.getOrdersByStatus = exports.deleteOrder = exports.updateOrder = exports.createOrder = exports.getOrderById = exports.getAllOrders = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        res.json({
            success: true,
            data: order
        });
    }
    catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};
exports.getOrderById = getOrderById;
const createOrder = async (req, res) => {
    try {
        const { customerId, items, status, type, notes, discountAmount, discountType } = req.body;
        const userId = req.user?.id;
        console.log('Creating order:', {
            customerId,
            itemsCount: items?.length || 0,
            status,
            type,
            discountAmount,
            discountType
        });
        let finalCustomerId = customerId;
        if (customerId === 'walk-in') {
            const { getOrCreateWalkInCustomer } = await Promise.resolve().then(() => __importStar(require('../utils/walkInCustomer')));
            const walkInCustomer = await getOrCreateWalkInCustomer();
            finalCustomerId = walkInCustomer.id;
        }
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        let subtotal = items.reduce((sum, item) => {
            const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
            return sum + itemTotal;
        }, 0);
        if (discountAmount && discountAmount > 0) {
            if (discountType === 'PERCENTAGE') {
                subtotal = subtotal * (1 - discountAmount / 100);
            }
            else {
                subtotal = subtotal - discountAmount;
            }
        }
        const totalTax = items.reduce((sum, item) => {
            return sum + (item.taxAmount || 0);
        }, 0);
        const total = subtotal + totalTax;
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        let initialStatus = status || 'PENDING';
        if (type === 'DIRECT_SALE') {
            initialStatus = 'COMPLETED';
        }
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId: finalCustomerId,
                userId,
                status: initialStatus,
                type: type || 'SALE',
                subtotal,
                taxAmount: totalTax,
                discountAmount: discountAmount || 0,
                total,
                notes,
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        costPrice: item.costPrice || item.unitPrice,
                        discount: item.discount || 0,
                        taxAmount: item.taxAmount || 0,
                        total: item.total,
                        notes: item.notes,
                        specifications: item.specifications,
                        serialNumbers: item.serialNumbers || null,
                        warrantyStartDate: item.warrantyStartDate ? new Date(item.warrantyStartDate) : null,
                        warrantyEndDate: item.warrantyEndDate ? new Date(item.warrantyEndDate) : null
                    }))
                }
            },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (initialStatus === 'COMPLETED' || initialStatus === 'CONFIRMED') {
            console.log('Order status indicates completion - updating inventory...');
            for (const item of items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        hasInventory: true
                    }
                });
                if (product && product.type === 'PHYSICAL' && product.hasInventory) {
                    console.log('Updating inventory for sale item:', {
                        productId: item.productId,
                        productName: product.name,
                        quantity: item.quantity
                    });
                    const existingInventory = await prisma.inventory.findUnique({
                        where: { productId: item.productId }
                    });
                    if (existingInventory) {
                        const newQuantity = Math.max(0, existingInventory.quantity - item.quantity);
                        const newAvailable = Math.max(0, existingInventory.available - item.quantity);
                        await prisma.inventory.update({
                            where: { productId: item.productId },
                            data: {
                                quantity: newQuantity,
                                available: newAvailable,
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'SALE',
                                quantity: -item.quantity,
                                previousQuantity: existingInventory.quantity,
                                newQuantity: newQuantity,
                                reason: `Sale order ${orderNumber} - Stock decrease`,
                                reference: `ORD-${orderNumber}`,
                                userId: userId
                            }
                        });
                        console.log('Inventory updated for product:', product.name, 'New quantity:', newQuantity);
                    }
                    else {
                        console.log('No inventory record found for product:', product.name);
                    }
                }
            }
        }
        await prisma.customerTransaction.create({
            data: {
                customerId: finalCustomerId,
                type: 'DEBIT',
                amount: total,
                description: `Order ${orderNumber}`,
                referenceType: 'ORDER',
                referenceId: order.id,
                date: new Date()
            }
        });
        await prisma.companyTransaction.create({
            data: {
                accountType: 'SALES',
                type: 'CREDIT',
                amount: total,
                description: `Sales Revenue - Order ${orderNumber}`,
                reference: orderNumber,
                referenceType: 'ORDER',
                referenceId: order.id,
                date: new Date(),
                isActive: true
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'CREATE',
            entity: 'ORDER',
            entityId: order.id,
            newValues: { customerId, status, type, items },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: order
        });
    }
    catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
};
exports.createOrder = createOrder;
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const existingOrder = await prisma.order.findUnique({
            where: { id }
        });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                status,
                notes
            },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'UPDATE',
            entity: 'ORDER',
            entityId: id,
            oldValues: {
                status: existingOrder.status,
                notes: existingOrder.notes
            },
            newValues: { status, notes },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedOrder
        });
    }
    catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order'
        });
    }
};
exports.updateOrder = updateOrder;
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const existingOrder = await prisma.order.findUnique({
            where: { id }
        });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        await prisma.orderItem.deleteMany({
            where: { orderId: id }
        });
        await prisma.order.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'DELETE',
            entity: 'ORDER',
            entityId: id,
            oldValues: {
                customerId: existingOrder.customerId,
                status: existingOrder.status,
                type: existingOrder.type
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order'
        });
    }
};
exports.deleteOrder = deleteOrder;
const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const orders = await prisma.order.findMany({
            where: { status: status },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Get orders by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};
exports.getOrdersByStatus = getOrdersByStatus;
const getOrdersByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const orders = await prisma.order.findMany({
            where: { customerId },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Get orders by customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};
exports.getOrdersByCustomer = getOrdersByCustomer;
const getOrdersByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                }
            },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Get orders by date range error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};
exports.getOrdersByDateRange = getOrdersByDateRange;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        console.log('Updating order status:', {
            orderId: id,
            newStatus: status,
            previousStatus: existingOrder.status,
            itemsCount: existingOrder.items.length
        });
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                status
            },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (status === 'COMPLETED' && existingOrder.status !== 'COMPLETED') {
            console.log('Order completed - updating inventory...');
            for (const item of existingOrder.items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        hasInventory: true
                    }
                });
                if (product && product.type === 'PHYSICAL' && product.hasInventory) {
                    console.log('Updating inventory for completed order item:', {
                        productId: item.productId,
                        productName: product.name,
                        quantity: item.quantity
                    });
                    const existingInventory = await prisma.inventory.findUnique({
                        where: { productId: item.productId }
                    });
                    if (existingInventory) {
                        const newQuantity = Math.max(0, existingInventory.quantity - item.quantity);
                        const newAvailable = Math.max(0, existingInventory.available - item.quantity);
                        await prisma.inventory.update({
                            where: { productId: item.productId },
                            data: {
                                quantity: newQuantity,
                                available: newAvailable,
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'SALE',
                                quantity: -item.quantity,
                                previousQuantity: existingInventory.quantity,
                                newQuantity: newQuantity,
                                reason: `Order ${existingOrder.orderNumber} completed - Stock decrease`,
                                reference: `ORD-${existingOrder.orderNumber}`,
                                userId: req.user?.id || 'unknown'
                            }
                        });
                        console.log('Inventory updated for product:', product.name, 'New quantity:', newQuantity);
                    }
                    else {
                        console.log('No inventory record found for product:', product.name);
                    }
                }
            }
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'UPDATE',
            entity: 'ORDER',
            entityId: id,
            oldValues: {
                status: existingOrder.status
            },
            newValues: { status },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedOrder
        });
    }
    catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
//# sourceMappingURL=orderController.js.map