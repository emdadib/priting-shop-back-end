import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Calculate price based on pricing model and quantity
const calculatePrice = async (productId: string, quantity: number, customUnitPrice?: number) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productPricingTiers: {
        where: { isActive: true },
        orderBy: { minQuantity: 'asc' }
      }
    }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  let unitPrice: Decimal;
  let costPrice: Decimal;

  switch (product.pricingModel) {
    case 'FIXED':
      unitPrice = product.basePrice;
      costPrice = product.baseCostPrice;
      break;

    case 'VARIABLE':
      // Find the appropriate pricing tier
      const tier = product.productPricingTiers.find(t => 
        quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity)
      );
      
      if (tier) {
        unitPrice = tier.unitPrice;
        costPrice = tier.costPrice;
      } else {
        // Fallback to base price
        unitPrice = product.basePrice;
        costPrice = product.baseCostPrice;
      }
      break;

    case 'CUSTOM':
      if (customUnitPrice) {
        unitPrice = new Decimal(customUnitPrice);
        costPrice = product.baseCostPrice; // Use base cost price for custom pricing
      } else {
        unitPrice = product.basePrice;
        costPrice = product.baseCostPrice;
      }
      break;

    case 'AREA_BASED':
      // For area-based pricing, quantity represents area (sq ft, sq m, etc.)
      unitPrice = product.basePrice;
      costPrice = product.baseCostPrice;
      break;

    default:
      unitPrice = product.basePrice;
      costPrice = product.baseCostPrice;
  }

  return { unitPrice, costPrice };
};

// Create a custom order with variable pricing
export const createCustomOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      customerId,
      items,
      notes,
      dueDate,
      orderType = 'CUSTOM'
    } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate totals
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);
    const orderItems = [];

    for (const item of items) {
      const {
        productId,
        quantity,
        unit,
        customUnitPrice,
        customDimensions,
        customRequirements,
        specifications,
        notes: itemNotes
      } = item;

      // Calculate pricing
      const { unitPrice, costPrice } = await calculatePrice(productId, quantity, customUnitPrice);

      // Calculate item totals
      const itemSubtotal = unitPrice.mul(quantity);
      const taxAmount = itemSubtotal.mul(new Decimal(0.05)); // 5% tax
      const itemTotal = itemSubtotal.add(taxAmount);

      // Add to order totals
      subtotal = subtotal.add(itemSubtotal);
      totalTax = totalTax.add(taxAmount);

      // Prepare order item
      orderItems.push({
        productId,
        quantity,
        unit: unit || 'piece',
        unitPrice,
        costPrice,
        taxAmount,
        total: itemTotal,
        notes: itemNotes,
        customDimensions,
        customRequirements,
        specifications,
        isCustomPriced: !!customUnitPrice
      });
    }

    const total = subtotal.add(totalTax);

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        userId,
        orderType,
        subtotal,
        taxAmount: totalTax,
        total,
        notes,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    // Create order items
    for (const item of orderItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ...item
        }
      });
    }

    // Get complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Custom order created successfully',
      data: completeOrder
    });

  } catch (error) {
    console.error('Create custom order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get pricing for a product based on quantity
export const getProductPricing = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId } = req.params;
    const { quantity = 1, customUnitPrice } = req.query;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        productPricingTiers: {
          where: { isActive: true },
          orderBy: { minQuantity: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Calculate pricing
    const { unitPrice, costPrice } = await calculatePrice(
      productId!, 
      Number(quantity), 
      customUnitPrice ? Number(customUnitPrice) : undefined
    );

    const subtotal = unitPrice.mul(Number(quantity));
    const taxAmount = subtotal.mul(new Decimal(0.05));
    const total = subtotal.add(taxAmount);

    res.json({
      success: true,
      data: {
        product,
        quantity: Number(quantity),
        unitPrice,
        costPrice,
        subtotal,
        taxAmount,
        total,
        pricingModel: product.pricingModel,
        availableTiers: product.productPricingTiers
      }
    });

  } catch (error) {
    console.error('Get product pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product pricing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create pricing tier for a product
export const createPricingTier = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId } = req.params;
    const {
      minQuantity,
      maxQuantity,
      unitPrice,
      costPrice,
      discount = 0
    } = req.body;

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Create pricing tier
    const pricingTier = await prisma.productPricingTier.create({
      data: {
        productId: productId!,
        minQuantity: Number(minQuantity),
        maxQuantity: maxQuantity ? Number(maxQuantity) : null,
        unitPrice: new Decimal(unitPrice),
        costPrice: new Decimal(costPrice),
        discount: new Decimal(discount)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pricing tier created successfully',
      data: pricingTier
    });

  } catch (error) {
    console.error('Create pricing tier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pricing tier',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all pricing tiers for a product
export const getProductPricingTiers = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId } = req.params;

    const pricingTiers = await prisma.productPricingTier.findMany({
      where: { 
        productId,
        isActive: true
      },
      orderBy: { minQuantity: 'asc' }
    });

    res.json({
      success: true,
      data: pricingTiers
    });

  } catch (error) {
    console.error('Get pricing tiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing tiers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update product pricing model
export const updateProductPricingModel = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { productId } = req.params;
    const {
      pricingModel,
      basePrice,
      baseCostPrice,
      isCustomOrder,
      requiresSpecifications
    } = req.body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        pricingModel,
        basePrice: basePrice ? new Decimal(basePrice) : undefined,
        baseCostPrice: baseCostPrice ? new Decimal(baseCostPrice) : undefined,
        isCustomOrder,
        requiresSpecifications
      }
    });

    res.json({
      success: true,
      message: 'Product pricing model updated successfully',
      data: product
    });

  } catch (error) {
    console.error('Update product pricing model error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product pricing model',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get orders with custom pricing details
export const getCustomOrders = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { page = 1, limit = 10, status, orderType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get custom orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get custom orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
