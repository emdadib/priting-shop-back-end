import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for accounting
interface TransactionData {
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  reference: string;
  referenceType: 'ORDER' | 'INVOICE' | 'PAYMENT' | 'PURCHASE_ORDER' | 'ADJUSTMENT';
  referenceId: string;
  date: Date;
}

// Get customer ledger
export const getCustomerLedger = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      customerId,
      isActive: true
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.customerTransaction.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.customerTransaction.count({ where });

    // Calculate balance
    const balance = await prisma.customerTransaction.aggregate({
      where: {
        customerId,
        isActive: true
      },
      _sum: {
        amount: true
      }
    });

    return res.json({
      transactions,
      balance: Number(balance._sum.amount || 0),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return res.status(500).json({ error: 'Failed to fetch customer ledger' });
  }
};

// Get supplier ledger
export const getSupplierLedger = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      supplierId,
      isActive: true
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.supplierTransaction.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.supplierTransaction.count({ where });

    // Calculate balance
    const balance = await prisma.supplierTransaction.aggregate({
      where: {
        supplierId,
        isActive: true
      },
      _sum: {
        amount: true
      }
    });

    return res.json({
      transactions,
      balance: Number(balance._sum.amount || 0),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier ledger' });
  }
};

// Get company ledger (self accounting)
export const getCompanyLedger = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, accountType } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isActive: true
    };

    if (accountType) {
      where.accountType = accountType;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.companyTransaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.companyTransaction.count({ where });

    // Calculate balance
    const balance = await prisma.companyTransaction.aggregate({
      where: {
        isActive: true
      },
      _sum: {
        amount: true
      }
    });

    return res.json({
      transactions,
      balance: Number(balance._sum.amount || 0),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching company ledger:', error);
    return res.status(500).json({ error: 'Failed to fetch company ledger' });
  }
};

// Add customer transaction
export const addCustomerTransaction = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      type,
      amount,
      description,
      reference,
      referenceType,
      referenceId,
      date
    } = req.body;

    const transaction = await prisma.customerTransaction.create({
      data: {
        customerId,
        type,
        amount: parseFloat(amount),
        description,
        reference,
        referenceType,
        referenceId,
        date: date ? new Date(date) : new Date(),
        isActive: true
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('Error adding customer transaction:', error);
    return res.status(500).json({ error: 'Failed to add customer transaction' });
  }
};

// Add supplier transaction
export const addSupplierTransaction = async (req: Request, res: Response) => {
  try {
    const {
      supplierId,
      type,
      amount,
      description,
      reference,
      referenceType,
      referenceId,
      date
    } = req.body;

    const transaction = await prisma.supplierTransaction.create({
      data: {
        supplierId,
        type,
        amount: parseFloat(amount),
        description,
        reference,
        referenceType,
        referenceId,
        date: date ? new Date(date) : new Date(),
        isActive: true
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      }
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('Error adding supplier transaction:', error);
    return res.status(500).json({ error: 'Failed to add supplier transaction' });
  }
};

// Add company transaction
export const addCompanyTransaction = async (req: Request, res: Response) => {
  try {
    const {
      accountType,
      type,
      amount,
      description,
      reference,
      referenceType,
      referenceId,
      date
    } = req.body;

    const transaction = await prisma.companyTransaction.create({
      data: {
        accountType,
        type,
        amount: parseFloat(amount),
        description,
        reference,
        referenceType,
        referenceId,
        date: date ? new Date(date) : new Date(),
        isActive: true
      }
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('Error adding company transaction:', error);
    return res.status(500).json({ error: 'Failed to add company transaction' });
  }
};

// Get accounting summary
export const getAccountingSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      isActive: true
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Customer balances
    const customerBalances = await prisma.customerTransaction.groupBy({
      by: ['customerId'],
      where,
      _sum: {
        amount: true
      }
    });

    // Supplier balances
    const supplierBalances = await prisma.supplierTransaction.groupBy({
      by: ['supplierId'],
      where,
      _sum: {
        amount: true
      }
    });

    // Company balances by account type
    const companyBalances = await prisma.companyTransaction.groupBy({
      by: ['accountType'],
      where,
      _sum: {
        amount: true
      }
    });

    // Total receivables and payables
    const totalReceivables = customerBalances.reduce((sum, balance) => {
      return sum + Number(balance._sum.amount || 0);
    }, 0);

    // Calculate actual payables from purchase orders (due amounts)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: {
          in: ['RECEIVED', 'CONFIRMED', 'PARTIAL_RECEIVED']
        }
      },
      select: {
        dueAmount: true,
        paidAmount: true,
        total: true
      }
    });

    const totalPayables = purchaseOrders.reduce((sum, po) => {
      return sum + Number(po.dueAmount?.toString() || '0');
    }, 0);

    return res.json({
      customerBalances,
      supplierBalances,
      companyBalances,
      totalReceivables,
      totalPayables,
      netPosition: totalReceivables - totalPayables
    });
  } catch (error) {
    console.error('Error fetching accounting summary:', error);
    return res.status(500).json({ error: 'Failed to fetch accounting summary' });
  }
};

// Get aging report
export const getAgingReport = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Customer aging
    const customerAging = await prisma.customerTransaction.groupBy({
      by: ['customerId'],
      where: {
        isActive: true,
        type: 'DEBIT'
      },
      _sum: {
        amount: true
      }
    });

    // Supplier aging
    const supplierAging = await prisma.supplierTransaction.groupBy({
      by: ['supplierId'],
      where: {
        isActive: true,
        type: 'CREDIT'
      },
      _sum: {
        amount: true
      }
    });

    return res.json({
      customerAging,
      supplierAging,
      agingBuckets: {
        current: '0-30 days',
        thirtyDays: '31-60 days',
        sixtyDays: '61-90 days',
        overNinety: 'Over 90 days'
      }
    });
  } catch (error) {
    console.error('Error fetching aging report:', error);
    return res.status(500).json({ error: 'Failed to fetch aging report' });
  }
};

// Expense Management Functions

// Get all expenses
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, categoryId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isActive: true,
      accountType: 'EXPENSES'
    };

    if (categoryId) {
      where.expenseCategoryId = categoryId;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.companyTransaction.findMany({
      where,
      include: {
        expenseCategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.companyTransaction.count({ where });

    return res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Add expense
export const addExpense = async (req: Request, res: Response) => {
  try {
    const {
      accountType,
      type,
      amount,
      description,
      reference,
      expenseCategoryId,
      date
    } = req.body;

    const transaction = await prisma.companyTransaction.create({
      data: {
        accountType: accountType || 'EXPENSES',
        type,
        amount: parseFloat(amount),
        description,
        reference,
        expenseCategoryId: expenseCategoryId || null,
        date: date ? new Date(date) : new Date(),
        isActive: true
      },
      include: {
        expenseCategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('Error adding expense:', error);
    return res.status(500).json({ error: 'Failed to add expense' });
  }
};

// Update expense
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      accountType,
      type,
      amount,
      description,
      reference,
      expenseCategoryId,
      date
    } = req.body;

    const transaction = await prisma.companyTransaction.update({
      where: { id },
      data: {
        accountType: accountType || 'EXPENSES',
        type,
        amount: parseFloat(amount),
        description,
        reference,
        expenseCategoryId: expenseCategoryId || null,
        date: date ? new Date(date) : new Date()
      },
      include: {
        expenseCategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    return res.json(transaction);
  } catch (error) {
    console.error('Error updating expense:', error);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
};

// Delete expense
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.companyTransaction.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Get expense summary
export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      isActive: true,
      accountType: 'EXPENSES'
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Total expenses
    const totalExpenses = await prisma.companyTransaction.aggregate({
      where: {
        ...where,
        type: 'DEBIT'
      },
      _sum: {
        amount: true
      }
    });

    // Monthly expenses (current month)
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyExpenses = await prisma.companyTransaction.aggregate({
      where: {
        ...where,
        type: 'DEBIT',
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    // Category breakdown
    const categoryBreakdown = await prisma.companyTransaction.groupBy({
      by: ['expenseCategoryId'],
      where: {
        ...where,
        type: 'DEBIT'
      },
      _sum: {
        amount: true
      }
    });

    // Get category names
    const categories = await prisma.expenseCategory.findMany({
      select: {
        id: true,
        name: true
      }
    });

    const categoryBreakdownWithNames = categoryBreakdown.map(item => {
      const category = categories.find(c => c.id === item.expenseCategoryId);
      const amount = Number(item._sum.amount || 0);
      const total = Number(totalExpenses._sum.amount || 0);
      return {
        category: category?.name || 'Uncategorized',
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      };
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthExpenses = await prisma.companyTransaction.aggregate({
        where: {
          ...where,
          type: 'DEBIT',
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: {
          amount: true
        }
      });

      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: Number(monthExpenses._sum.amount || 0)
      });
    }

    // Top expenses
    const topExpenses = await prisma.companyTransaction.findMany({
      where: {
        ...where,
        type: 'DEBIT'
      },
      include: {
        expenseCategory: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      },
      take: 5
    });

    const topExpensesFormatted = topExpenses.map(expense => ({
      description: expense.description,
      amount: Number(expense.amount),
      category: expense.expenseCategory?.name || 'Uncategorized',
      date: expense.date.toISOString().split('T')[0]
    }));

    return res.json({
      totalExpenses: Number(totalExpenses._sum.amount || 0),
      monthlyExpenses: Number(monthlyExpenses._sum.amount || 0),
      categoryBreakdown: categoryBreakdownWithNames,
      monthlyTrend,
      topExpenses: topExpensesFormatted
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
};

// Expense Category Management

// Get all expense categories
export const getExpenseCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return res.json(categories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

// Add expense category
export const addExpenseCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        description,
        isActive: true
      }
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error('Error adding expense category:', error);
    return res.status(500).json({ error: 'Failed to add expense category' });
  }
};

// Update expense category
export const updateExpenseCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    return res.json(category);
  } catch (error) {
    console.error('Error updating expense category:', error);
    return res.status(500).json({ error: 'Failed to update expense category' });
  }
};

// Delete expense category
export const deleteExpenseCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({ message: 'Expense category deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    return res.status(500).json({ error: 'Failed to delete expense category' });
  }
};