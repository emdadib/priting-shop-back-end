import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all salary advances with optional filtering
export const getAllSalaryAdvances = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, status, month, year } = req.query;

    const where: any = {};
    
    if (userId) where.userId = userId as string;
    if (status) where.status = status as string;
    if (month && year) {
      where.requestDate = {
        gte: new Date(parseInt(year as string), parseInt(month as string) - 1, 1),
        lt: new Date(parseInt(year as string), parseInt(month as string), 1)
      };
    }

    const advances = await prisma.salaryAdvance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        salary: {
          select: {
            id: true,
            month: true,
            year: true,
            amount: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        paidByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        requestDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: advances
    });
  } catch (error) {
    console.error('Get all salary advances error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary advances'
    });
  }
};

// Get salary advance by ID
export const getSalaryAdvanceById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const advance = await prisma.salaryAdvance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        salary: {
          select: {
            id: true,
            month: true,
            year: true,
            amount: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        paidByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Salary advance not found'
      });
    }

    res.json({
      success: true,
      data: advance
    });
  } catch (error) {
    console.error('Get salary advance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary advance'
    });
  }
};

// Create salary advance request
export const createSalaryAdvance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, amount, reason, notes } = req.body;
    const currentUser = req.user;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is requesting advance for themselves or if current user is admin
    if (userId !== currentUser?.id && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only request advances for yourself'
      });
    }

    // Check if there's a salary record for current month/year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const existingSalary = await prisma.salary.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear
        }
      }
    });

    // Calculate total advances taken this month
    const totalAdvances = await prisma.salaryAdvance.aggregate({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] },
        requestDate: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      },
      _sum: {
        amount: true
      }
    });

    const totalAdvancesAmount = Number(totalAdvances._sum.amount || 0);
    const requestedAmount = parseFloat(amount);

    // Check if advance amount is within salary limit
    if (existingSalary) {
      const remainingSalary = Number(existingSalary.amount) - totalAdvancesAmount;
      if (requestedAmount > remainingSalary) {
        return res.status(400).json({
          success: false,
          message: `Advance amount exceeds remaining salary. Available: $${remainingSalary.toLocaleString()}`
        });
      }
    } else {
      // If no salary record exists, we'll allow advance but create a note
      console.log(`No salary record found for user ${userId} for ${currentMonth}/${currentYear}`);
    }

    const advance = await prisma.salaryAdvance.create({
      data: {
        userId,
        amount: requestedAmount,
        reason,
        notes,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'CREATE',
      entity: 'SALARY_ADVANCE',
      entityId: advance.id,
      newValues: { userId, amount: requestedAmount, reason, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: advance
    });
  } catch (error) {
    console.error('Create salary advance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary advance request'
    });
  }
};

// Approve salary advance
export const approveSalaryAdvance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const currentUser = req.user;

    const existingAdvance = await prisma.salaryAdvance.findUnique({
      where: { id }
    });

    if (!existingAdvance) {
      return res.status(404).json({
        success: false,
        message: 'Salary advance not found'
      });
    }

    if (existingAdvance.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending advances can be approved'
      });
    }

    const updatedAdvance = await prisma.salaryAdvance.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: currentUser?.id,
        approvedAt: new Date(),
        notes: notes || existingAdvance.notes
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        approvedByUser: {
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
      userId: currentUser?.id || 'unknown',
      action: 'UPDATE',
      entity: 'SALARY_ADVANCE',
      entityId: id,
      oldValues: {
        status: existingAdvance.status,
        approvedBy: existingAdvance.approvedBy,
        approvedAt: existingAdvance.approvedAt
      },
      newValues: {
        status: 'APPROVED',
        approvedBy: currentUser?.id,
        approvedAt: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedAdvance
    });
  } catch (error) {
    console.error('Approve salary advance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve salary advance'
    });
  }
};

// Pay salary advance
export const paySalaryAdvance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const currentUser = req.user;

    const existingAdvance = await prisma.salaryAdvance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!existingAdvance) {
      return res.status(404).json({
        success: false,
        message: 'Salary advance not found'
      });
    }

    if (existingAdvance.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Only approved advances can be paid'
      });
    }

    const advanceAmount = Number(existingAdvance.amount);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Update advance, salary record, and create accounting transactions in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update advance status
      const updatedAdvance = await tx.salaryAdvance.update({
        where: { id },
        data: {
          status: 'PAID',
          paidBy: currentUser?.id,
          paidAt: new Date(),
          notes: notes || existingAdvance.notes
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          paidByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Update or create salary record with advance amount
      const existingSalary = await tx.salary.findUnique({
        where: {
          userId_month_year: {
            userId: existingAdvance.userId,
            month: currentMonth,
            year: currentYear
          }
        }
      });

      if (existingSalary) {
        await tx.salary.update({
          where: {
            userId_month_year: {
              userId: existingAdvance.userId,
              month: currentMonth,
              year: currentYear
            }
          },
          data: {
            advances: {
              increment: advanceAmount
            }
          }
        });
      } else {
        await tx.salary.create({
          data: {
            userId: existingAdvance.userId,
            amount: 0, // Will be updated when salary is set
            month: currentMonth,
            year: currentYear,
            advances: advanceAmount,
            status: 'PENDING'
          }
        });
      }

      // Create accounting transaction to record salary advance payment
      // This reduces cash and records it as an expense
      await tx.companyTransaction.create({
        data: {
          accountType: 'CASH', // Assuming advances are paid from cash
          type: 'CREDIT', // CREDIT decreases cash (money going out)
          amount: advanceAmount,
          description: `Salary Advance Payment - ${existingAdvance.user.firstName} ${existingAdvance.user.lastName}`,
          reference: `ADVANCE-${id}`,
          referenceType: 'ADJUSTMENT',
          date: new Date(),
          isActive: true
        }
      });

      // Also record as expense
      await tx.companyTransaction.create({
        data: {
          accountType: 'EXPENSES',
          type: 'DEBIT', // DEBIT increases expenses
          amount: advanceAmount,
          description: `Employee Salary Advance - ${existingAdvance.user.firstName} ${existingAdvance.user.lastName}`,
          reference: `ADVANCE-${id}`,
          referenceType: 'ADJUSTMENT',
          date: new Date(),
          isActive: true
        }
      });

      return updatedAdvance;
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'UPDATE',
      entity: 'SALARY_ADVANCE',
      entityId: id,
      oldValues: {
        status: existingAdvance.status,
        paidBy: existingAdvance.paidBy,
        paidAt: existingAdvance.paidAt
      },
      newValues: {
        status: 'PAID',
        paidBy: currentUser?.id,
        paidAt: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Pay salary advance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pay salary advance'
    });
  }
};

// Reject salary advance
export const rejectSalaryAdvance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const currentUser = req.user;

    const existingAdvance = await prisma.salaryAdvance.findUnique({
      where: { id }
    });

    if (!existingAdvance) {
      return res.status(404).json({
        success: false,
        message: 'Salary advance not found'
      });
    }

    if (existingAdvance.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending advances can be rejected'
      });
    }

    const updatedAdvance = await prisma.salaryAdvance.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason || existingAdvance.notes
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'UPDATE',
      entity: 'SALARY_ADVANCE',
      entityId: id,
      oldValues: {
        status: existingAdvance.status
      },
      newValues: {
        status: 'REJECTED'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedAdvance
    });
  } catch (error) {
    console.error('Reject salary advance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject salary advance'
    });
  }
};

// Delete salary advance
export const deleteSalaryAdvance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const existingAdvance = await prisma.salaryAdvance.findUnique({
      where: { id }
    });

    if (!existingAdvance) {
      return res.status(404).json({
        success: false,
        message: 'Salary advance not found'
      });
    }

    // Only allow deletion of pending advances
    if (existingAdvance.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending advances can be deleted'
      });
    }

    await prisma.salaryAdvance.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'DELETE',
      entity: 'SALARY_ADVANCE',
      entityId: id,
      oldValues: {
        userId: existingAdvance.userId,
        amount: existingAdvance.amount,
        reason: existingAdvance.reason,
        status: existingAdvance.status
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Salary advance deleted successfully'
    });
  } catch (error) {
    console.error('Delete salary advance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary advance'
    });
  }
};

// Get employee's advance summary
export const getEmployeeAdvanceSummary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    const currentDate = new Date();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();

    // Get total advances for the month
    const advances = await prisma.salaryAdvance.findMany({
      where: {
        userId,
        requestDate: {
          gte: new Date(targetYear, targetMonth - 1, 1),
          lt: new Date(targetYear, targetMonth, 1)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    const summary = {
      userId,
      month: targetMonth,
      year: targetYear,
      totalAdvances: advances.length,
      totalAmount: advances.reduce((sum: number, advance: any) => sum + Number(advance.amount), 0),
      pendingAmount: advances
        .filter((a: any) => a.status === 'PENDING')
        .reduce((sum: number, advance: any) => sum + Number(advance.amount), 0),
      approvedAmount: advances
        .filter((a: any) => a.status === 'APPROVED')
        .reduce((sum: number, advance: any) => sum + Number(advance.amount), 0),
      paidAmount: advances
        .filter((a: any) => a.status === 'PAID')
        .reduce((sum: number, advance: any) => sum + Number(advance.amount), 0),
      advances: advances
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get employee advance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advance summary'
    });
  }
};
