"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMadeToOrderSummary = exports.getMadeToOrderProducts = void 0;
const index_1 = require("../index");
const getMadeToOrderProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true,
            hasInventory: false
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            where.categoryId = category;
        }
        const [products, total] = await Promise.all([
            index_1.prisma.product.findMany({
                where,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.product.count({ where })
        ]);
        const madeToOrderProducts = products.map(product => ({
            ...product,
            productType: 'made-to-order',
            workflow: {
                step1: 'Customer Order',
                step2: 'Collect from Wholesaler',
                step3: 'Process/Print',
                step4: 'Deliver to Customer'
            },
            requirements: {
                needsSpecifications: product.requiresSpecifications,
                customPricing: product.pricingModel === 'CUSTOM',
                leadTime: '2-3 days',
                minimumOrder: 1
            }
        }));
        res.json({
            success: true,
            data: madeToOrderProducts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get made-to-order products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch made-to-order products'
        });
    }
};
exports.getMadeToOrderProducts = getMadeToOrderProducts;
const getMadeToOrderSummary = async (req, res) => {
    try {
        const madeToOrderCount = await index_1.prisma.product.count({
            where: {
                isActive: true,
                hasInventory: false
            }
        });
        const stockCount = await index_1.prisma.product.count({
            where: {
                isActive: true,
                hasInventory: true
            }
        });
        const totalProducts = madeToOrderCount + stockCount;
        res.json({
            success: true,
            data: {
                summary: {
                    total: totalProducts,
                    madeToOrder: {
                        count: madeToOrderCount,
                        percentage: totalProducts > 0 ? Math.round((madeToOrderCount / totalProducts) * 100) : 0
                    },
                    stock: {
                        count: stockCount,
                        percentage: totalProducts > 0 ? Math.round((stockCount / totalProducts) * 100) : 0
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('Get made-to-order summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get summary'
        });
    }
};
exports.getMadeToOrderSummary = getMadeToOrderSummary;
//# sourceMappingURL=madeToOrderController.js.map