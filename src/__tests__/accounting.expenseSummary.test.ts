import type { Request, Response } from 'express';

// accountingController instantiates its own PrismaClient at import time, so the
// /client module is stubbed. Every `new PrismaClient()` returns the same
// in-memory delegates, exposed for assertions via `__mockDelegates`.
jest.mock('@prisma/client', () => {
  const companyTransaction = { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() };
  const expenseCategory = { findMany: jest.fn() };
  return {
    PrismaClient: jest.fn(() => ({ companyTransaction, expenseCategory })),
    __mockDelegates: { companyTransaction, expenseCategory },
  };
});

import * as prismaClientModule from '@prisma/client';
import { getExpenseSummary } from '../controllers/accountingController';

const { companyTransaction, expenseCategory } = (
  prismaClientModule as unknown as {
    __mockDelegates: {
      companyTransaction: { aggregate: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
      expenseCategory: { findMany: jest.Mock };
    };
  }
).__mockDelegates;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const summaryRequest = (query: Record<string, string>) => ({ query }) as unknown as Request;

beforeEach(() => {
  jest.resetAllMocks();
  // First aggregate call is the period total; the rest (this month, 6-month trend) are zero.
  companyTransaction.aggregate
    .mockResolvedValueOnce({ _sum: { amount: 10000 } })
    .mockResolvedValue({ _sum: { amount: 0 } });
  companyTransaction.groupBy.mockResolvedValue([
    { expenseCategoryId: 'cat-utilities', _sum: { amount: 2000 }, _count: { _all: 4 } },
    { expenseCategoryId: 'cat-rent', _sum: { amount: 5000 }, _count: { _all: 1 } },
    { expenseCategoryId: null, _sum: { amount: 3000 }, _count: { _all: 2 } },
  ]);
  expenseCategory.findMany.mockResolvedValue([
    { id: 'cat-rent', name: 'Rent' },
    { id: 'cat-utilities', name: 'Utilities' },
  ]);
  companyTransaction.findMany.mockResolvedValue([]);
});

describe('GET /api/accounting/expense-summary category breakdown', () => {
  it('returns amount, entry count and share per category, largest first', async () => {
    const res = mockResponse();

    await getExpenseSummary(summaryRequest({ startDate: '2026-09-01', endDate: '2026-09-30' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.totalExpenses).toBe(10000);
    expect(body.categoryBreakdown).toEqual([
      { categoryId: 'cat-rent', category: 'Rent', amount: 5000, count: 1, percentage: 50 },
      { categoryId: null, category: 'Uncategorized', amount: 3000, count: 2, percentage: 30 },
      { categoryId: 'cat-utilities', category: 'Utilities', amount: 2000, count: 4, percentage: 20 },
    ]);
  });

  it('groups only active DEBIT expenses inside the requested date range', async () => {
    await getExpenseSummary(summaryRequest({ startDate: '2026-09-01', endDate: '2026-09-30' }), mockResponse());

    expect(companyTransaction.groupBy).toHaveBeenCalledTimes(1);
    expect(companyTransaction.groupBy).toHaveBeenCalledWith({
      by: ['expenseCategoryId'],
      where: {
        isActive: true,
        accountType: 'EXPENSES',
        type: 'DEBIT',
        date: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
  });

  it('reports a zero share for every category when the period total is zero', async () => {
    companyTransaction.aggregate.mockReset();
    companyTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    companyTransaction.groupBy.mockResolvedValue([
      { expenseCategoryId: 'cat-rent', _sum: { amount: null }, _count: { _all: 0 } },
    ]);
    const res = mockResponse();

    await getExpenseSummary(summaryRequest({}), res);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.totalExpenses).toBe(0);
    expect(body.categoryBreakdown).toEqual([
      { categoryId: 'cat-rent', category: 'Rent', amount: 0, count: 0, percentage: 0 },
    ]);
  });
});
