import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';
import SKUGenerator from '../utils/skuGenerator';

// Get all products with pagination and filters
export const getAllProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      type,
      isActive
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.categoryId = category as string;
    }
    
    if (type) {
      where.type = type as string;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
      prisma.product.count({ where })
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
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
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
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

// Search products
export const searchProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { q, limit = 20 } = req.query;

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q as string, mode: 'insensitive' } },
          { sku: { contains: q as string, mode: 'insensitive' } },
          { barcode: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } }
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
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
      prisma.product.count({
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
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category'
    });
  }
};

// Get products by type (stock vs made-to-order)
export const getProductsByType = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { type, page = 1, limit = 20, search, category } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      isActive: true
    };
    
    // Filter by product type
    if (type === 'stock') {
      where.hasInventory = true;
    } else if (type === 'made-to-order') {
      where.hasInventory = false;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.categoryId = category as string;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
      prisma.product.count({ where })
    ]);

    // Add product type information
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
  } catch (error) {
    console.error('Get products by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Get product summary by type
export const getProductSummary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const [stockProducts, madeToOrderProducts] = await Promise.all([
      prisma.product.count({
        where: { 
          isActive: true,
          hasInventory: true 
        }
      }),
      prisma.product.count({
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
  } catch (error) {
    console.error('Get product summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product summary'
    });
  }
};

// Create new product
export const createProduct = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    console.log('Create product request received:', {
      body: req.body,
      user: req.user?.id,
      role: req.user?.role
    });

    const {
      name,
      description,
      sku,
      barcode,
      categoryId,
      type,
      basePrice,
      baseCostPrice,
      taxRate = 0,
      isService = false,
      hasInventory = true,
      minStock = 0,
      maxStock,
      unit = 'piece',
      weight,
      dimensions,
      imageUrl,
      specifications
    } = req.body;

    // Validate required fields
    if (!name || !sku || !categoryId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, sku, categoryId, and type are required'
      });
    }

    if (basePrice === undefined || basePrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Base price is required'
      });
    }

    if (baseCostPrice === undefined || baseCostPrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Base cost price is required'
      });
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Normalize barcode: convert empty strings to null
    const normalizedBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : null;

    // Check if barcode already exists (only if barcode is provided and not empty)
    if (normalizedBarcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: normalizedBarcode }
      });

      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'Product with this barcode already exists'
        });
      }
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Please select a valid category.'
      });
    }

    if (!category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The selected category is inactive. Please select an active category.'
      });
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        barcode: normalizedBarcode, // Use normalized barcode (null for empty strings)
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

    // Create inventory record if product has inventory
    if (hasInventory) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity: 0,
          reserved: 0,
          available: 0
        }
      });
    }

    // Create audit log
    await createAuditLog({
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
  } catch (error: any) {
    console.error('Create product error:', error);
    
    // Handle Prisma errors
    if (error.code) {
      switch (error.code) {
        case 'P2002':
          // Unique constraint violation
          const target = error.meta?.target;
          if (target && target.includes('sku')) {
            return res.status(400).json({
              success: false,
              message: 'Product with this SKU already exists'
            });
          }
          if (target && target.includes('barcode')) {
            return res.status(400).json({
              success: false,
              message: 'Product with this barcode already exists'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'A product with these details already exists'
          });
        
        case 'P2003':
          // Foreign key constraint violation
          if (error.meta?.field_name?.includes('categoryId')) {
            return res.status(400).json({
              success: false,
              message: 'Invalid category. Please select a valid category.'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'Invalid reference. Please check your input data.'
          });
        
        case 'P2012':
          // Required value missing
          return res.status(400).json({
            success: false,
            message: error.meta?.reason || 'Required fields are missing'
          });
        
        default:
          console.error('Prisma error code:', error.code, error);
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message || 'Validation failed'
      });
    }
    
    // Generic error response
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Failed to create product. Please check your input and try again.'
      : error.message || 'Failed to create product';
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && { error: error.message, stack: error.stack })
    });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Update product request:', { id, updateData });

    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if SKU is being changed and if it already exists
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: updateData.sku }
      });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    // Check if barcode is being changed and if it already exists
    const newBarcode = updateData.barcode && updateData.barcode.trim() !== '' ? updateData.barcode.trim() : null;
    const currentBarcode = existingProduct.barcode && existingProduct.barcode.trim() !== '' ? existingProduct.barcode.trim() : null;
    
    console.log('Barcode validation:', { 
      newBarcode, 
      currentBarcode, 
      originalNewBarcode: updateData.barcode,
      originalCurrentBarcode: existingProduct.barcode 
    });
    
    // Only check for duplicates if we have a new barcode that's different from the current one
    if (newBarcode && newBarcode !== currentBarcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: newBarcode }
      });

      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'A product with this barcode already exists'
        });
      }
    }

    // Check if price is being changed
    if (updateData.basePrice && updateData.basePrice !== existingProduct.basePrice) {
      console.log('Creating price history record...');
      // Create price history record
      await prisma.priceHistory.create({
        data: {
          productId: id!,
          oldPrice: existingProduct.basePrice,
          newPrice: updateData.basePrice,
          reason: updateData.priceChangeReason || 'Manual update',
          userId: req.user?.id || 'unknown'
        }
      });
      console.log('Price history record created successfully');
    }

    // Update product
    let updatedProduct;
    try {
      // Convert empty strings to null for fields that have unique constraints
      const processedUpdateData = {
        ...updateData,
        barcode: updateData.barcode && updateData.barcode.trim() !== '' ? updateData.barcode.trim() : null
      };
      
      console.log('Updating product with data:', processedUpdateData);
      updatedProduct = await prisma.product.update({
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
    } catch (error: any) {
      console.log('Prisma update error:', error);
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        console.log('Unique constraint violation on field:', field);
        if (field === 'barcode') {
          return res.status(400).json({
            success: false,
            message: 'A product with this barcode already exists'
          });
        } else if (field === 'sku') {
          return res.status(400).json({
            success: false,
            message: 'A product with this SKU already exists'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `A product with this ${field} already exists`
          });
        }
      }
      throw error; // Re-throw if it's not a unique constraint error
    }

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is used in any orders
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId: id }
    });

    if (orderItems) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that has been used in orders'
      });
    }

    // Delete product (this will cascade to inventory and price history)
    await prisma.product.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

// Bulk update products
export const bulkUpdateProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { products } = req.body;

    const results = await Promise.allSettled(
      products.map(async (productData: any) => {
        const { id, ...updateData } = productData;
        
        return await prisma.product.update({
          where: { id },
          data: updateData
        });
      })
    );

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
  } catch (error) {
    console.error('Bulk update products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update products'
    });
  }
};

// Category management functions
export const getAllCategories = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const categories = await prisma.category.findMany({
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
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { name, description, parentId, sortOrder = 0 } = req.body;
    
    console.log('Creating category with data:', { name, description, parentId, sortOrder });

    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        sortOrder: sortOrder || 0
      }
    });

    console.log('Category created successfully:', category);

    // Create audit log
    await createAuditLog({
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
  } catch (error: any) {
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

export const updateCategory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData
    });

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
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

    await prisma.category.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

// Generate SKU for a product
export const generateSKU = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { categoryId, customPrefix } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // Get category information
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Generate SKU
    const sku = await SKUGenerator.generateSKU({
      categoryId: category.id,
      categoryName: category.name,
      customPrefix
    });

    res.json({
      success: true,
      data: { sku }
    });
  } catch (error) {
    console.error('Generate SKU error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate SKU'
    });
  }
};

// Get SKU statistics for a category
export const getSKUStats = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const stats = await SKUGenerator.getSKUStats(categoryId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get SKU stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SKU statistics'
    });
  }
};

// Validate SKU uniqueness
export const validateSKU = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { sku, excludeId } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required'
      });
    }

    const isUnique = await SKUGenerator.isSKUUnique(sku, excludeId);

    res.json({
      success: true,
      data: { isUnique, sku }
    });
  } catch (error) {
    console.error('Validate SKU error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate SKU'
    });
  }
};

// Generate multiple SKUs for bulk operations
export const generateMultipleSKUs = async (req: Request, res: Response): Promise<Response | void> => {
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

    // Get category information
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Generate multiple SKUs
    const skus = await SKUGenerator.generateMultipleSKUs({
      categoryId: category.id,
      categoryName: category.name,
      customPrefix
    }, count);

    res.json({
      success: true,
      data: { skus, count: skus.length }
    });
  } catch (error) {
    console.error('Generate multiple SKUs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate multiple SKUs'
    });
  }
}; 