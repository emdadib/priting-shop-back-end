"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWarrantyStats = exports.updateWarranty = exports.createWarranty = exports.getWarrantyById = exports.getAllWarranties = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllWarranties = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority, customerId, productId, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (priority) {
            where.priority = priority;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        if (productId) {
            where.productId = productId;
        }
        if (search) {
            where.OR = [
                { warrantyNumber: { contains: search, mode: 'insensitive' } },
                { issueDescription: { contains: search, mode: 'insensitive' } },
                { customer: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } }
                        ]
                    } },
                { product: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }
        const [warranties, total] = await Promise.all([
            prisma.warranty.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            hasWarranty: true,
                            warrantyPeriod: true
                        }
                    },
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            createdAt: true
                        }
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    assignedToUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    replacementProduct: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.warranty.count({ where })
        ]);
        res.json({
            success: true,
            data: warranties,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get warranties error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch warranties'
        });
    }
};
exports.getAllWarranties = getAllWarranties;
const getWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;
        const warranty = await prisma.warranty.findUnique({
            where: { id },
            include: {
                product: true,
                customer: true,
                order: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                createdByUser: true,
                assignedToUser: true,
                replacementProduct: true
            }
        });
        if (!warranty) {
            return res.status(404).json({
                success: false,
                message: 'Warranty not found'
            });
        }
        res.json({
            success: true,
            data: warranty
        });
    }
    catch (error) {
        console.error('Get warranty by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch warranty'
        });
    }
};
exports.getWarrantyById = getWarrantyById;
const createWarranty = async (req, res) => {
    try {
        const { productId, orderId, customerId, issueDescription, priority = 'MEDIUM', notes } = req.body;
        const userId = req.user.id;
        const warrantyNumber = `WAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { hasWarranty: true, warrantyPeriod: true, name: true }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        if (!product.hasWarranty) {
            return res.status(400).json({
                success: false,
                message: 'This product does not have warranty coverage'
            });
        }
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { createdAt: true }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        if (product.warrantyPeriod) {
            const warrantyExpiryDate = new Date(order.createdAt);
            warrantyExpiryDate.setDate(warrantyExpiryDate.getDate() + product.warrantyPeriod);
            if (new Date() > warrantyExpiryDate) {
                return res.status(400).json({
                    success: false,
                    message: `Warranty has expired. Warranty period was ${product.warrantyPeriod} days from order date.`
                });
            }
        }
        const warranty = await prisma.warranty.create({
            data: {
                productId,
                orderId,
                customerId,
                warrantyNumber,
                issueDescription,
                priority,
                notes,
                createdBy: userId,
                status: 'OPEN'
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                order: {
                    select: {
                        id: true,
                        orderNumber: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'CREATE',
            entity: 'WARRANTY',
            entityId: warranty.id,
            newValues: { productId, orderId, customerId, issueDescription, priority },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: warranty
        });
    }
    catch (error) {
        console.error('Create warranty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create warranty'
        });
    }
};
exports.createWarranty = createWarranty;
const updateWarranty = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, resolution, replacementProductId, refundAmount, notes, assignedTo } = req.body;
        const userId = req.user.id;
        const existingWarranty = await prisma.warranty.findUnique({
            where: { id }
        });
        if (!existingWarranty) {
            return res.status(404).json({
                success: false,
                message: 'Warranty not found'
            });
        }
        const updateData = {};
        if (status)
            updateData.status = status;
        if (priority)
            updateData.priority = priority;
        if (resolution)
            updateData.resolution = resolution;
        if (replacementProductId)
            updateData.replacementProductId = replacementProductId;
        if (refundAmount !== undefined)
            updateData.refundAmount = parseFloat(refundAmount);
        if (notes)
            updateData.notes = notes;
        if (assignedTo)
            updateData.assignedTo = assignedTo;
        if (status === 'RESOLVED' || status === 'CLOSED') {
            updateData.resolvedDate = new Date();
        }
        const updatedWarranty = await prisma.warranty.update({
            where: { id },
            data: updateData,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                order: {
                    select: {
                        id: true,
                        orderNumber: true
                    }
                },
                assignedToUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                replacementProduct: {
                    select: {
                        id: true,
                        name: true,
                        sku: true
                    }
                }
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId,
            action: 'UPDATE',
            entity: 'WARRANTY',
            entityId: id,
            oldValues: existingWarranty,
            newValues: updateData,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedWarranty
        });
    }
    catch (error) {
        console.error('Update warranty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update warranty'
        });
    }
};
exports.updateWarranty = updateWarranty;
const getWarrantyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const [totalWarranties, openWarranties, inProgressWarranties, resolvedWarranties, closedWarranties, rejectedWarranties, urgentWarranties] = await Promise.all([
            prisma.warranty.count({ where }),
            prisma.warranty.count({ where: { ...where, status: 'OPEN' } }),
            prisma.warranty.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.warranty.count({ where: { ...where, status: 'RESOLVED' } }),
            prisma.warranty.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.warranty.count({ where: { ...where, status: 'REJECTED' } }),
            prisma.warranty.count({ where: { ...where, priority: 'URGENT' } })
        ]);
        res.json({
            success: true,
            data: {
                total: totalWarranties,
                open: openWarranties,
                inProgress: inProgressWarranties,
                resolved: resolvedWarranties,
                closed: closedWarranties,
                rejected: rejectedWarranties,
                urgent: urgentWarranties
            }
        });
    }
    catch (error) {
        console.error('Get warranty stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch warranty statistics'
        });
    }
};
exports.getWarrantyStats = getWarrantyStats;
//# sourceMappingURL=warrantyController.js.map