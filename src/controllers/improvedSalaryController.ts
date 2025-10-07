import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Get all employee salary profiles
export const getEmployeeSalaryProfiles = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const profiles = await prisma.employeeSalaryProfile.findMany({
      where: { isActive: true },
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
        salaryPayments: {
          where: {
            year: new Date().getFullYear()
          },
          orderBy: {
            month: 'desc'
          },
          take: 12
        }
      },
      orderBy: {
        user: {
          firstName: 'asc'
        }
      }
    });

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Get employee salary profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee salary profiles'
    });
  }
};

// Create or update employee salary profile
export const setEmployeeSalary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, baseSalary, notes } = req.body;
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

    // Check if profile already exists
    const existingProfile = await prisma.employeeSalaryProfile.findUnique({
      where: { userId }
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.employeeSalaryProfile.update({
        where: { userId },
        data: {
          baseSalary: parseFloat(baseSalary),
          notes,
          updatedAt: new Date()
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
    } else {
      // Create new profile
      profile = await prisma.employeeSalaryProfile.create({
        data: {
          userId,
          baseSalary: parseFloat(baseSalary),
          notes,
          isActive: true
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
    }

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: existingProfile ? 'UPDATE' : 'CREATE',
      entity: 'EMPLOYEE_SALARY_PROFILE',
      entityId: profile.id,
      newValues: { userId, baseSalary, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Set employee salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set employee salary'
    });
  }
};

// Process monthly salary payment
export const processMonthlyPayment = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, month, year, amount, deductions, bonuses, notes } = req.body;
    const currentUser = req.user;

    // Get employee salary profile
    const profile = await prisma.employeeSalaryProfile.findUnique({
      where: { userId, isActive: true }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Employee salary profile not found'
      });
    }

    // Check if payment already exists for this month/year
    const existingPayment = await prisma.salaryPayment.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Salary payment already exists for this month and year'
      });
    }

    // Use provided amount or default to base salary
    const paymentAmount = amount ? parseFloat(amount) : profile.baseSalary;

    const payment = await prisma.salaryPayment.create({
      data: {
        userId,
        profileId: profile.id,
        amount: paymentAmount,
        month: parseInt(month),
        year: parseInt(year),
        deductions: deductions ? parseFloat(deductions) : null,
        bonuses: bonuses ? parseFloat(bonuses) : null,
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
        },
        profile: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'CREATE',
      entity: 'SALARY_PAYMENT',
      entityId: payment.id,
      newValues: { userId, month, year, amount: paymentAmount, deductions, bonuses, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Process monthly payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process monthly payment'
    });
  }
};

// Mark salary payment as paid
export const markPaymentAsPaid = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const currentUser = req.user;

    const payment = await prisma.salaryPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Salary payment not found'
      });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already marked as paid'
      });
    }

    const updatedPayment = await prisma.salaryPayment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidBy: currentUser?.id,
        paidAt: new Date(),
        notes: notes || payment.notes
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
        profile: true,
        paidByUser: {
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
      entity: 'SALARY_PAYMENT',
      entityId: id,
      oldValues: { status: payment.status },
      newValues: { status: 'PAID', paidBy: currentUser?.id, paidAt: new Date() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    console.error('Mark payment as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payment as paid'
    });
  }
};

// Get monthly salary summary
export const getMonthlySalarySummary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { month, year } = req.query;

    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    // Get all pending payments for the month
    const pendingPayments = await prisma.salaryPayment.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
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
        },
        profile: true
      },
      orderBy: {
        user: {
          firstName: 'asc'
        }
      }
    });

    // Get paid payments for the month
    const paidPayments = await prisma.salaryPayment.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
        status: 'PAID'
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
        profile: true,
        paidByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        paidAt: 'desc'
      }
    });

    // Calculate totals
    const totalPending = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalPaid = paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalEmployees = pendingPayments.length + paidPayments.length;

    res.json({
      success: true,
      data: {
        month: currentMonth,
        year: currentYear,
        summary: {
          totalEmployees,
          totalPending,
          totalPaid,
          totalAmount: totalPending + totalPaid
        },
        pendingPayments,
        paidPayments
      }
    });
  } catch (error) {
    console.error('Get monthly salary summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly salary summary'
    });
  }
};

// Get salary payment by ID
export const getSalaryPaymentById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.salaryPayment.findUnique({
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
        profile: true,
        paidByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Salary payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get salary payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary payment'
    });
  }
};

// Delete salary payment
export const deleteSalaryPayment = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const payment = await prisma.salaryPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Salary payment not found'
      });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paid salary payment'
      });
    }

    await prisma.salaryPayment.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'DELETE',
      entity: 'SALARY_PAYMENT',
      entityId: id,
      oldValues: payment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Salary payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete salary payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary payment'
    });
  }
};
