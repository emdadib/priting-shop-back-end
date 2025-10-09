"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPhotocopyLedger = exports.getPhotocopyOrder = exports.createPhotocopyOrder = exports.getPhotocopyProducts = void 0;
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const getPhotocopyProducts = async (req, res) => {
    try {
        console.log('Fetching photocopy products...');
        const photocopyCategory = await index_1.prisma.category.findFirst({
            where: { name: 'Photocopy Services' }
        });
        console.log('Photocopy category:', photocopyCategory);
        if (!photocopyCategory) {
            console.log('Photocopy category not found, creating it...');
            const newCategory = await index_1.prisma.category.create({
                data: {
                    name: 'Photocopy Services',
                    description: 'Photocopy and printing services',
                    sortOrder: 100
                }
            });
            console.log('Created photocopy category:', newCategory);
        }
        const products = await index_1.prisma.product.findMany({
            where: {
                categoryId: photocopyCategory?.id,
                isActive: true
            },
            include: {
                inventory: {
                    select: {
                        quantity: true,
                        available: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        console.log('Found products:', products.length);
        res.json({
            success: true,
            data: products
        });
    }
    catch (error) {
        console.error('Get photocopy products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch photocopy products',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPhotocopyProducts = getPhotocopyProducts;
const createPhotocopyOrder = async (req, res) => {
    try {
        const { oneSidedCopies, bothSidedCopies, customerName, customerPhone, discountAmount = 0 } = req.body;
        if (!oneSidedCopies && !bothSidedCopies) {
            return res.status(400).json({
                success: false,
                message: 'Please specify at least one copy type'
            });
        }
        const photocopyCategory = await index_1.prisma.category.findFirst({
            where: { name: 'Photocopy Services' }
        });
        if (!photocopyCategory) {
            return res.status(404).json({
                success: false,
                message: 'Photocopy services not found'
            });
        }
        const products = await index_1.prisma.product.findMany({
            where: {
                categoryId: photocopyCategory.id,
                isActive: true
            }
        });
        const oneSidedProduct = products.find(p => p.name.includes('১ পৃষ্ঠা'));
        const bothSidedProduct = products.find(p => p.name.includes('উভয় পৃষ্ঠা'));
        const photocopyPageProduct = products.find(p => p.name.toLowerCase().includes('photocopy page'));
        if (!oneSidedProduct || !bothSidedProduct || !photocopyPageProduct) {
            return res.status(404).json({
                success: false,
                message: 'Required photocopy products not found'
            });
        }
        const totalPages = (oneSidedCopies || 0) + (bothSidedCopies || 0);
        const orderItems = [];
        if (oneSidedCopies > 0) {
            orderItems.push({
                productId: oneSidedProduct.id,
                quantity: oneSidedCopies,
                unitPrice: oneSidedProduct.basePrice,
                costPrice: oneSidedProduct.baseCostPrice,
                discount: 0,
                taxAmount: 0,
                total: oneSidedCopies * Number(oneSidedProduct.basePrice)
            });
        }
        if (bothSidedCopies > 0) {
            orderItems.push({
                productId: bothSidedProduct.id,
                quantity: bothSidedCopies,
                unitPrice: bothSidedProduct.basePrice,
                costPrice: bothSidedProduct.baseCostPrice,
                discount: 0,
                taxAmount: 0,
                total: bothSidedCopies * Number(bothSidedProduct.basePrice)
            });
        }
        if (totalPages > 0) {
            orderItems.push({
                productId: photocopyPageProduct.id,
                quantity: totalPages,
                unitPrice: photocopyPageProduct.basePrice,
                costPrice: photocopyPageProduct.baseCostPrice,
                discount: 0,
                taxAmount: 0,
                total: totalPages * Number(photocopyPageProduct.basePrice)
            });
        }
        const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
        const finalDiscountAmount = Math.min(discountAmount, subtotal);
        const total = Math.max(0, subtotal - finalDiscountAmount);
        let customer = null;
        if (customerName || customerPhone) {
            if (customerPhone) {
                customer = await index_1.prisma.customer.findFirst({
                    where: {
                        phone: customerPhone
                    }
                });
            }
            if (!customer) {
                customer = await index_1.prisma.customer.create({
                    data: {
                        firstName: customerName || 'Walk-in',
                        lastName: 'Customer',
                        phone: customerPhone || 'WALK-IN',
                        email: `walk-in-${Date.now()}@temp.com`,
                        isWalkIn: true
                    }
                });
            }
        }
        let systemUser = await index_1.prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
        if (!systemUser) {
            systemUser = await index_1.prisma.user.findFirst();
        }
        if (!systemUser) {
            return res.status(500).json({
                success: false,
                message: 'No system user found'
            });
        }
        const orderCount = await index_1.prisma.order.count();
        const orderNumber = `PHOTO-${String(orderCount + 1).padStart(6, '0')}`;
        const order = await index_1.prisma.order.create({
            data: {
                orderNumber,
                customerId: customer?.id,
                userId: systemUser.id,
                status: 'COMPLETED',
                type: 'SALE',
                orderType: 'RETAIL',
                subtotal,
                taxAmount: 0,
                discountAmount: finalDiscountAmount,
                total,
                notes: `Photocopy Order - 1-sided: ${oneSidedCopies || 0}, 2-sided: ${bothSidedCopies || 0}${finalDiscountAmount > 0 ? `, Discount: ${finalDiscountAmount}` : ''}`,
                completedAt: new Date(),
                items: {
                    create: orderItems
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                sku: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                }
            }
        });
        if (totalPages > 0) {
            const inventory = await index_1.prisma.inventory.findUnique({
                where: { productId: photocopyPageProduct.id }
            });
            if (inventory) {
                const newQuantity = inventory.quantity - totalPages;
                const newAvailable = inventory.available - totalPages;
                await index_1.prisma.inventory.update({
                    where: { productId: photocopyPageProduct.id },
                    data: {
                        quantity: newQuantity,
                        available: newAvailable
                    }
                });
                await index_1.prisma.inventoryMovement.create({
                    data: {
                        productId: photocopyPageProduct.id,
                        type: 'SALE',
                        quantity: -totalPages,
                        previousQuantity: inventory.quantity,
                        newQuantity,
                        reason: `Photocopy order ${orderNumber}`,
                        reference: orderNumber,
                        userId: systemUser.id
                    }
                });
            }
        }
        await index_1.prisma.payment.create({
            data: {
                orderId: order.id,
                amount: total,
                method: 'CASH',
                status: 'COMPLETED',
                processedAt: new Date(),
                notes: 'Photocopy service - paid immediately',
                userId: systemUser.id
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: systemUser.id,
            action: 'CREATE',
            entity: 'ORDER',
            entityId: order.id,
            newValues: {
                orderNumber,
                type: 'PHOTOCOPY',
                total,
                oneSidedCopies,
                bothSidedCopies
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                subtotal,
                discountAmount: finalDiscountAmount,
                total,
                oneSidedCopies: oneSidedCopies || 0,
                bothSidedCopies: bothSidedCopies || 0,
                totalPages,
                items: order.items,
                customer: order.customer
            }
        });
    }
    catch (error) {
        console.error('Create photocopy order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create photocopy order'
        });
    }
};
exports.createPhotocopyOrder = createPhotocopyOrder;
const getPhotocopyOrder = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const order = await index_1.prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                sku: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true
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
        console.error('Get photocopy order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};
exports.getPhotocopyOrder = getPhotocopyOrder;
const getPhotocopyLedger = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }
        const whereClause = {
            orderNumber: {
                startsWith: 'PHOTO-'
            }
        };
        if (Object.keys(dateFilter).length > 0) {
            whereClause.createdAt = dateFilter;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, totalCount] = await Promise.all([
            index_1.prisma.order.findMany({
                where: whereClause,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    sku: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phone: true
                        }
                    },
                    user: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.order.count({
                where: whereClause
            })
        ]);
        const summary = await index_1.prisma.order.aggregate({
            where: whereClause,
            _sum: {
                subtotal: true,
                discountAmount: true,
                total: true
            },
            _count: {
                id: true
            }
        });
        const photocopyStats = await index_1.prisma.orderItem.aggregate({
            where: {
                order: {
                    orderNumber: {
                        startsWith: 'PHOTO-'
                    },
                    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
                },
                product: {
                    name: {
                        in: ['১ পৃষ্ঠা (1 Side)', 'উভয় পৃষ্ঠা (Both Side)']
                    }
                }
            },
            _sum: {
                quantity: true
            }
        });
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / Number(limit))
                },
                summary: {
                    totalOrders: summary._count.id,
                    totalSubtotal: summary._sum.subtotal || 0,
                    totalDiscount: summary._sum.discountAmount || 0,
                    totalAmount: summary._sum.total || 0,
                    totalCopies: photocopyStats._sum.quantity || 0
                }
            }
        });
    }
    catch (error) {
        console.error('Get photocopy ledger error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch photocopy ledger'
        });
    }
};
exports.getPhotocopyLedger = getPhotocopyLedger;
//# sourceMappingURL=photocopyController.js.map