"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMultipleSKUs = exports.validateSKU = exports.getSKUStats = exports.generateSKU = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getAllCategories = exports.bulkUpdateProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductSummary = exports.getProductsByType = exports.getProductsByCategory = exports.searchProducts = exports.getProductById = exports.getAllProducts = void 0;
const index_1 = require("../index");
const auditLogger_1 = require("../utils/auditLogger");
const skuGenerator_1 = __importDefault(require("../utils/skuGenerator"));
const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category, type, isActive } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            where.categoryId = category;
        }
        if (type) {
            where.type = type;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
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
                    },
                    inventory: {
                        select: {
                            quantity: true,
                            available: true,
                            reserved: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.product.count({ where })
        ]);
        res.json({
            success: true,
            data: products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};
exports.getAllProducts = getAllProducts;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await index_1.prisma.product.findUnique({
            where: { id },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                inventory: {
                    select: {
                        quantity: true,
                        available: true,
                        reserved: true,
                        lastUpdated: true
                    }
                },
                priceHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        oldPrice: true,
                        newPrice: true,
                        reason: true,
                        createdAt: true
                    }
                }
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
};
exports.getProductById = getProductById;
const searchProducts = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const products = await index_1.prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } },
                    { barcode: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } }
                ],
                isActive: true
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                inventory: {
                    select: {
                        quantity: true,
                        available: true
                    }
                }
            },
            orderBy: { name: 'asc' },
            take: Number(limit)
        });
        res.json({
            success: true,
            data: products
        });
    }
    catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search products'
        });
    }
};
exports.searchProducts = searchProducts;
const getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            index_1.prisma.product.findMany({
                where: {
                    categoryId,
                    isActive: true
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    inventory: {
                        select: {
                            quantity: true,
                            available: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.product.count({
                where: {
                    categoryId,
                    isActive: true
                }
            })
        ]);
        res.json({
            success: true,
            data: products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products by category'
        });
    }
};
exports.getProductsByCategory = getProductsByCategory;
const getProductsByType = async (req, res) => {
    try {
        const { type, page = 1, limit = 20, search, category } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true
        };
        if (type === 'stock') {
            where.hasInventory = true;
        }
        else if (type === 'made-to-order') {
            where.hasInventory = false;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
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
                    },
                    inventory: {
                        select: {
                            quantity: true,
                            available: true,
                            reserved: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: Number(limit)
            }),
            index_1.prisma.product.count({ where })
        ]);
        const productsWithType = products.map(product => ({
            ...product,
            productType: product.hasInventory ? 'stock' : 'made-to-order',
            stockInfo: product.hasInventory ? {
                quantity: product.inventory?.quantity || 0,
                available: product.inventory?.available || 0,
                reserved: product.inventory?.reserved || 0,
                status: (product.inventory?.quantity || 0) > 0 ? 'In Stock' : 'Out of Stock'
            } : {
                quantity: 0,
                available: 0,
                reserved: 0,
                status: 'Made to Order'
            }
        }));
        res.json({
            success: true,
            data: productsWithType,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Get products by type error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};
exports.getProductsByType = getProductsByType;
const getProductSummary = async (req, res) => {
    try {
        const [stockProducts, madeToOrderProducts] = await Promise.all([
            index_1.prisma.product.count({
                where: {
                    isActive: true,
                    hasInventory: true
                }
            }),
            index_1.prisma.product.count({
                where: {
                    isActive: true,
                    hasInventory: false
                }
            })
        ]);
        const totalProducts = stockProducts + madeToOrderProducts;
        res.json({
            success: true,
            data: {
                total: totalProducts,
                stock: {
                    count: stockProducts,
                    percentage: totalProducts > 0 ? Math.round((stockProducts / totalProducts) * 100) : 0
                },
                madeToOrder: {
                    count: madeToOrderProducts,
                    percentage: totalProducts > 0 ? Math.round((madeToOrderProducts / totalProducts) * 100) : 0
                }
            }
        });
    }
    catch (error) {
        console.error('Get product summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product summary'
        });
    }
};
exports.getProductSummary = getProductSummary;
const createProduct = async (req, res) => {
    try {
        const { name, description, sku, barcode, categoryId, type, basePrice, baseCostPrice, taxRate = 0, isService = false, hasInventory = true, minStock = 0, maxStock, unit = 'piece', weight, dimensions, imageUrl, specifications } = req.body;
        const existingProduct = await index_1.prisma.product.findUnique({
            where: { sku }
        });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Product with this SKU already exists'
            });
        }
        if (barcode) {
            const existingBarcode = await index_1.prisma.product.findUnique({
                where: { barcode }
            });
            if (existingBarcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this barcode already exists'
                });
            }
        }
        const product = await index_1.prisma.product.create({
            data: {
                name,
                description,
                sku,
                barcode,
                categoryId,
                type,
                basePrice,
                baseCostPrice,
                taxRate,
                isService,
                hasInventory,
                minStock,
                maxStock,
                unit,
                weight,
                dimensions,
                imageUrl,
                specifications
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (hasInventory) {
            await index_1.prisma.inventory.create({
                data: {
                    productId: product.id,
                    quantity: 0,
                    reserved: 0,
                    available: 0
                }
            });
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'CREATE',
            entity: 'PRODUCT',
            entityId: product.id,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log('Update product request:', { id, updateData });
        const existingProduct = await index_1.prisma.product.findUnique({
            where: { id }
        });
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        if (updateData.sku && updateData.sku !== existingProduct.sku) {
            const existingSku = await index_1.prisma.product.findUnique({
                where: { sku: updateData.sku }
            });
            if (existingSku) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this SKU already exists'
                });
            }
        }
        const newBarcode = updateData.barcode && updateData.barcode.trim() !== '' ? updateData.barcode.trim() : null;
        const currentBarcode = existingProduct.barcode && existingProduct.barcode.trim() !== '' ? existingProduct.barcode.trim() : null;
        console.log('Barcode validation:', {
            newBarcode,
            currentBarcode,
            originalNewBarcode: updateData.barcode,
            originalCurrentBarcode: existingProduct.barcode
        });
        if (newBarcode && newBarcode !== currentBarcode) {
            const existingBarcode = await index_1.prisma.product.findUnique({
                where: { barcode: newBarcode }
            });
            if (existingBarcode) {
                return res.status(400).json({
                    success: false,
                    message: 'A product with this barcode already exists'
                });
            }
        }
        if (updateData.basePrice && updateData.basePrice !== existingProduct.basePrice) {
            console.log('Creating price history record...');
            await index_1.prisma.priceHistory.create({
                data: {
                    productId: id,
                    oldPrice: existingProduct.basePrice,
                    newPrice: updateData.basePrice,
                    reason: updateData.priceChangeReason || 'Manual update',
                    userId: req.user?.id || 'unknown'
                }
            });
            console.log('Price history record created successfully');
        }
        let updatedProduct;
        try {
            const processedUpdateData = {
                ...updateData,
                barcode: updateData.barcode && updateData.barcode.trim() !== '' ? updateData.barcode.trim() : null
            };
            console.log('Updating product with data:', processedUpdateData);
            updatedProduct = await index_1.prisma.product.update({
                where: { id },
                data: processedUpdateData,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            console.log('Product updated successfully');
        }
        catch (error) {
            console.log('Prisma update error:', error);
            if (error.code === 'P2002') {
                const field = error.meta?.target?.[0];
                console.log('Unique constraint violation on field:', field);
                if (field === 'barcode') {
                    return res.status(400).json({
                        success: false,
                        message: 'A product with this barcode already exists'
                    });
                }
                else if (field === 'sku') {
                    return res.status(400).json({
                        success: false,
                        message: 'A product with this SKU already exists'
                    });
                }
                else {
                    return res.status(400).json({
                        success: false,
                        message: `A product with this ${field} already exists`
                    });
                }
            }
            throw error;
        }
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'UPDATE',
            entity: 'PRODUCT',
            entityId: id,
            oldValues: existingProduct,
            newValues: updateData,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedProduct
        });
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await index_1.prisma.product.findUnique({
            where: { id }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const orderItems = await index_1.prisma.orderItem.findFirst({
            where: { productId: id }
        });
        if (orderItems) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete product that has been used in orders'
            });
        }
        await index_1.prisma.product.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'DELETE',
            entity: 'PRODUCT',
            entityId: id,
            oldValues: product,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
};
exports.deleteProduct = deleteProduct;
const bulkUpdateProducts = async (req, res) => {
    try {
        const { products } = req.body;
        const results = await Promise.allSettled(products.map(async (productData) => {
            const { id, ...updateData } = productData;
            return await index_1.prisma.product.update({
                where: { id },
                data: updateData
            });
        }));
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        res.json({
            success: true,
            data: {
                successful,
                failed,
                total: products.length
            }
        });
    }
    catch (error) {
        console.error('Bulk update products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update products'
        });
    }
};
exports.bulkUpdateProducts = bulkUpdateProducts;
const getAllCategories = async (req, res) => {
    try {
        const categories = await index_1.prisma.category.findMany({
            where: { isActive: true },
            include: {
                children: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                _count: {
                    select: {
                        products: true
                    }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ]
        });
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error('Get all categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};
exports.getAllCategories = getAllCategories;
const createCategory = async (req, res) => {
    try {
        const { name, description, parentId, sortOrder = 0 } = req.body;
        console.log('Creating category with data:', { name, description, parentId, sortOrder });
        const category = await index_1.prisma.category.create({
            data: {
                name,
                description,
                parentId: parentId || null,
                sortOrder: sortOrder || 0
            }
        });
        console.log('Category created successfully:', category);
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'CREATE',
            entity: 'CATEGORY',
            entityId: category.id,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: category
        });
    }
    catch (error) {
        console.error('Create category error:', error);
        console.error('Error details:', {
            message: error?.message,
            code: error?.code,
            meta: error?.meta
        });
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error?.message
        });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const existingCategory = await index_1.prisma.category.findUnique({
            where: { id }
        });
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        const category = await index_1.prisma.category.update({
            where: { id },
            data: updateData
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'UPDATE',
            entity: 'CATEGORY',
            entityId: id,
            oldValues: existingCategory,
            newValues: updateData,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: category
        });
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await index_1.prisma.category.findUnique({
            where: { id },
            include: {
                children: true,
                products: true
            }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        if (category.children.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with subcategories'
            });
        }
        if (category.products.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with products'
            });
        }
        await index_1.prisma.category.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id,
            action: 'DELETE',
            entity: 'CATEGORY',
            entityId: id,
            oldValues: category,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};
exports.deleteCategory = deleteCategory;
const generateSKU = async (req, res) => {
    try {
        const { categoryId, customPrefix } = req.body;
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }
        const category = await index_1.prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        const sku = await skuGenerator_1.default.generateSKU({
            categoryId: category.id,
            categoryName: category.name,
            customPrefix
        });
        res.json({
            success: true,
            data: { sku }
        });
    }
    catch (error) {
        console.error('Generate SKU error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate SKU'
        });
    }
};
exports.generateSKU = generateSKU;
const getSKUStats = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }
        const stats = await skuGenerator_1.default.getSKUStats(categoryId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Get SKU stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SKU statistics'
        });
    }
};
exports.getSKUStats = getSKUStats;
const validateSKU = async (req, res) => {
    try {
        const { sku, excludeId } = req.body;
        if (!sku) {
            return res.status(400).json({
                success: false,
                message: 'SKU is required'
            });
        }
        const isUnique = await skuGenerator_1.default.isSKUUnique(sku, excludeId);
        res.json({
            success: true,
            data: { isUnique, sku }
        });
    }
    catch (error) {
        console.error('Validate SKU error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate SKU'
        });
    }
};
exports.validateSKU = validateSKU;
const generateMultipleSKUs = async (req, res) => {
    try {
        const { categoryId, count, customPrefix } = req.body;
        if (!categoryId || !count) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and count are required'
            });
        }
        if (count > 100) {
            return res.status(400).json({
                success: false,
                message: 'Cannot generate more than 100 SKUs at once'
            });
        }
        const category = await index_1.prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        const skus = await skuGenerator_1.default.generateMultipleSKUs({
            categoryId: category.id,
            categoryName: category.name,
            customPrefix
        }, count);
        res.json({
            success: true,
            data: { skus, count: skus.length }
        });
    }
    catch (error) {
        console.error('Generate multiple SKUs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate multiple SKUs'
        });
    }
};
exports.generateMultipleSKUs = generateMultipleSKUs;
//# sourceMappingURL=productController.js.map