import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all orders
export const getAllOrders = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add date range filters if provided
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          user: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get orders with outstanding due amount (paginated, server-side)
export const getOrdersWithDue = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const rows = await prisma.$queryRaw<Array<{ id: string; dueAmount: string }>>`
      SELECT o.id,
             (o.total - COALESCE(SUM(p.amount), 0))::text AS "dueAmount"
      FROM orders o
      LEFT JOIN payments p ON p."orderId" = o.id
      GROUP BY o.id, o.total
      HAVING (o.total - COALESCE(SUM(p.amount), 0)) > 0
      ORDER BY (o.total - COALESCE(SUM(p.amount), 0)) DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const aggregate = await prisma.$queryRaw<Array<{ totalOrders: bigint; totalDue: string | null }>>`
      SELECT COUNT(*)::bigint AS "totalOrders",
             COALESCE(SUM(o.total - paid.total_paid), 0)::text AS "totalDue"
      FROM orders o
      LEFT JOIN (
        SELECT "orderId", SUM(amount) AS total_paid
        FROM payments
        WHERE "orderId" IS NOT NULL
        GROUP BY "orderId"
      ) paid ON paid."orderId" = o.id
      WHERE (o.total - COALESCE(paid.total_paid, 0)) > 0
    `;

    const ids = rows.map(r => r.id);
    const orders = ids.length
      ? await prisma.order.findMany({
          where: { id: { in: ids } },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, email: true } },
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        })
      : [];

    const dueById = new Map(rows.map(r => [r.id, Number(r.dueAmount)]));
    const data = ids
      .map(id => {
        const order = orders.find(o => o.id === id);
        if (!order) return null;
        return { ...order, dueAmount: dueById.get(id) ?? 0 };
      })
      .filter(Boolean);

    const totalOrders = Number(aggregate[0]?.totalOrders ?? 0);
    const totalDue = Number(aggregate[0]?.totalDue ?? 0);

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limitNum)
      },
      summary: {
        totalOrders,
        totalDue
      }
    });
  } catch (error) {
    console.error('Get orders with due error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders with due amount'
    });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
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
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Create order
export const createOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { customerId, items, status, type, notes, discountAmount, discountType } = req.body;
    const userId = req.user?.id;

    console.log('Creating order:', {
      customerId,
      itemsCount: items?.length || 0,
      status,
      type,
      discountAmount,
      discountType
    });

    // Compute total up-front so we can enforce the walk-in threshold before
    // touching the customer table.
    const computedSubtotal = (items || []).reduce((sum: number, item: any) => {
      const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
      return sum + itemTotal;
    }, 0);
    let computedSubtotalAfterDiscount = computedSubtotal;
    if (discountAmount && discountAmount > 0) {
      computedSubtotalAfterDiscount = discountType === 'PERCENTAGE'
        ? computedSubtotal * (1 - discountAmount / 100)
        : computedSubtotal - discountAmount;
    }
    const computedTax = (items || []).reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
    const computedTotal = computedSubtotalAfterDiscount + computedTax;

    // Reject walk-in orders above the threshold; a named customer is required.
    const WALK_IN_MAX_TOTAL = 1000;
    let resolvedIsWalkIn = customerId === 'walk-in';
    if (!resolvedIsWalkIn && customerId) {
      const incomingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { isWalkIn: true }
      });
      resolvedIsWalkIn = incomingCustomer?.isWalkIn === true;
    }
    if (resolvedIsWalkIn && computedTotal > WALK_IN_MAX_TOTAL) {
      return res.status(400).json({
        success: false,
        message: `Walk-in customers are not allowed for orders above ${WALK_IN_MAX_TOTAL}. Please select a registered customer.`
      });
    }

    // Handle walk-in customers
    let finalCustomerId = customerId;
    if (customerId === 'walk-in') {
      // First, try to find an existing walk-in customer
      let walkInCustomer = await prisma.customer.findFirst({
        where: {
          isWalkIn: true,
          phone: '',
          firstName: 'Walk-in',
          lastName: 'Customer'
        }
      });

      // If no walk-in customer exists, create one
      if (!walkInCustomer) {
        // Generate a unique email that won't conflict with existing records
        let email = `walkin@temp.com`;
        let emailExists = true;
        let attempt = 0;
        
        // Try to find an available email (unlikely to conflict, but handle it)
        while (emailExists && attempt < 10) {
          const existing = await prisma.customer.findUnique({
            where: { email }
          });
          if (!existing) {
            emailExists = false;
          } else {
            email = `walkin-${attempt}@temp.com`;
            attempt++;
          }
        }

        walkInCustomer = await prisma.customer.create({
          data: {
            firstName: 'Walk-in',
            lastName: 'Customer',
            email: email,
            phone: '',
            address: '',
            isActive: true,
            isWalkIn: true
          }
        });
        console.log('Created new walk-in customer:', walkInCustomer.id);
      } else {
        console.log('Reusing existing walk-in customer:', walkInCustomer.id);
      }
      
      finalCustomerId = walkInCustomer.id;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Calculate totals with discount support
    let subtotal = items.reduce((sum: number, item: any) => {
      const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
      return sum + itemTotal;
    }, 0);

    // Apply order-level discount
    if (discountAmount && discountAmount > 0) {
      if (discountType === 'PERCENTAGE') {
        subtotal = subtotal * (1 - discountAmount / 100);
      } else {
        subtotal = subtotal - discountAmount;
      }
    }

    const totalTax = items.reduce((sum: number, item: any) => {
      return sum + (item.taxAmount || 0);
    }, 0);

    const total = subtotal + totalTax;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Determine initial status based on order type
    let initialStatus = status || 'PENDING';
    if (type === 'DIRECT_SALE') {
      initialStatus = 'COMPLETED'; // Direct sales complete instantly
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: finalCustomerId,
        userId,
        status: initialStatus,
        type: type || 'SALE',
        subtotal,
        taxAmount: totalTax,
        discountAmount: discountAmount || 0,
        total,
        notes,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || item.unitPrice, // Use unitPrice as costPrice if not provided
            discount: item.discount || 0,
            taxAmount: item.taxAmount || 0,
            total: item.total,
            notes: item.notes,
            specifications: item.specifications,
            serialNumbers: item.serialNumbers || null,
            warrantyStartDate: item.warrantyStartDate ? new Date(item.warrantyStartDate) : null,
            warrantyEndDate: item.warrantyEndDate ? new Date(item.warrantyEndDate) : null
          }))
        }
      },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Update inventory for physical products when order is created
    if (initialStatus === 'COMPLETED' || initialStatus === 'CONFIRMED') {
      console.log('Order status indicates completion - updating inventory...');
      
      for (const item of items) {
        // Get product details to check if it needs inventory tracking
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            type: true,
            hasInventory: true
          }
        });

        if (product && product.type === 'PHYSICAL' && product.hasInventory) {
          console.log('Updating inventory for sale item:', {
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity
          });

          // Check if inventory record exists
          const existingInventory = await prisma.inventory.findUnique({
            where: { productId: item.productId }
          });

          if (existingInventory) {
            // Update existing inventory (decrease stock)
            const newQuantity = Math.max(0, existingInventory.quantity - item.quantity);
            const newAvailable = Math.max(0, existingInventory.available - item.quantity);
            
            await prisma.inventory.update({
              where: { productId: item.productId },
              data: {
                quantity: newQuantity,
                available: newAvailable,
                lastUpdated: new Date()
              }
            });

            // Create inventory movement record
            await prisma.inventoryMovement.create({
              data: {
                productId: item.productId,
                type: 'SALE',
                quantity: -item.quantity, // Negative for sales
                previousQuantity: existingInventory.quantity,
                newQuantity: newQuantity,
                reason: `Sale order ${orderNumber} - Stock decrease`,
                reference: `ORD-${orderNumber}`,
                userId: userId
              }
            });

            console.log('Inventory updated for product:', product.name, 'New quantity:', newQuantity);
          } else {
            console.log('No inventory record found for product:', product.name);
          }
        }
      }
    }

    // Create customer ledger transaction for the order (DEBIT - customer owes money)
    await prisma.customerTransaction.create({
      data: {
        customerId: finalCustomerId,
        type: 'DEBIT',
        amount: total,
        description: `Order ${orderNumber}`,
        referenceType: 'ORDER',
        referenceId: order.id,
        date: new Date()
      }
    });

    // Create company ledger transaction for sales revenue (CREDIT - revenue increases)
    await prisma.companyTransaction.create({
      data: {
        accountType: 'SALES',
        type: 'CREDIT',
        amount: total,
        description: `Sales Revenue - Order ${orderNumber}`,
        reference: orderNumber,
        referenceType: 'ORDER',
        referenceId: order.id,
        date: new Date(),
        isActive: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'CREATE',
      entity: 'ORDER',
      entityId: order.id,
      newValues: { customerId, status, type, items },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// Update order
export const updateOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes
      },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE',
      entity: 'ORDER',
      entityId: id,
      oldValues: {
        status: existingOrder.status,
        notes: existingOrder.notes
      },
      newValues: { status, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
};

// Delete order
export const deleteOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Delete order items first to avoid foreign key constraint
    await prisma.orderItem.deleteMany({
      where: { orderId: id }
    });

    // Delete related customer transactions
    await prisma.customerTransaction.updateMany({
      where: {
        referenceType: 'ORDER',
        referenceId: id
      },
      data: {
        isActive: false // Soft delete - mark as inactive instead of hard delete
      }
    });

    // Delete related company transactions
    await prisma.companyTransaction.updateMany({
      where: {
        referenceType: 'ORDER',
        referenceId: id
      },
      data: {
        isActive: false // Soft delete - mark as inactive instead of hard delete
      }
    });

    // Get all payments associated with this order before deleting them
    const relatedPayments = await prisma.payment.findMany({
      where: { orderId: id },
      select: { id: true }
    });

    const paymentIds = relatedPayments.map(p => p.id);

    // Soft delete company transactions related to payments (CASH/BANK transactions)
    if (paymentIds.length > 0) {
      await prisma.companyTransaction.updateMany({
        where: {
          referenceType: 'PAYMENT',
          referenceId: { in: paymentIds }
        },
        data: {
          isActive: false // Soft delete - mark as inactive instead of hard delete
        }
      });

      // Soft delete customer transactions related to payments
      await prisma.customerTransaction.updateMany({
        where: {
          referenceType: 'PAYMENT',
          referenceId: { in: paymentIds }
        },
        data: {
          isActive: false // Soft delete - mark as inactive instead of hard delete
        }
      });
    }

    // Delete related payments (if any)
    await prisma.payment.deleteMany({
      where: { orderId: id }
    });

    // Then delete the order
    await prisma.order.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'DELETE',
      entity: 'ORDER',
      entityId: id,
      oldValues: {
        customerId: existingOrder.customerId,
        status: existingOrder.status,
        type: existingOrder.type,
        orderNumber: existingOrder.orderNumber
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
};

// Get orders by status
export const getOrdersByStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { status } = req.params;

    const orders = await prisma.order.findMany({
      where: { status: status as any },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get orders by customer
export const getOrdersByCustomer = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { customerId } = req.params;

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get orders by date range
export const getOrdersByDateRange = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Updating order status:', {
      orderId: id,
      newStatus: status,
      previousStatus: existingOrder.status,
      itemsCount: existingOrder.items.length
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status
      },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Update inventory when order status changes to COMPLETED
    if (status === 'COMPLETED' && existingOrder.status !== 'COMPLETED') {
      console.log('Order completed - updating inventory...');
      
      for (const item of existingOrder.items) {
        // Get product details to check if it needs inventory tracking
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            type: true,
            hasInventory: true
          }
        });

        if (product && product.type === 'PHYSICAL' && product.hasInventory) {
          console.log('Updating inventory for completed order item:', {
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity
          });

          // Check if inventory record exists
          const existingInventory = await prisma.inventory.findUnique({
            where: { productId: item.productId }
          });

          if (existingInventory) {
            // Update existing inventory (decrease stock)
            const newQuantity = Math.max(0, existingInventory.quantity - item.quantity);
            const newAvailable = Math.max(0, existingInventory.available - item.quantity);
            
            await prisma.inventory.update({
              where: { productId: item.productId },
              data: {
                quantity: newQuantity,
                available: newAvailable,
                lastUpdated: new Date()
              }
            });

            // Create inventory movement record
            await prisma.inventoryMovement.create({
              data: {
                productId: item.productId,
                type: 'SALE',
                quantity: -item.quantity, // Negative for sales
                previousQuantity: existingInventory.quantity,
                newQuantity: newQuantity,
                reason: `Order ${existingOrder.orderNumber} completed - Stock decrease`,
                reference: `ORD-${existingOrder.orderNumber}`,
                userId: req.user?.id || 'unknown'
              }
            });

            console.log('Inventory updated for product:', product.name, 'New quantity:', newQuantity);
          } else {
            console.log('No inventory record found for product:', product.name);
          }
        }
      }
    }

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE',
      entity: 'ORDER',
      entityId: id,
      oldValues: {
        status: existingOrder.status
      },
      newValues: { status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
}; 