import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Get all inventory with pagination and filters
export const getInventory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    console.log('Inventory request received:', req.query);
    const {
      page = 1,
      limit = 20,
      search,
      category,
      lowStock
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      product: {
        isActive: true,
        hasInventory: true // Only show products with inventory tracking
      }
    };
    
    if (search) {
      where.product = {
        ...where.product,
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }
    
    if (category) {
      where.product.categoryId = category as string;
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
      prisma.inventory.findMany({
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
      prisma.inventory.count({ where })
    ]);
    
    console.log('Inventory query results:', { count: inventory.length, total });

    // Add low stock flag
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
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  }
};

// Get inventory for specific product
export const getInventoryByProduct = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findUnique({
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
  } catch (error) {
    console.error('Get inventory by product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  }
};

// Update stock levels
export const updateStock = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId, quantity, type, reason, reference } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get current inventory
    const currentInventory = await prisma.inventory.findUnique({
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

    // Calculate new quantity based on movement type
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

    // Check if new quantity would exceed max stock
    if (currentInventory.product.maxStock && newQuantity > currentInventory.product.maxStock) {
      return res.status(400).json({
        success: false,
        message: `Stock cannot exceed maximum of ${currentInventory.product.maxStock}`
      });
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: newQuantity,
        available: Math.max(0, newQuantity - currentInventory.reserved),
        lastUpdated: new Date()
      }
    });

    // Create movement record
    const movement = await prisma.inventoryMovement.create({
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

    // Create audit log
    await createAuditLog({
      userId,
      action: 'UPDATE_STOCK',
      entity: 'INVENTORY',
      entityId: productId,
      oldValues: { quantity: previousQuantity },
      newValues: { quantity: newQuantity, type, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    io.to('inventory-updates').emit('inventory-updated', {
      productId,
      quantity: newQuantity,
      available: updatedInventory.available,
      movement
    });

    // Check for low stock alert
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
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};

// Get inventory movements
export const getInventoryMovements = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
    if (productId) {
      where.productId = productId as string;
    }
    
    if (type) {
      where.type = type as string;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
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
      prisma.inventoryMovement.count({ where })
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
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory movements'
    });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const lowStockItems = await prisma.inventory.findMany({
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

    // Filter items where quantity is less than or equal to minStock
    const filteredItems = lowStockItems.filter(item => 
      item.quantity <= item.product.minStock
    );

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
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts'
    });
  }
};

// Bulk update inventory
export const bulkUpdateInventory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { updates } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const results = await Promise.allSettled(
      updates.map(async (update: any) => {
        const { productId, quantity, type, reason } = update;

        // Get current inventory
        const currentInventory = await prisma.inventory.findUnique({
          where: { productId }
        });

        if (!currentInventory) {
          throw new Error(`Inventory not found for product ${productId}`);
        }

        const previousQuantity = currentInventory.quantity;
        let newQuantity = previousQuantity;

        // Calculate new quantity
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

        // Update inventory
        const updatedInventory = await prisma.inventory.update({
          where: { productId },
          data: {
            quantity: newQuantity,
            available: Math.max(0, newQuantity - currentInventory.reserved),
            lastUpdated: new Date()
          }
        });

        // Create movement record
        await prisma.inventoryMovement.create({
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
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        successful,
        failed,
        total: updates.length,
        results: results.map(result => 
          result.status === 'fulfilled' ? result.value : { error: result.reason }
        )
      }
    });
  } catch (error) {
    console.error('Bulk update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update inventory'
    });
  }
};

// Get inventory report
export const getInventoryReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate, category } = req.query;

    const where: any = {
      product: {
        isActive: true,
        hasInventory: true // Only include products with inventory tracking
      }
    };

    if (category) {
      where.product.categoryId = category as string;
    }

    const inventory = await prisma.inventory.findMany({
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

    // Calculate report statistics
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * Number(item.product.basePrice || 0));
    }, 0);
    const lowStockItems = inventory.filter(item => 
      item.product.minStock > 0 && item.quantity <= item.product.minStock
    ).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;

    // Group by category
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
    }, {} as any);

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
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report'
    });
  }
}; 