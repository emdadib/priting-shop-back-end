import type { Request, Response } from 'express';

// salaryController imports the shared PrismaClient from ../index, which would
// start the HTTP server; stub the module with in-memory delegates instead.
jest.mock('../index', () => {
  const delegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
  });
  const prisma = {
    employeeSalaryProfile: delegate(),
    salaryPayout: delegate(),
    monthlySalary: delegate(),
    attendanceSalaryDeduction: delegate(),
    user: delegate(),
  };
  return { prisma, __prisma: prisma };
});

jest.mock('../utils/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import * as indexModule from '../index';
import { getMonthReport } from '../controllers/salaryController';

type Delegate = { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock };
const prisma = (indexModule as unknown as { __prisma: Record<string, Delegate> }).__prisma;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const request = (query: Record<string, string>) =>
  ({ query, user: { id: 'admin', role: 'ADMIN' } }) as unknown as Request;

describe('GET /api/salary/month error handling', () => {
  it('tells the admin to run the migration when the salary columns are missing', async () => {
    const missingColumn = Object.assign(new Error('The column `salary_advances.month` does not exist'), { code: 'P2022' });
    prisma.salaryPayout!.findMany.mockRejectedValueOnce(missingColumn);
    const res = mockResponse();

    await getMonthReport(request({ month: '9', year: '2026' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0]![0];
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/npm run migrate:deploy/);
  });

  it('keeps a plain message for other failures', async () => {
    prisma.employeeSalaryProfile!.findMany.mockRejectedValueOnce(new Error('connection reset'));
    const res = mockResponse();

    await getMonthReport(request({ month: '9', year: '2026' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0]![0];
    expect(body.message).toBe('Failed to build the salary report');
  });

  it('returns an empty report when nothing is set up yet', async () => {
    const res = mockResponse();

    await getMonthReport(request({ month: '9', year: '2026' }), res);

    expect(res.status).not.toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0]![0];
    expect(body.success).toBe(true);
    expect(body.data.label).toBe('September 2026');
    expect(body.data.rows).toEqual([]);
    expect(body.data.totals.employees).toBe(0);
  });

  it('rejects an invalid period before touching the database', async () => {
    const res = mockResponse();

    await getMonthReport(request({ month: '13', year: '2026' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.employeeSalaryProfile!.findMany).not.toHaveBeenCalled();
  });
});
