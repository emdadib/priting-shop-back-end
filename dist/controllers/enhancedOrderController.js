"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomOrders = exports.updateProductPricingModel = exports.getProductPricingTiers = exports.createPricingTier = exports.getProductPricing = exports.createCustomOrder = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
const calculatePrice = async (productId, quantity, customUnitPrice) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            productPricingTiers: {
                where: { isActive: true },
                orderBy: { minQuantity: 'asc' }
            }
        }
    });
    if (!product) {
        throw new Error('Product not found');
    }
    let unitPrice;
    let costPrice;
    switch (product.pricingModel) {
        case 'FIXED':
            unitPrice = product.basePrice;
            costPrice = product.baseCostPrice;
            break;
        case 'VARIABLE':
            const tier = product.productPricingTiers.find(t => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity));
            if (tier) {
                unitPrice = tier.unitPrice;
                costPrice = tier.costPrice;
            }
            else {
                unitPrice = product.basePrice;
                costPrice = product.baseCostPrice;
            }
            break;
        case 'CUSTOM':
            if (customUnitPrice) {
                unitPrice = new library_1.Decimal(customUnitPrice);
                costPrice = product.baseCostPrice;
            }
            else {
                unitPrice = product.basePrice;
                costPrice = product.baseCostPrice;
            }
            break;
        case 'AREA_BASED':
            unitPrice = product.basePrice;
            costPrice = product.baseCostPrice;
            break;
        default:
            unitPrice = product.basePrice;
            costPrice = product.baseCostPrice;
    }
    return { unitPrice, costPrice };
};
const createCustomOrder = async (req, res) => {
    try {
        const { customerId, items, notes, dueDate, orderType = 'CUSTOM' } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        let subtotal = new library_1.Decimal(0);
        let totalTax = new library_1.Decimal(0);
        const orderItems = [];
        for (const item of items) {
            const { productId, quantity, unit, customUnitPrice, customDimensions, customRequirements, specifications, notes: itemNotes } = item;
            const { unitPrice, costPrice } = await calculatePrice(productId, quantity, customUnitPrice);
            const itemSubtotal = unitPrice.mul(quantity);
            const taxAmount = itemSubtotal.mul(new library_1.Decimal(0.05));
            const itemTotal = itemSubtotal.add(taxAmount);
            subtotal = subtotal.add(itemSubtotal);
            totalTax = totalTax.add(taxAmount);
            orderItems.push({
                productId,
                quantity,
                unit: unit || 'piece',
                unitPrice,
                costPrice,
                taxAmount,
                total: itemTotal,
                notes: itemNotes,
                customDimensions,
                customRequirements,
                specifications,
                isCustomPriced: !!customUnitPrice
            });
        }
        const total = subtotal.add(totalTax);
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId,
                userId,
                orderType,
                subtotal,
                taxAmount: totalTax,
                total,
                notes,
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });
        for (const item of orderItems) {
            await prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    ...item
                }
            });
        }
        const completeOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            message: 'Custom order created successfully',
            data: completeOrder
        });
    }
    catch (error) {
        console.error('Create custom order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create custom order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createCustomOrder = createCustomOrder;
const getProductPricing = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity = 1, customUnitPrice } = req.query;
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
                productPricingTiers: {
                    where: { isActive: true },
                    orderBy: { minQuantity: 'asc' }
                }
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const { unitPrice, costPrice } = await calculatePrice(productId, Number(quantity), customUnitPrice ? Number(customUnitPrice) : undefined);
        const subtotal = unitPrice.mul(Number(quantity));
        const taxAmount = subtotal.mul(new library_1.Decimal(0.05));
        const total = subtotal.add(taxAmount);
        res.json({
            success: true,
            data: {
                product,
                quantity: Number(quantity),
                unitPrice,
                costPrice,
                subtotal,
                taxAmount,
                total,
                pricingModel: product.pricingModel,
                availableTiers: product.productPricingTiers
            }
        });
    }
    catch (error) {
        console.error('Get product pricing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product pricing',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getProductPricing = getProductPricing;
const createPricingTier = async (req, res) => {
    try {
        const { productId } = req.params;
        const { minQuantity, maxQuantity, unitPrice, costPrice, discount = 0 } = req.body;
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const pricingTier = await prisma.productPricingTier.create({
            data: {
                productId: productId,
                minQuantity: Number(minQuantity),
                maxQuantity: maxQuantity ? Number(maxQuantity) : null,
                unitPrice: new library_1.Decimal(unitPrice),
                costPrice: new library_1.Decimal(costPrice),
                discount: new library_1.Decimal(discount)
            }
        });
        res.status(201).json({
            success: true,
            message: 'Pricing tier created successfully',
            data: pricingTier
        });
    }
    catch (error) {
        console.error('Create pricing tier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create pricing tier',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createPricingTier = createPricingTier;
const getProductPricingTiers = async (req, res) => {
    try {
        const { productId } = req.params;
        const pricingTiers = await prisma.productPricingTier.findMany({
            where: {
                productId,
                isActive: true
            },
            orderBy: { minQuantity: 'asc' }
        });
        res.json({
            success: true,
            data: pricingTiers
        });
    }
    catch (error) {
        console.error('Get pricing tiers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pricing tiers',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getProductPricingTiers = getProductPricingTiers;
const updateProductPricingModel = async (req, res) => {
    try {
        const { productId } = req.params;
        const { pricingModel, basePrice, baseCostPrice, isCustomOrder, requiresSpecifications } = req.body;
        const product = await prisma.product.update({
            where: { id: productId },
            data: {
                pricingModel,
                basePrice: basePrice ? new library_1.Decimal(basePrice) : undefined,
                baseCostPrice: baseCostPrice ? new library_1.Decimal(baseCostPrice) : undefined,
                isCustomOrder,
                requiresSpecifications
            }
        });
        res.json({
            success: true,
            message: 'Product pricing model updated successfully',
            data: product
        });
    }
    catch (error) {
        console.error('Update product pricing model error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product pricing model',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateProductPricingModel = updateProductPricingModel;
const getCustomOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, orderType } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status)
            where.status = status;
        if (orderType)
            where.orderType = orderType;
        const orders = await prisma.order.findMany({
            where,
            include: {
                customer: true,
                user: true,
                items: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        });
        const total = await prisma.order.count({ where });
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get custom orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get custom orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getCustomOrders = getCustomOrders;
//# sourceMappingURL=enhancedOrderController.js.map