"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchaseOrdersWithDueAmount = exports.getPurchaseOrdersBySupplier = exports.getPurchaseOrderStats = exports.deletePurchaseOrder = exports.updatePurchaseOrderStatus = exports.updatePurchaseOrder = exports.createPurchaseOrder = exports.getPurchaseOrderById = exports.getAllPurchaseOrders = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
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
            }
        });
        return res.json(purchaseOrders);
    }
    catch (error) {
        console.error('Error fetching purchase orders:', error);
        return res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
};
exports.getAllPurchaseOrders = getAllPurchaseOrders;
const getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                },
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
        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        return res.json(purchaseOrder);
    }
    catch (error) {
        console.error('Error fetching purchase order:', error);
        return res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
};
exports.getPurchaseOrderById = getPurchaseOrderById;
const createPurchaseOrder = async (req, res) => {
    try {
        const { supplierId, poNumber, orderDate, expectedDelivery, status, items, notes, subtotal, taxAmount, discountAmount, total, purchaseMode } = req.body;
        console.log('Creating purchase order:', {
            poNumber,
            purchaseMode,
            status,
            itemsCount: items?.length || 0
        });
        const userId = req.user.id;
        let initialStatus = status || 'DRAFT';
        if (purchaseMode === 'QUICK') {
            initialStatus = 'RECEIVED';
        }
        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                supplierId,
                userId,
                poNumber,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
                status: initialStatus,
                notes,
                subtotal: parseFloat(subtotal || 0),
                taxAmount: parseFloat(taxAmount || 0),
                discountAmount: parseFloat(discountAmount || 0),
                total: parseFloat(total || 0),
                items: {
                    create: (items && items.length > 0) ? items.map((item) => ({
                        productId: item.productId,
                        quantity: parseInt(item.quantity),
                        unitPrice: parseFloat(item.unitPrice),
                        total: parseFloat(item.total),
                        notes: item.notes
                    })) : []
                }
            },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (purchaseMode === 'QUICK' && items && items.length > 0) {
            console.log('Quick purchase detected - updating inventory immediately...');
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
                    console.log('Updating inventory for quick purchase item:', {
                        productId: item.productId,
                        productName: product.name,
                        quantity: item.quantity
                    });
                    const existingInventory = await prisma.inventory.findUnique({
                        where: { productId: item.productId }
                    });
                    if (existingInventory) {
                        const newQuantity = existingInventory.quantity + item.quantity;
                        await prisma.inventory.update({
                            where: { productId: item.productId },
                            data: {
                                quantity: newQuantity,
                                available: Math.max(0, newQuantity - existingInventory.reserved),
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'PURCHASE',
                                quantity: item.quantity,
                                previousQuantity: existingInventory.quantity,
                                newQuantity: newQuantity,
                                reason: `Quick purchase order ${poNumber} - Immediate stock update`,
                                reference: `PO-${poNumber}`,
                                userId: userId
                            }
                        });
                        console.log('Inventory updated for product:', product.name, 'New quantity:', newQuantity);
                    }
                    else {
                        await prisma.inventory.create({
                            data: {
                                productId: item.productId,
                                quantity: item.quantity,
                                available: item.quantity,
                                reserved: 0,
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'PURCHASE',
                                quantity: item.quantity,
                                previousQuantity: 0,
                                newQuantity: item.quantity,
                                reason: `Quick purchase order ${poNumber} - Initial stock`,
                                reference: `PO-${poNumber}`,
                                userId: userId
                            }
                        });
                        console.log('New inventory record created for product:', product.name, 'Quantity:', item.quantity);
                    }
                }
            }
        }
        const totalAmount = parseFloat(total || 0);
        await prisma.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: {
                paidAmount: 0,
                dueAmount: totalAmount,
                paymentStatus: 'PENDING'
            }
        });
        await prisma.supplierTransaction.create({
            data: {
                supplierId,
                type: 'CREDIT',
                amount: totalAmount,
                description: `Purchase Order ${poNumber}`,
                reference: poNumber,
                referenceType: 'PURCHASE_ORDER',
                referenceId: purchaseOrder.id,
                date: new Date(),
                isActive: true
            }
        });
        const existingPurchaseCostTransaction = await prisma.companyTransaction.findFirst({
            where: {
                referenceId: purchaseOrder.id,
                referenceType: 'PURCHASE_ORDER',
                accountType: 'PURCHASES',
                type: 'DEBIT',
                isActive: true
            }
        });
        if (!existingPurchaseCostTransaction) {
            await prisma.companyTransaction.create({
                data: {
                    accountType: 'PURCHASES',
                    type: 'DEBIT',
                    amount: parseFloat(total || 0),
                    description: `Purchase Cost - Order ${poNumber}`,
                    reference: poNumber,
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: purchaseOrder.id,
                    date: new Date(),
                    isActive: true
                }
            });
        }
        else {
            console.log(`Purchase cost transaction already exists for PO ${poNumber}, skipping duplicate creation`);
        }
        return res.status(201).json(purchaseOrder);
    }
    catch (error) {
        console.error('Error creating purchase order:', error);
        return res.status(500).json({ error: 'Failed to create purchase order' });
    }
};
exports.createPurchaseOrder = createPurchaseOrder;
const updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplierId, poNumber, orderDate, expectedDelivery, status, items, notes, subtotal, taxAmount, discountAmount, total } = req.body;
        await prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id }
        });
        const purchaseOrder = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                supplierId,
                poNumber,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
                status,
                notes,
                subtotal: parseFloat(subtotal),
                taxAmount: parseFloat(taxAmount || 0),
                discountAmount: parseFloat(discountAmount || 0),
                total: parseFloat(total),
                items: {
                    create: (items && items.length > 0) ? items.map((item) => ({
                        productId: item.productId,
                        quantity: parseInt(item.quantity),
                        unitPrice: parseFloat(item.unitPrice),
                        total: parseFloat(item.total),
                        notes: item.notes
                    })) : []
                }
            },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        return res.json(purchaseOrder);
    }
    catch (error) {
        console.error('Error updating purchase order:', error);
        return res.status(500).json({ error: 'Failed to update purchase order' });
    }
};
exports.updatePurchaseOrder = updatePurchaseOrder;
const updatePurchaseOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const existingOrder = await prisma.purchaseOrder.findUnique({
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
                message: 'Purchase order not found'
            });
        }
        const updatedOrder = await prisma.purchaseOrder.update({
            where: { id },
            data: { status },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                },
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
        console.log('Purchase order status update:', {
            orderId: id,
            newStatus: status,
            previousStatus: existingOrder.status,
            itemsCount: existingOrder.items.length
        });
        if (status === 'RECEIVED' || status === 'PARTIAL_RECEIVED') {
            console.log('Updating inventory for received purchase order...');
            for (const item of existingOrder.items) {
                console.log('Processing item for inventory update:', {
                    productId: item.productId,
                    productName: item.product.name,
                    productType: item.product.type,
                    hasInventory: item.product.hasInventory,
                    quantity: item.quantity
                });
                if (item.product.type === 'PHYSICAL' && item.product.hasInventory) {
                    const existingInventory = await prisma.inventory.findUnique({
                        where: { productId: item.productId }
                    });
                    if (existingInventory) {
                        const newQuantity = existingInventory.quantity + item.quantity;
                        await prisma.inventory.update({
                            where: { productId: item.productId },
                            data: {
                                quantity: newQuantity,
                                available: Math.max(0, newQuantity - existingInventory.reserved),
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'PURCHASE',
                                quantity: item.quantity,
                                previousQuantity: existingInventory.quantity,
                                newQuantity: newQuantity,
                                reason: `Purchase order ${existingOrder.poNumber} received`,
                                reference: `PO-${existingOrder.poNumber}`,
                                userId: req.user.id
                            }
                        });
                    }
                    else {
                        await prisma.inventory.create({
                            data: {
                                productId: item.productId,
                                quantity: item.quantity,
                                available: item.quantity,
                                reserved: 0,
                                lastUpdated: new Date()
                            }
                        });
                        await prisma.inventoryMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'PURCHASE',
                                quantity: item.quantity,
                                previousQuantity: 0,
                                newQuantity: item.quantity,
                                reason: `Purchase order ${existingOrder.poNumber} received - Initial stock`,
                                reference: `PO-${existingOrder.poNumber}`,
                                userId: req.user.id
                            }
                        });
                    }
                }
            }
        }
        if (status === 'RECEIVED' && existingOrder.status !== 'RECEIVED') {
            const existingTransaction = await prisma.supplierTransaction.findFirst({
                where: {
                    referenceId: existingOrder.id,
                    referenceType: 'PURCHASE_ORDER'
                }
            });
            if (!existingTransaction) {
                await prisma.supplierTransaction.create({
                    data: {
                        supplierId: existingOrder.supplierId,
                        type: 'CREDIT',
                        amount: parseFloat(existingOrder.total.toString()),
                        description: `Purchase Order ${existingOrder.poNumber} - Received`,
                        reference: existingOrder.poNumber,
                        referenceType: 'PURCHASE_ORDER',
                        referenceId: existingOrder.id,
                        date: new Date(),
                        isActive: true
                    }
                });
                const existingPurchaseCostTransaction = await prisma.companyTransaction.findFirst({
                    where: {
                        referenceId: existingOrder.id,
                        referenceType: 'PURCHASE_ORDER',
                        accountType: 'PURCHASES',
                        type: 'DEBIT',
                        isActive: true
                    }
                });
                if (!existingPurchaseCostTransaction) {
                    await prisma.companyTransaction.create({
                        data: {
                            accountType: 'PURCHASES',
                            type: 'DEBIT',
                            amount: parseFloat(existingOrder.total.toString()),
                            description: `Purchase Cost - Order ${existingOrder.poNumber} - Received`,
                            reference: existingOrder.poNumber,
                            referenceType: 'PURCHASE_ORDER',
                            referenceId: existingOrder.id,
                            date: new Date(),
                            isActive: true
                        }
                    });
                }
                else {
                    console.log(`Purchase cost transaction already exists for PO ${existingOrder.poNumber}, skipping duplicate creation`);
                }
                console.log('Supplier transaction created for received purchase order:', existingOrder.poNumber);
            }
        }
        console.log('Purchase order status update completed successfully');
        return res.json({
            success: true,
            data: updatedOrder
        });
    }
    catch (error) {
        console.error('Error updating purchase order status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update purchase order status'
        });
    }
};
exports.updatePurchaseOrderStatus = updatePurchaseOrderStatus;
const deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const existingOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true
            }
        });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }
        const relatedPayments = await prisma.payment.findMany({
            where: {
                supplierId: existingOrder.supplierId,
                notes: {
                    contains: existingOrder.poNumber
                }
            },
            select: { id: true }
        });
        const paymentIds = relatedPayments.map(p => p.id);
        if (paymentIds.length > 0) {
            await prisma.companyTransaction.updateMany({
                where: {
                    referenceType: 'PAYMENT',
                    referenceId: { in: paymentIds }
                },
                data: {
                    isActive: false
                }
            });
            await prisma.supplierTransaction.updateMany({
                where: {
                    referenceType: 'PAYMENT',
                    referenceId: { in: paymentIds }
                },
                data: {
                    isActive: false
                }
            });
        }
        await prisma.supplierTransaction.updateMany({
            where: {
                referenceType: 'PURCHASE_ORDER',
                referenceId: id
            },
            data: {
                isActive: false
            }
        });
        await prisma.companyTransaction.updateMany({
            where: {
                referenceType: 'PURCHASE_ORDER',
                referenceId: id
            },
            data: {
                isActive: false
            }
        });
        await prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id }
        });
        if (paymentIds.length > 0) {
            await prisma.payment.deleteMany({
                where: {
                    id: { in: paymentIds }
                }
            });
        }
        await prisma.purchaseOrder.delete({
            where: { id }
        });
        console.log('Purchase order and related transactions deleted successfully:', {
            purchaseOrderId: id,
            poNumber: existingOrder.poNumber,
            transactionsSoftDeleted: true,
            paymentsDeleted: paymentIds.length
        });
        return res.json({
            success: true,
            message: 'Purchase order deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting purchase order:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete purchase order'
        });
    }
};
exports.deletePurchaseOrder = deletePurchaseOrder;
const getPurchaseOrderStats = async (req, res) => {
    try {
        const totalOrders = await prisma.purchaseOrder.count();
        const draftOrders = await prisma.purchaseOrder.count({
            where: { status: 'DRAFT' }
        });
        const receivedOrders = await prisma.purchaseOrder.count({
            where: { status: 'RECEIVED' }
        });
        const totalValue = await prisma.purchaseOrder.aggregate({
            _sum: {
                total: true
            }
        });
        return res.json({
            totalOrders,
            draftOrders,
            receivedOrders,
            totalValue: totalValue._sum.total || 0
        });
    }
    catch (error) {
        console.error('Error fetching purchase order stats:', error);
        return res.status(500).json({ error: 'Failed to fetch purchase order statistics' });
    }
};
exports.getPurchaseOrderStats = getPurchaseOrderStats;
const getPurchaseOrdersBySupplier = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { supplierId },
            include: {
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
        return res.json(purchaseOrders);
    }
    catch (error) {
        console.error('Error fetching supplier purchase orders:', error);
        return res.status(500).json({ error: 'Failed to fetch supplier purchase orders' });
    }
};
exports.getPurchaseOrdersBySupplier = getPurchaseOrdersBySupplier;
const getPurchaseOrdersWithDueAmount = async (req, res) => {
    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                dueAmount: {
                    gt: 0
                }
            },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        company: true,
                        email: true,
                        phone: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                orderDate: 'desc'
            }
        });
        const totalDueAmount = purchaseOrders.reduce((sum, po) => {
            return sum + Number(po.dueAmount?.toString() || '0');
        }, 0);
        const totalOrders = purchaseOrders.length;
        const byPaymentStatus = purchaseOrders.reduce((acc, po) => {
            const status = po.paymentStatus || 'PENDING';
            if (!acc[status]) {
                acc[status] = { count: 0, totalDue: 0 };
            }
            acc[status].count++;
            acc[status].totalDue += Number(po.dueAmount?.toString() || '0');
            return acc;
        }, {});
        return res.json({
            hasDueAmount: totalOrders > 0,
            totalOrders,
            totalDueAmount,
            purchaseOrders,
            summary: {
                byPaymentStatus
            }
        });
    }
    catch (error) {
        console.error('Error fetching purchase orders with due amount:', error);
        return res.status(500).json({ error: 'Failed to fetch purchase orders with due amount' });
    }
};
exports.getPurchaseOrdersWithDueAmount = getPurchaseOrdersWithDueAmount;
//# sourceMappingURL=purchaseOrderController.js.map