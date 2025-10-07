import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Get all made-to-order products
export const getMadeToOrderProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      isActive: true,
      hasInventory: false // Only made-to-order products
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } }
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
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    // Add made-to-order specific information
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
  } catch (error) {
    console.error('Get made-to-order products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch made-to-order products'
    });
  }
};

// Get made-to-order summary
export const getMadeToOrderSummary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const madeToOrderCount = await prisma.product.count({
      where: { 
        isActive: true,
        hasInventory: false 
      }
    });

    const stockCount = await prisma.product.count({
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
  } catch (error) {
    console.error('Get made-to-order summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary'
    });
  }
};
