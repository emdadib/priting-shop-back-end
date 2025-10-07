import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Get photocopy products (public endpoint)
export const getPhotocopyProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    console.log('Fetching photocopy products...');
    
    // Find photocopy category
    const photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    console.log('Photocopy category:', photocopyCategory);

    if (!photocopyCategory) {
      console.log('Photocopy category not found, creating it...');
      // Create photocopy category if it doesn't exist
      const newCategory = await prisma.category.create({
        data: {
          name: 'Photocopy Services',
          description: 'Photocopy and printing services',
          sortOrder: 100
        }
      });
      console.log('Created photocopy category:', newCategory);
    }

    // Get photocopy products
    const products = await prisma.product.findMany({
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
  } catch (error) {
    console.error('Get photocopy products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photocopy products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create photocopy order (public endpoint)
export const createPhotocopyOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      oneSidedCopies,
      bothSidedCopies,
      customerName,
      customerPhone,
      discountAmount = 0
    } = req.body;

    if (!oneSidedCopies && !bothSidedCopies) {
      return res.status(400).json({
        success: false,
        message: 'Please specify at least one copy type'
      });
    }

    // Find photocopy products
    const photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    if (!photocopyCategory) {
      return res.status(404).json({
        success: false,
        message: 'Photocopy services not found'
      });
    }

    const products = await prisma.product.findMany({
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

    // Calculate order details
    const totalPages = (oneSidedCopies || 0) + (bothSidedCopies || 0);
    const orderItems = [];

    // Add copy service items
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

    // Add photocopy page consumption
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
    const finalDiscountAmount = Math.min(discountAmount, subtotal); // Ensure discount doesn't exceed subtotal
    const total = Math.max(0, subtotal - finalDiscountAmount); // Ensure total doesn't go below 0

    // Create or find walk-in customer
    let customer = null;
    if (customerName || customerPhone) {
      // First try to find existing customer by phone
      if (customerPhone) {
        customer = await prisma.customer.findFirst({
          where: {
            phone: customerPhone
          }
        });
      }
      
      // If not found, create a new customer
      if (!customer) {
        customer = await prisma.customer.create({
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

    // Get system user for the order (or create a default one)
    let systemUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.findFirst();
    }

    if (!systemUser) {
      return res.status(500).json({
        success: false,
        message: 'No system user found'
      });
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `PHOTO-${String(orderCount + 1).padStart(6, '0')}`;

    // Create order
    const order = await prisma.order.create({
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

    // Update inventory for photocopy pages
    if (totalPages > 0) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: photocopyPageProduct.id }
      });

      if (inventory) {
        const newQuantity = inventory.quantity - totalPages;
        const newAvailable = inventory.available - totalPages;

        await prisma.inventory.update({
          where: { productId: photocopyPageProduct.id },
          data: {
            quantity: newQuantity,
            available: newAvailable
          }
        });

        // Create inventory movement record
        await prisma.inventoryMovement.create({
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

    // Create payment record for photocopy order (always paid immediately)
    await prisma.payment.create({
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

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Create photocopy order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create photocopy order'
    });
  }
};

// Get photocopy order by order number (public endpoint)
export const getPhotocopyOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
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
  } catch (error) {
    console.error('Get photocopy order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Get photocopy ledger (admin endpoint)
export const getPhotocopyLedger = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Find photocopy orders (orders with PHOTO- prefix in orderNumber)
    const whereClause: any = {
      orderNumber: {
        startsWith: 'PHOTO-'
      }
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
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
      prisma.order.count({
        where: whereClause
      })
    ]);

    // Calculate summary statistics
    const summary = await prisma.order.aggregate({
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

    // Calculate photocopy-specific statistics
    const photocopyStats = await prisma.orderItem.aggregate({
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
  } catch (error) {
    console.error('Get photocopy ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photocopy ledger'
    });
  }
};
