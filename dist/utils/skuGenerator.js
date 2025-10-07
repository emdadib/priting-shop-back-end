"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKUGenerator = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SKUGenerator {
    static async generateSKU(options) {
        const { categoryId, categoryName, customPrefix } = options;
        const prefix = customPrefix || this.createPrefixFromCategory(categoryName);
        const nextNumber = await this.getNextSKUNumber(prefix);
        const formattedNumber = nextNumber.toString().padStart(3, '0');
        return `${prefix}-${formattedNumber}`;
    }
    static createPrefixFromCategory(categoryName) {
        const cleanName = categoryName
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .toUpperCase();
        if (cleanName.length <= 4) {
            return cleanName;
        }
        const words = categoryName.split(' ').filter(word => word.length > 0);
        if (words.length > 1) {
            return words.map(word => word.charAt(0).toUpperCase()).join('').substring(0, 4);
        }
        return cleanName.substring(0, 4);
    }
    static async getNextSKUNumber(prefix) {
        try {
            const products = await prisma.product.findMany({
                where: {
                    sku: {
                        startsWith: prefix + '-'
                    }
                },
                select: {
                    sku: true
                }
            });
            const numbers = products
                .map(product => {
                const match = product.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
                return match ? parseInt(match[1] || '0', 10) : 0;
            })
                .filter(num => !isNaN(num) && num > 0);
            if (numbers.length === 0) {
                return 1;
            }
            return Math.max(...numbers) + 1;
        }
        catch (error) {
            console.error('Error getting next SKU number:', error);
            return Date.now() % 1000;
        }
    }
    static async isSKUUnique(sku, excludeId) {
        try {
            const whereClause = { sku };
            if (excludeId) {
                whereClause.id = { not: excludeId };
            }
            const existingProduct = await prisma.product.findFirst({
                where: whereClause
            });
            return !existingProduct;
        }
        catch (error) {
            console.error('Error checking SKU uniqueness:', error);
            return false;
        }
    }
    static async generateMultipleSKUs(options, count) {
        const skus = [];
        const { categoryId, categoryName, customPrefix } = options;
        const prefix = customPrefix || this.createPrefixFromCategory(categoryName);
        const nextNumber = await this.getNextSKUNumber(prefix);
        for (let i = 0; i < count; i++) {
            const number = nextNumber + i;
            const formattedNumber = number.toString().padStart(3, '0');
            skus.push(`${prefix}-${formattedNumber}`);
        }
        return skus;
    }
    static async suggestSKU(options) {
        return this.generateSKU(options);
    }
    static async getSKUStats(categoryId) {
        try {
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
                select: { name: true }
            });
            if (!category) {
                throw new Error('Category not found');
            }
            const prefix = this.createPrefixFromCategory(category.name);
            const products = await prisma.product.findMany({
                where: {
                    categoryId,
                    sku: {
                        startsWith: prefix + '-'
                    }
                },
                select: {
                    sku: true
                },
                orderBy: {
                    sku: 'desc'
                }
            });
            const totalProducts = products.length;
            const lastSKU = products.length > 0 ? products[0]?.sku || null : null;
            const nextSKU = await this.generateSKU({ categoryId, categoryName: category.name });
            return {
                totalProducts,
                lastSKU,
                nextSKU
            };
        }
        catch (error) {
            console.error('Error getting SKU stats:', error);
            throw error;
        }
    }
}
exports.SKUGenerator = SKUGenerator;
exports.default = SKUGenerator;
//# sourceMappingURL=skuGenerator.js.map