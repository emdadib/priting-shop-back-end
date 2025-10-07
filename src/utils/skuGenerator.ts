import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SKUGenerationOptions {
  categoryId: string;
  categoryName: string;
  productName?: string;
  customPrefix?: string;
}

export class SKUGenerator {
  /**
   * Generate a unique SKU based on category and auto-increment
   */
  static async generateSKU(options: SKUGenerationOptions): Promise<string> {
    const { categoryId, categoryName, customPrefix } = options;
    
    // Create prefix from category name or custom prefix
    const prefix = customPrefix || this.createPrefixFromCategory(categoryName);
    
    // Get the next number for this category
    const nextNumber = await this.getNextSKUNumber(prefix);
    
    // Format the SKU with leading zeros
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${prefix}-${formattedNumber}`;
  }

  /**
   * Create a prefix from category name
   */
  private static createPrefixFromCategory(categoryName: string): string {
    // Remove special characters and spaces, convert to uppercase
    const cleanName = categoryName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();
    
    // Take first 3-4 characters, or use full name if short
    if (cleanName.length <= 4) {
      return cleanName;
    }
    
    // For longer names, try to create meaningful abbreviations
    const words = categoryName.split(' ').filter(word => word.length > 0);
    if (words.length > 1) {
      // Use first letter of each word
      return words.map(word => word.charAt(0).toUpperCase()).join('').substring(0, 4);
    }
    
    // Use first 4 characters
    return cleanName.substring(0, 4);
  }

  /**
   * Get the next available number for a given prefix
   */
  private static async getNextSKUNumber(prefix: string): Promise<number> {
    try {
      // Find all products with SKUs that start with this prefix
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

      // Extract numbers from existing SKUs
      const numbers = products
        .map(product => {
          const match = product.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
          return match ? parseInt(match[1] || '0', 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0);

      // Return the next available number
      if (numbers.length === 0) {
        return 1;
      }

      return Math.max(...numbers) + 1;
    } catch (error) {
      console.error('Error getting next SKU number:', error);
      // Fallback to timestamp-based number if database query fails
      return Date.now() % 1000;
    }
  }

  /**
   * Validate if a SKU is unique
   */
  static async isSKUUnique(sku: string, excludeId?: string): Promise<boolean> {
    try {
      const whereClause: any = { sku };
      
      if (excludeId) {
        whereClause.id = { not: excludeId };
      }

      const existingProduct = await prisma.product.findFirst({
        where: whereClause
      });

      return !existingProduct;
    } catch (error) {
      console.error('Error checking SKU uniqueness:', error);
      return false;
    }
  }

  /**
   * Generate multiple SKUs for bulk operations
   */
  static async generateMultipleSKUs(
    options: SKUGenerationOptions, 
    count: number
  ): Promise<string[]> {
    const skus: string[] = [];
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

  /**
   * Suggest SKU based on product name and category
   */
  static async suggestSKU(options: SKUGenerationOptions): Promise<string> {
    return this.generateSKU(options);
  }

  /**
   * Get SKU statistics for a category
   */
  static async getSKUStats(categoryId: string): Promise<{
    totalProducts: number;
    lastSKU: string | null;
    nextSKU: string;
  }> {
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
    } catch (error) {
      console.error('Error getting SKU stats:', error);
      throw error;
    }
  }
}

export default SKUGenerator;
