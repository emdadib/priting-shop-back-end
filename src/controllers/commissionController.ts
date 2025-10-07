import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllCommissions = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: [] });
};

export const getCommissionById = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const createCommission = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const updateCommission = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const deleteCommission = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, message: 'Commission deleted' });
};

// Get commissions (alias for getAllCommissions)
export const getCommissions = getAllCommissions;

// Get commission report
export const getCommissionReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (userId) {
      where.userId = userId as string;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalAmount = commissions.reduce((sum, commission) => sum + Number(commission.amount), 0);
    const pendingAmount = commissions
      .filter(commission => commission.status === 'PENDING')
      .reduce((sum, commission) => sum + Number(commission.amount), 0);
    const paidAmount = commissions
      .filter(commission => commission.status === 'PAID')
      .reduce((sum, commission) => sum + Number(commission.amount), 0);

    res.json({
      success: true,
      data: {
        commissions,
        totalAmount,
        pendingAmount,
        paidAmount,
        commissionCount: commissions.length
      }
    });
  } catch (error) {
    console.error('Get commission report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate commission report'
    });
  }
};

// Calculate commissions
export const calculateCommissions = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { period, userId } = req.body;

    // Get orders for the specified period
    const startDate = new Date(period + '-01');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of the month

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED',
        ...(userId && { userId })
      },
      include: {
        items: true,
        user: true
      }
    });

    const commissions = [];

    for (const order of orders) {
      // Calculate commission based on order total (example: 5% commission)
      const commissionRate = 0.05; // 5%
      const commissionAmount = Number(order.total) * commissionRate;

      if (commissionAmount > 0) {
        const commission = await prisma.commission.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: commissionAmount,
            rate: commissionRate,
            period,
            status: 'PENDING'
          },
          include: {
            user: true
          }
        });

        commissions.push(commission);
      }
    }

    res.json({
      success: true,
      data: {
        commissions,
        period,
        totalCommissions: commissions.length,
        totalAmount: commissions.reduce((sum, commission) => sum + Number(commission.amount), 0)
      }
    });
  } catch (error) {
    console.error('Calculate commissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate commissions'
    });
  }
};
