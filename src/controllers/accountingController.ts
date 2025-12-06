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

    // Calculate balance properly based on transaction type
    // For customer ledger: balance represents how much the customer owes
    // DEBIT = customer owes money (order created) - adds to balance
    // CREDIT = payment received (reduces what customer owes) - subtracts from balance
    const allTransactions = await prisma.customerTransaction.findMany({
      where: {
        customerId,
        isActive: true
      },
      select: {
        type: true,
        amount: true
      }
    });

    let balance = 0;
    allTransactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      const transactionType = transaction.type;

      if (transactionType === 'DEBIT') {
        // DEBIT increases what customer owes
        balance += amount;
      } else if (transactionType === 'CREDIT') {
        // CREDIT decreases what customer owes (payment received)
        balance -= amount;
      }
    });

    return res.json({
      transactions,
      balance: balance,
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

    // Calculate balance properly based on transaction type
    // For supplier ledger: balance represents how much the supplier owes
    // CREDIT = supplier owes money (payable increases) - adds to balance
    // DEBIT = payment made (payable decreases) - subtracts from balance
    const allTransactions = await prisma.supplierTransaction.findMany({
      where: {
        supplierId,
        isActive: true
      },
      select: {
        type: true,
        amount: true
      }
    });

    let balance = 0;
    allTransactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      const transactionType = transaction.type;

      if (transactionType === 'CREDIT') {
        // CREDIT increases what supplier owes
        balance += amount;
      } else if (transactionType === 'DEBIT') {
        // DEBIT decreases what supplier owes (payment made)
        balance -= amount;
      }
    });

    return res.json({
      transactions,
      balance: balance,
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

    // Calculate balance properly based on account type and transaction type
    // For asset accounts (CASH, BANK): DEBIT increases, CREDIT decreases
    // For liability/equity accounts (EQUITY): CREDIT increases, DEBIT decreases
    // For revenue accounts (SALES): CREDIT increases, DEBIT decreases
    // For expense accounts (EXPENSES, PURCHASES): DEBIT increases, CREDIT decreases
    
    const balanceWhere: any = {
      isActive: true
    };

    // If filtering by accountType, only calculate balance for that account type
    if (accountType) {
      balanceWhere.accountType = accountType;
    }

    const allTransactions = await prisma.companyTransaction.findMany({
      where: balanceWhere,
      select: {
        accountType: true,
        type: true,
        amount: true
      }
    });

    // If filtering by specific accountType, return single balance
    if (accountType) {
      let balance = 0;
      allTransactions.forEach(transaction => {
        const amount = Number(transaction.amount);
        const transactionAccountType = transaction.accountType;
        const transactionType = transaction.type;

        // Asset accounts: DEBIT increases, CREDIT decreases
        if (transactionAccountType === 'CASH' || transactionAccountType === 'BANK') {
          if (transactionType === 'DEBIT') {
            balance += amount;
          } else {
            balance -= amount;
          }
        }
        // Liability/Equity accounts: CREDIT increases, DEBIT decreases
        else if (transactionAccountType === 'EQUITY') {
          if (transactionType === 'CREDIT') {
            balance += amount;
          } else {
            balance -= amount;
          }
        }
        // Revenue accounts: CREDIT increases, DEBIT decreases
        else if (transactionAccountType === 'SALES') {
          if (transactionType === 'CREDIT') {
            balance += amount;
          } else {
            balance -= amount;
          }
        }
        // Expense accounts: DEBIT increases, CREDIT decreases
        else if (transactionAccountType === 'EXPENSES' || transactionAccountType === 'PURCHASES') {
          if (transactionType === 'DEBIT') {
            balance += amount;
          } else {
            balance -= amount;
          }
        }
        // Default: treat as asset (DEBIT increases, CREDIT decreases)
        else {
          if (transactionType === 'DEBIT') {
            balance += amount;
          } else {
            balance -= amount;
          }
        }
      });

      return res.json({
        transactions,
        balance: balance,
        accountType: accountType,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    // If no accountType filter, calculate balances separately for each account type
    const balancesByAccountType: Record<string, number> = {
      CASH: 0,
      BANK: 0,
      EQUITY: 0,
      SALES: 0,
      EXPENSES: 0,
      PURCHASES: 0
    };

    allTransactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      const transactionAccountType = transaction.accountType;
      const transactionType = transaction.type;

      // Initialize account type if not exists
      if (!balancesByAccountType.hasOwnProperty(transactionAccountType)) {
        balancesByAccountType[transactionAccountType] = 0;
      }

      // Asset accounts: DEBIT increases, CREDIT decreases
      if (transactionAccountType === 'CASH' || transactionAccountType === 'BANK') {
        if (transactionType === 'DEBIT') {
          balancesByAccountType[transactionAccountType] += amount;
        } else {
          balancesByAccountType[transactionAccountType] -= amount;
        }
      }
      // Liability/Equity accounts: CREDIT increases, DEBIT decreases
      else if (transactionAccountType === 'EQUITY') {
        if (transactionType === 'CREDIT') {
          balancesByAccountType[transactionAccountType] += amount;
        } else {
          balancesByAccountType[transactionAccountType] -= amount;
        }
      }
      // Revenue accounts: CREDIT increases, DEBIT decreases
      else if (transactionAccountType === 'SALES') {
        if (transactionType === 'CREDIT') {
          balancesByAccountType[transactionAccountType] += amount;
        } else {
          balancesByAccountType[transactionAccountType] -= amount;
        }
      }
      // Expense accounts: DEBIT increases, CREDIT decreases
      else if (transactionAccountType === 'EXPENSES' || transactionAccountType === 'PURCHASES') {
        if (transactionType === 'DEBIT') {
          balancesByAccountType[transactionAccountType] += amount;
        } else {
          balancesByAccountType[transactionAccountType] -= amount;
        }
      }
      // Default: treat as asset (DEBIT increases, CREDIT decreases)
      else {
        if (transactionType === 'DEBIT') {
          balancesByAccountType[transactionAccountType] += amount;
        } else {
          balancesByAccountType[transactionAccountType] -= amount;
        }
      }
    });

    // Calculate net assets (CASH + BANK - this represents actual cash/bank balance)
    const netAssets = balancesByAccountType.CASH + balancesByAccountType.BANK;

    return res.json({
      transactions,
      balance: netAssets, // Return net assets (CASH + BANK) as the main balance for backward compatibility
      balancesByAccountType: balancesByAccountType, // Return detailed balances by account type
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

// Profit Management Functions

// Deposit profit/investor profit (cash increases, equity increases)
export const depositProfit = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      accountType, // 'CASH' or 'BANK'
      description,
      reference,
      date,
      profitType = 'PROFIT' // 'PROFIT' or 'INVESTOR_PROFIT'
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!accountType || (accountType !== 'CASH' && accountType !== 'BANK')) {
      return res.status(400).json({ error: 'Account type must be CASH or BANK' });
    }

    const transactionDate = date ? new Date(date) : new Date();
    const profitDescription = description || `${profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit'} Deposit`;
    const transactionReference = reference || `PROFIT-${Date.now()}`;

    // Create transaction in a transaction to ensure both are created or none
    const result = await prisma.$transaction(async (tx) => {
      // 1. DEBIT cash/bank account (cash increases)
      const cashTransaction = await tx.companyTransaction.create({
        data: {
          accountType: accountType as 'CASH' | 'BANK',
          type: 'DEBIT',
          amount: parseFloat(amount),
          description: `${profitDescription} - Cash Deposit`,
          reference: transactionReference,
          referenceType: 'ADJUSTMENT',
          date: transactionDate,
          isActive: true
        }
      });

      // 2. CREDIT equity account (equity increases)
      const equityTransaction = await tx.companyTransaction.create({
        data: {
          accountType: 'EQUITY',
          type: 'CREDIT',
          amount: parseFloat(amount),
          description: `${profitDescription} - Equity Increase`,
          reference: transactionReference,
          referenceType: 'ADJUSTMENT',
          referenceId: cashTransaction.id,
          date: transactionDate,
          isActive: true
        }
      });

      return {
        cashTransaction,
        equityTransaction
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Profit deposited successfully',
      data: result
    });
  } catch (error) {
    console.error('Error depositing profit:', error);
    return res.status(500).json({ error: 'Failed to deposit profit' });
  }
};

// Withdraw profit/investor profit (cash decreases, equity decreases)
export const withdrawProfit = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      accountType, // 'CASH' or 'BANK'
      description,
      reference,
      date,
      profitType = 'PROFIT' // 'PROFIT' or 'INVESTOR_PROFIT'
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!accountType || (accountType !== 'CASH' && accountType !== 'BANK')) {
      return res.status(400).json({ error: 'Account type must be CASH or BANK' });
    }

    // Check available equity balance before allowing withdrawal
    const equityTransactions = await prisma.companyTransaction.findMany({
      where: {
        isActive: true,
        accountType: 'EQUITY'
      }
    });

    // Calculate current equity balance
    // CREDIT increases equity (deposits), DEBIT decreases equity (withdrawals)
    const equityBalance = equityTransactions.reduce((balance, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'CREDIT') {
        return balance + amount;
      } else {
        return balance - amount;
      }
    }, 0);

    // Check if withdrawal amount exceeds available equity
    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > equityBalance) {
      return res.status(400).json({ 
        error: `Insufficient equity balance. Available: ${equityBalance.toFixed(2)}, Requested: ${withdrawalAmount.toFixed(2)}` 
      });
    }

    const transactionDate = date ? new Date(date) : new Date();
    const profitDescription = description || `${profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit'} Withdrawal`;
    const transactionReference = reference || `WITHDRAW-${Date.now()}`;

    // Create transaction in a transaction to ensure both are created or none
    const result = await prisma.$transaction(async (tx) => {
      // 1. CREDIT cash/bank account (cash decreases)
      const cashTransaction = await tx.companyTransaction.create({
        data: {
          accountType: accountType as 'CASH' | 'BANK',
          type: 'CREDIT',
          amount: parseFloat(amount),
          description: `${profitDescription} - Cash Withdrawal`,
          reference: transactionReference,
          referenceType: 'ADJUSTMENT',
          date: transactionDate,
          isActive: true
        }
      });

      // 2. DEBIT equity account (equity decreases)
      const equityTransaction = await tx.companyTransaction.create({
        data: {
          accountType: 'EQUITY',
          type: 'DEBIT',
          amount: parseFloat(amount),
          description: `${profitDescription} - Equity Decrease`,
          reference: transactionReference,
          referenceType: 'ADJUSTMENT',
          referenceId: cashTransaction.id,
          date: transactionDate,
          isActive: true
        }
      });

      return {
        cashTransaction,
        equityTransaction
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Profit withdrawn successfully',
      data: result
    });
  } catch (error) {
    console.error('Error withdrawing profit:', error);
    return res.status(500).json({ error: 'Failed to withdraw profit' });
  }
};

// Calculate and record profit from sales automatically
export const calculateAndRecordProfit = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, description } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    periodEnd.setHours(23, 59, 59, 999); // End of day

    // 1. Get all SALES revenue (CREDIT entries)
    const salesTransactions = await prisma.companyTransaction.findMany({
      where: {
        accountType: 'SALES',
        type: 'CREDIT',
        isActive: true,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    const totalRevenue = salesTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // 2. Get Cost of Goods Sold (COGS) from completed orders
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                baseCostPrice: true
              }
            }
          }
        }
      }
    });

    // Calculate COGS
    let totalCOGS = 0;
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const itemCost = Number(item.product.baseCostPrice) * Number(item.quantity);
        totalCOGS += itemCost;
      });
    });

    // 3. Get all operating expenses (EXPENSES account DEBIT entries)
    const expenseTransactions = await prisma.companyTransaction.findMany({
      where: {
        accountType: 'EXPENSES',
        type: 'DEBIT',
        isActive: true,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // 4. Calculate Net Profit: Revenue - COGS - Operating Expenses
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    // 5. If there's profit, record it in the accounting system
    // This creates closing entries to transfer profit to equity
    if (netProfit !== 0) {
      const profitDescription = description || `Period Profit/Loss ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`;
      const transactionReference = `PROFIT-CALC-${Date.now()}`;
      const transactionDate = new Date();

      await prisma.$transaction(async (tx) => {
        if (netProfit > 0) {
          // Profit: CREDIT EQUITY, DEBIT RETAINED_EARNINGS (or directly adjust)
          // In double-entry: Close Sales to Equity (Sales decreases, Equity increases)
          
          // Close Sales Revenue: DEBIT SALES (to zero it out), CREDIT EQUITY
          await tx.companyTransaction.create({
            data: {
              accountType: 'SALES',
              type: 'DEBIT',
              amount: totalRevenue,
              description: `${profitDescription} - Close Sales Revenue`,
              reference: transactionReference,
              referenceType: 'ADJUSTMENT',
              date: transactionDate,
              isActive: true
            }
          });

          // Record COGS as expense
          if (totalCOGS > 0) {
            await tx.companyTransaction.create({
              data: {
                accountType: 'EXPENSES',
                type: 'DEBIT',
                amount: totalCOGS,
                description: `${profitDescription} - Cost of Goods Sold`,
                reference: transactionReference,
                referenceType: 'ADJUSTMENT',
                date: transactionDate,
                isActive: true
              }
            });
          }

          // Net profit increases equity
          await tx.companyTransaction.create({
            data: {
              accountType: 'EQUITY',
              type: 'CREDIT',
              amount: netProfit,
              description: `${profitDescription} - Net Profit`,
              reference: transactionReference,
              referenceType: 'ADJUSTMENT',
              date: transactionDate,
              isActive: true
            }
          });
        } else {
          // Loss: DEBIT EQUITY, CREDIT LOSS
          await tx.companyTransaction.create({
            data: {
              accountType: 'SALES',
              type: 'DEBIT',
              amount: totalRevenue,
              description: `${profitDescription} - Close Sales Revenue`,
              reference: transactionReference,
              referenceType: 'ADJUSTMENT',
              date: transactionDate,
              isActive: true
            }
          });

          if (totalCOGS > 0) {
            await tx.companyTransaction.create({
              data: {
                accountType: 'EXPENSES',
                type: 'DEBIT',
                amount: totalCOGS,
                description: `${profitDescription} - Cost of Goods Sold`,
                reference: transactionReference,
                referenceType: 'ADJUSTMENT',
                date: transactionDate,
                isActive: true
              }
            });
          }

          // Net loss decreases equity
          await tx.companyTransaction.create({
            data: {
              accountType: 'EQUITY',
              type: 'DEBIT',
              amount: Math.abs(netProfit),
              description: `${profitDescription} - Net Loss`,
              reference: transactionReference,
              referenceType: 'ADJUSTMENT',
              date: transactionDate,
              isActive: true
            }
          });
        }
      });

      return res.json({
        success: true,
        message: 'Profit calculated and recorded successfully',
        data: {
          period: {
            startDate: periodStart,
            endDate: periodEnd
          },
          calculation: {
            totalRevenue,
            totalCOGS,
            totalExpenses,
            netProfit
          },
          recorded: true
        }
      });
    } else {
      return res.json({
        success: true,
        message: 'No profit or loss for this period',
        data: {
          period: {
            startDate: periodStart,
            endDate: periodEnd
          },
          calculation: {
            totalRevenue,
            totalCOGS,
            totalExpenses,
            netProfit
          },
          recorded: false
        }
      });
    }
  } catch (error) {
    console.error('Error calculating profit:', error);
    return res.status(500).json({ error: 'Failed to calculate and record profit' });
  }
};

// Get profit summary
export const getProfitSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, profitType } = req.query;

    const where: any = {
      isActive: true,
      accountType: 'EQUITY'
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Filter by profit type if specified
    if (profitType) {
      const profitTypeStr = profitType === 'INVESTOR_PROFIT' ? 'Investor Profit' : 'Profit';
      where.description = {
        contains: profitTypeStr
      };
    }

    // Get all equity transactions
    const equityTransactions = await prisma.companyTransaction.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate totals
    const deposits = equityTransactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const withdrawals = equityTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netProfit = deposits - withdrawals;

    // Separate investor profit if applicable
    const investorDeposits = equityTransactions
      .filter(t => t.type === 'CREDIT' && t.description.toLowerCase().includes('investor'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const investorWithdrawals = equityTransactions
      .filter(t => t.type === 'DEBIT' && t.description.toLowerCase().includes('investor'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const regularDeposits = equityTransactions
      .filter(t => t.type === 'CREDIT' && !t.description.toLowerCase().includes('investor'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const regularWithdrawals = equityTransactions
      .filter(t => t.type === 'DEBIT' && !t.description.toLowerCase().includes('investor'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return res.json({
      total: {
        deposits,
        withdrawals,
        netProfit
      },
      regular: {
        deposits: regularDeposits,
        withdrawals: regularWithdrawals,
        netProfit: regularDeposits - regularWithdrawals
      },
      investor: {
        deposits: investorDeposits,
        withdrawals: investorWithdrawals,
        netProfit: investorDeposits - investorWithdrawals
      },
      transactions: equityTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        date: t.date,
        reference: t.reference
      }))
    });
  } catch (error) {
    console.error('Error fetching profit summary:', error);
    return res.status(500).json({ error: 'Failed to fetch profit summary' });
  }
};

// Find orphaned transactions (transactions referencing non-existent orders)
export const findOrphanedTransactions = async (req: Request, res: Response) => {
  try {
    // Find all company transactions with ORDER reference type
    const orderTransactions = await prisma.companyTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        isActive: true
      },
      select: {
        id: true,
        accountType: true,
        type: true,
        amount: true,
        description: true,
        reference: true,
        referenceId: true,
        date: true,
        createdAt: true
      }
    });

    // Find all customer transactions with ORDER reference type
    const customerOrderTransactions = await prisma.customerTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        isActive: true
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        referenceId: true,
        date: true,
        createdAt: true
      }
    });

    // Get all existing order IDs
    const existingOrders = await prisma.order.findMany({
      select: { id: true, orderNumber: true }
    });
    const existingOrderIds = new Set(existingOrders.map(o => o.id));
    const orderNumberMap = new Map(existingOrders.map(o => [o.id, o.orderNumber]));

    // Find orphaned company transactions
    const orphanedCompanyTransactions = orderTransactions.filter(
      t => t.referenceId && !existingOrderIds.has(t.referenceId)
    );

    // Find orphaned customer transactions
    const orphanedCustomerTransactions = customerOrderTransactions.filter(
      t => t.referenceId && !existingOrderIds.has(t.referenceId)
    );

    return res.json({
      orphanedCompanyTransactions: orphanedCompanyTransactions.map(t => ({
        id: t.id,
        accountType: t.accountType,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        reference: t.reference,
        referenceId: t.referenceId,
        date: t.date,
        createdAt: t.createdAt
      })),
      orphanedCustomerTransactions: orphanedCustomerTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        referenceId: t.referenceId,
        date: t.date,
        createdAt: t.createdAt
      })),
      totalOrphaned: orphanedCompanyTransactions.length + orphanedCustomerTransactions.length
    });
  } catch (error) {
    console.error('Error finding orphaned transactions:', error);
    return res.status(500).json({ error: 'Failed to find orphaned transactions' });
  }
};

// Clean up orphaned transactions (mark as inactive)
export const cleanupOrphanedTransactions = async (req: Request, res: Response) => {
  try {
    // Get all existing order IDs
    const existingOrders = await prisma.order.findMany({
      select: { id: true }
    });
    const existingOrderIds = new Set(existingOrders.map(o => o.id));

    // Mark orphaned company transactions as inactive
    const orphanedCompanyTransactions = await prisma.companyTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        isActive: true
      },
      select: { id: true, referenceId: true }
    });

    const orphanedCompanyIds = orphanedCompanyTransactions
      .filter(t => t.referenceId && !existingOrderIds.has(t.referenceId))
      .map(t => t.id);

    if (orphanedCompanyIds.length > 0) {
      await prisma.companyTransaction.updateMany({
        where: {
          id: { in: orphanedCompanyIds }
        },
        data: {
          isActive: false
        }
      });
    }

    // Mark orphaned customer transactions as inactive
    const orphanedCustomerTransactions = await prisma.customerTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        isActive: true
      },
      select: { id: true, referenceId: true }
    });

    const orphanedCustomerIds = orphanedCustomerTransactions
      .filter(t => t.referenceId && !existingOrderIds.has(t.referenceId))
      .map(t => t.id);

    if (orphanedCustomerIds.length > 0) {
      await prisma.customerTransaction.updateMany({
        where: {
          id: { in: orphanedCustomerIds }
        },
        data: {
          isActive: false
        }
      });
    }

    return res.json({
      success: true,
      message: 'Orphaned transactions cleaned up successfully',
      cleanedCompanyTransactions: orphanedCompanyIds.length,
      cleanedCustomerTransactions: orphanedCustomerIds.length,
      totalCleaned: orphanedCompanyIds.length + orphanedCustomerIds.length
    });
  } catch (error) {
    console.error('Error cleaning up orphaned transactions:', error);
    return res.status(500).json({ error: 'Failed to clean up orphaned transactions' });
  }
};