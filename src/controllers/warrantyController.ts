import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all warranties with pagination and filters
export const getAllWarranties = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      customerId,
      productId,
      search
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
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
        { warrantyNumber: { contains: search as string, mode: 'insensitive' } },
        { issueDescription: { contains: search as string, mode: 'insensitive' } },
        { customer: { 
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } }
          ]
        }},
        { product: { name: { contains: search as string, mode: 'insensitive' } } }
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
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warranties'
    });
  }
};

// Get warranty by ID
export const getWarrantyById = async (req: Request, res: Response): Promise<Response | void> => {
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
  } catch (error) {
    console.error('Get warranty by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warranty'
    });
  }
};

// Create new warranty
export const createWarranty = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      productId,
      orderId,
      customerId,
      issueDescription,
      priority = 'MEDIUM',
      notes
    } = req.body;

    const userId = (req as any).user.id;

    // Generate warranty number
    const warrantyNumber = `WAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Check if product has warranty
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

    // Check if warranty period has expired using order item warranty dates
    const orderItem = await prisma.orderItem.findFirst({
      where: { 
        orderId: orderId,
        productId: productId
      },
      select: { 
        warrantyStartDate: true,
        warrantyEndDate: true,
        serialNumbers: true
      }
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    // Check if warranty has expired
    if (orderItem.warrantyEndDate && new Date() > new Date(orderItem.warrantyEndDate)) {
      return res.status(400).json({
        success: false,
        message: `Warranty has expired. Warranty period ended on ${new Date(orderItem.warrantyEndDate).toLocaleDateString()}.`
      });
    }

    // Check if warranty has started
    if (orderItem.warrantyStartDate && new Date() < new Date(orderItem.warrantyStartDate)) {
      return res.status(400).json({
        success: false,
        message: `Warranty has not started yet. Warranty period begins on ${new Date(orderItem.warrantyStartDate).toLocaleDateString()}.`
      });
    }

    const warranty = await prisma.warranty.create({
      data: {
        productId,
        orderId,
        customerId,
        warrantyNumber,
        issueDescription,
        priority,
        notes: `${notes || ''}${orderItem.serialNumbers ? `\nSerial Numbers: ${orderItem.serialNumbers}` : ''}`,
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

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Create warranty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create warranty'
    });
  }
};

// Update warranty
export const updateWarranty = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      resolution,
      replacementProductId,
      refundAmount,
      notes,
      assignedTo
    } = req.body;

    const userId = (req as any).user.id;

    const existingWarranty = await prisma.warranty.findUnique({
      where: { id }
    });

    if (!existingWarranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (resolution) updateData.resolution = resolution;
    if (replacementProductId) updateData.replacementProductId = replacementProductId;
    if (refundAmount !== undefined) updateData.refundAmount = parseFloat(refundAmount);
    if (notes) updateData.notes = notes;
    if (assignedTo) updateData.assignedTo = assignedTo;

    // Set resolved date if status is being changed to RESOLVED or CLOSED
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

    // Create audit log
    await createAuditLog({
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
  } catch (error) {
    console.error('Update warranty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update warranty'
    });
  }
};

// Get warranty statistics
export const getWarrantyStats = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      totalWarranties,
      openWarranties,
      inProgressWarranties,
      resolvedWarranties,
      closedWarranties,
      rejectedWarranties,
      urgentWarranties
    ] = await Promise.all([
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
  } catch (error) {
    console.error('Get warranty stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warranty statistics'
    });
  }
};
