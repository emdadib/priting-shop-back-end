"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryReport = exports.bulkUpdateInventory = exports.getLowStockAlerts = exports.getInventoryMovements = exports.updateStock = exports.getInventoryByProduct = exports.getInventory = void 0;
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const getInventory = async (req, res) => {
    try {
        console.log('Inventory request received:', req.query);
        const { page = 1, limit = 20, search, category, lowStock } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            product: {
                isActive: true,
                hasInventory: true
            }
        };
        if (search) {
            where.product = {
                ...where.product,
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } }
                ]
            };
        }
        if (category) {
            where.product.categoryId = category;
        }
        if (lowStock === 'true') {
            where.product = {
                ...where.product,
                minStock: {
                    gt: 0
                }
            };
            where.quantity = {
                lte: {
                    path: ['product', 'minStock']
                }
            };
        }
        console.log('Inventory query where clause:', JSON.stringify(where, null, 2));
        const [inventory, total] = await Promise.all([
            index_1.prisma.inventory.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            minStock: true,
                            maxStock: true,
                            unit: true,
                            category: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    product: {
                        name: 'asc'
                    }
                },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.inventory.count({ where })
        ]);
        console.log('Inventory query results:', { count: inventory.length, total });
        const inventoryWithAlerts = inventory.map(item => ({
            ...item,
            isLowStock: item.product.minStock > 0 && item.quantity <= item.product.minStock,
            isOutOfStock: item.quantity === 0
        }));
        res.json({
            success: true,
            data: inventoryWithAlerts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory'
        });
    }
};
exports.getInventory = getInventory;
const getInventoryByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const inventory = await index_1.prisma.inventory.findUnique({
            where: { productId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        minStock: true,
                        maxStock: true,
                        unit: true,
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory not found for this product'
            });
        }
        res.json({
            success: true,
            data: {
                ...inventory,
                isLowStock: inventory.product.minStock > 0 && inventory.quantity <= inventory.product.minStock,
                isOutOfStock: inventory.quantity === 0
            }
        });
    }
    catch (error) {
        console.error('Get inventory by product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory'
        });
    }
};
exports.getInventoryByProduct = getInventoryByProduct;
const updateStock = async (req, res) => {
    try {
        const { productId, quantity, type, reason, reference } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const currentInventory = await index_1.prisma.inventory.findUnique({
            where: { productId },
            include: {
                product: {
                    select: {
                        name: true,
                        minStock: true,
                        maxStock: true
                    }
                }
            }
        });
        if (!currentInventory) {
            return res.status(404).json({
                success: false,
                message: 'Product inventory not found'
            });
        }
        const previousQuantity = currentInventory.quantity;
        let newQuantity = previousQuantity;
        switch (type) {
            case 'PURCHASE':
            case 'RETURN':
                newQuantity += quantity;
                break;
            case 'SALE':
                if (quantity > currentInventory.available) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient stock available'
                    });
                }
                newQuantity -= quantity;
                break;
            case 'ADJUSTMENT':
                newQuantity = quantity;
                break;
            case 'TRANSFER':
                newQuantity += quantity;
                break;
            case 'DAMAGE':
            case 'EXPIRY':
                if (quantity > currentInventory.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot remove more than available stock'
                    });
                }
                newQuantity -= quantity;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid movement type'
                });
        }
        if (currentInventory.product.maxStock && newQuantity > currentInventory.product.maxStock) {
            return res.status(400).json({
                success: false,
                message: `Stock cannot exceed maximum of ${currentInventory.product.maxStock}`
            });
        }
        const updatedInventory = await index_1.prisma.inventory.update({
            where: { productId },
            data: {
                quantity: newQuantity,
                available: Math.max(0, newQuantity - currentInventory.reserved),
                lastUpdated: new Date()
            }
        });
        const movement = await index_1.prisma.inventoryMovement.create({
            data: {
                productId,
                type,
                quantity,
                previousQuantity,
                newQuantity,
                reason,
                reference,
                userId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'UPDATE_STOCK',
            entity: 'INVENTORY',
            entityId: productId,
            oldValues: { quantity: previousQuantity },
            newValues: { quantity: newQuantity, type, reason },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        const io = req.app.get('io');
        io.to('inventory-updates').emit('inventory-updated', {
            productId,
            quantity: newQuantity,
            available: updatedInventory.available,
            movement
        });
        if (currentInventory.product.minStock > 0 && newQuantity <= currentInventory.product.minStock) {
            io.to('inventory-updates').emit('low-stock-alert', {
                productId,
                productName: currentInventory.product.name,
                currentStock: newQuantity,
                minStock: currentInventory.product.minStock
            });
        }
        res.json({
            success: true,
            data: {
                inventory: updatedInventory,
                movement
            }
        });
    }
    catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock'
        });
    }
};
exports.updateStock = updateStock;
const getInventoryMovements = async (req, res) => {
    try {
        const { productId, type, startDate, endDate, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (productId) {
            where.productId = productId;
        }
        if (type) {
            where.type = type;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const [movements, total] = await Promise.all([
            index_1.prisma.inventoryMovement.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.inventoryMovement.count({ where })
        ]);
        res.json({
            success: true,
            data: movements,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get inventory movements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory movements'
        });
    }
};
exports.getInventoryMovements = getInventoryMovements;
const getLowStockAlerts = async (req, res) => {
    try {
        const lowStockItems = await index_1.prisma.inventory.findMany({
            where: {
                product: {
                    isActive: true,
                    minStock: {
                        gt: 0
                    }
                }
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        minStock: true,
                        maxStock: true,
                        unit: true,
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                quantity: 'asc'
            }
        });
        const filteredItems = lowStockItems.filter(item => item.quantity <= item.product.minStock);
        res.json({
            success: true,
            data: filteredItems.map(item => ({
                ...item,
                isOutOfStock: item.quantity === 0,
                stockLevel: item.quantity,
                minStock: item.product.minStock,
                deficit: item.product.minStock - item.quantity
            }))
        });
    }
    catch (error) {
        console.error('Get low stock alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock alerts'
        });
    }
};
exports.getLowStockAlerts = getLowStockAlerts;
const bulkUpdateInventory = async (req, res) => {
    try {
        const { updates } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const results = await Promise.allSettled(updates.map(async (update) => {
            const { productId, quantity, type, reason } = update;
            const currentInventory = await index_1.prisma.inventory.findUnique({
                where: { productId }
            });
            if (!currentInventory) {
                throw new Error(`Inventory not found for product ${productId}`);
            }
            const previousQuantity = currentInventory.quantity;
            let newQuantity = previousQuantity;
            switch (type) {
                case 'PURCHASE':
                case 'RETURN':
                    newQuantity += quantity;
                    break;
                case 'SALE':
                    newQuantity -= quantity;
                    break;
                case 'ADJUSTMENT':
                    newQuantity = quantity;
                    break;
                default:
                    newQuantity += quantity;
            }
            const updatedInventory = await index_1.prisma.inventory.update({
                where: { productId },
                data: {
                    quantity: newQuantity,
                    available: Math.max(0, newQuantity - currentInventory.reserved),
                    lastUpdated: new Date()
                }
            });
            await index_1.prisma.inventoryMovement.create({
                data: {
                    productId,
                    type,
                    quantity,
                    previousQuantity,
                    newQuantity,
                    reason,
                    userId
                }
            });
            return { productId, success: true, newQuantity };
        }));
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        res.json({
            success: true,
            data: {
                successful,
                failed,
                total: updates.length,
                results: results.map(result => result.status === 'fulfilled' ? result.value : { error: result.reason })
            }
        });
    }
    catch (error) {
        console.error('Bulk update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update inventory'
        });
    }
};
exports.bulkUpdateInventory = bulkUpdateInventory;
const getInventoryReport = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        const where = {
            product: {
                isActive: true,
                hasInventory: true
            }
        };
        if (category) {
            where.product.categoryId = category;
        }
        const inventory = await index_1.prisma.inventory.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        basePrice: true,
                        minStock: true,
                        maxStock: true,
                        unit: true,
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        const totalItems = inventory.length;
        const totalValue = inventory.reduce((sum, item) => {
            return sum + (item.quantity * Number(item.product.basePrice || 0));
        }, 0);
        const lowStockItems = inventory.filter(item => item.product.minStock > 0 && item.quantity <= item.product.minStock).length;
        const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
        const categoryStats = inventory.reduce((acc, item) => {
            const categoryName = item.product.category.name;
            if (!acc[categoryName]) {
                acc[categoryName] = {
                    count: 0,
                    totalQuantity: 0,
                    totalValue: 0,
                    lowStock: 0,
                    outOfStock: 0
                };
            }
            acc[categoryName].count++;
            acc[categoryName].totalQuantity += item.quantity;
            acc[categoryName].totalValue += item.quantity * Number(item.product.basePrice || 0);
            if (item.product.minStock > 0 && item.quantity <= item.product.minStock) {
                acc[categoryName].lowStock++;
            }
            if (item.quantity === 0) {
                acc[categoryName].outOfStock++;
            }
            return acc;
        }, {});
        res.json({
            success: true,
            data: {
                summary: {
                    totalItems,
                    totalValue,
                    lowStockItems,
                    outOfStockItems
                },
                categoryStats,
                inventory: inventory.map(item => ({
                    ...item,
                    isLowStock: item.product.minStock > 0 && item.quantity <= item.product.minStock,
                    isOutOfStock: item.quantity === 0,
                    value: item.quantity * Number(item.product.basePrice || 0)
                }))
            }
        });
    }
    catch (error) {
        console.error('Get inventory report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate inventory report'
        });
    }
};
exports.getInventoryReport = getInventoryReport;
//# sourceMappingURL=inventoryController.js.map