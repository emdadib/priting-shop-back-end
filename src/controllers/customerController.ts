import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all customers
export const getAllCustomers = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer'
    });
  }
};

// Create customer
export const createCustomer = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { firstName, lastName, email, phone, address } = req.body;

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        address
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      newValues: { firstName, lastName, email, phone, address },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address } = req.body;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        address
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE',
      entity: 'CUSTOMER',
      entityId: id,
      oldValues: {
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        email: existingCustomer.email,
        phone: existingCustomer.phone,
        address: existingCustomer.address
      },
      newValues: { firstName, lastName, email, phone, address },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
};

// Delete customer
export const deleteCustomer = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await prisma.customer.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'DELETE',
      entity: 'CUSTOMER',
      entityId: id,
      oldValues: {
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        email: existingCustomer.email,
        phone: existingCustomer.phone,
        address: existingCustomer.address
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
};

// Search customers
export const searchCustomers = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { query } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: query as string, mode: 'insensitive' } },
          { lastName: { contains: query as string, mode: 'insensitive' } },
          { email: { contains: query as string, mode: 'insensitive' } },
          { phone: { contains: query as string, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search customers'
    });
  }
};

// Get customer orders
export const getCustomerOrders = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const orders = await prisma.order.findMany({
      where: { customerId: id },
      include: {
        items: true
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
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer orders'
    });
  }
};

// Update loyalty points
export const updateLoyaltyPoints = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        loyaltyPoints: points
      }
    });

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Update loyalty points error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loyalty points'
    });
  }
}; 