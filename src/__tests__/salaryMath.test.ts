import {
  buildMonthReport,
  comparePeriods,
  computeMonthlySalary,
  isValidPeriod,
  summarizeRows,
  type ReportPayout,
  type ReportProcessed,
  type ReportProfile,
} from '../utils/salaryMath';

const person = (id: string, firstName: string, lastName = 'Test') => ({ id, firstName, lastName, role: 'STAFF' });

const profile = (userId: string, baseSalary: number, firstName = userId): ReportProfile => ({
  id: `profile-${userId}`,
  userId,
  baseSalary,
  user: person(userId, firstName),
});

const payout = (
  userId: string,
  amount: number,
  overrides: Partial<ReportPayout> = {}
): ReportPayout => ({
  id: `payout-${userId}-${amount}`,
  userId,
  amount,
  status: 'PAID',
  date: '2026-09-10T00:00:00.000Z',
  reason: null,
  notes: null,
  givenBy: person('admin', 'Admin'),
  user: person(userId, userId),
  ...overrides,
});

describe('computeMonthlySalary', () => {
  it('pays the remainder when the employee took less than they earned', () => {
    expect(
      computeMonthlySalary({ baseSalary: 20000, deductions: 500, bonuses: 1000, payouts: 8000, previousBalance: 0 })
    ).toEqual({ netAmount: 12500, paidAmount: 12500, carryForward: 0 });
  });

  it('carries the shortfall forward when payouts exceed the salary', () => {
    expect(
      computeMonthlySalary({ baseSalary: 15000, deductions: 0, bonuses: 0, payouts: 18000, previousBalance: 0 })
    ).toEqual({ netAmount: -3000, paidAmount: 0, carryForward: 3000 });
  });

  it('deducts what was owed from earlier months first', () => {
    expect(
      computeMonthlySalary({ baseSalary: 15000, deductions: 0, bonuses: 0, payouts: 4000, previousBalance: 3000 })
    ).toEqual({ netAmount: 8000, paidAmount: 8000, carryForward: 0 });
  });

  it('pays nothing and owes nothing when it comes out exactly even', () => {
    expect(
      computeMonthlySalary({ baseSalary: 10000, deductions: 0, bonuses: 0, payouts: 10000, previousBalance: 0 })
    ).toEqual({ netAmount: 0, paidAmount: 0, carryForward: 0 });
  });

  it('rounds to two decimals and treats missing figures as zero', () => {
    const result = computeMonthlySalary({
      baseSalary: 1000.005,
      deductions: Number.NaN,
      bonuses: 0.1 + 0.2,
      payouts: 0,
      previousBalance: 0,
    });
    expect(result.netAmount).toBe(1000.31);
  });
});

describe('period helpers', () => {
  it('validates month and year ranges', () => {
    expect(isValidPeriod({ month: 9, year: 2026 })).toBe(true);
    expect(isValidPeriod({ month: 13, year: 2026 })).toBe(false);
    expect(isValidPeriod({ month: 0, year: 2026 })).toBe(false);
    expect(isValidPeriod({ month: 1, year: 1999 })).toBe(false);
    expect(isValidPeriod({ month: Number.NaN, year: 2026 })).toBe(false);
  });

  it('orders periods chronologically', () => {
    expect(comparePeriods({ month: 12, year: 2025 }, { month: 1, year: 2026 })).toBeLessThan(0);
    expect(comparePeriods({ month: 3, year: 2026 }, { month: 3, year: 2026 })).toBe(0);
    expect(comparePeriods({ month: 4, year: 2026 }, { month: 3, year: 2026 })).toBeGreaterThan(0);
  });
});

describe('buildMonthReport', () => {
  const period = { month: 9, year: 2026 };

  it('projects each open employee from base, payouts, attendance deduction and previous balance', () => {
    const report = buildMonthReport({
      ...period,
      profiles: [profile('u1', 20000, 'Rahim'), profile('u2', 12000, 'Karim')],
      payouts: [payout('u1', 5000), payout('u1', 3000), payout('u2', 14000)],
      processed: [],
      deductions: [{ userId: 'u1', deductionAmount: 645.16, lateDays: 3, absentDays: 0, totalDeductionDays: 1 }],
      previousBalances: new Map([['u2', 500]]),
    });

    expect(report.label).toBe('September 2026');
    expect(report.rows.map((r) => r.user.firstName)).toEqual(['Karim', 'Rahim']);

    const rahim = report.rows.find((r) => r.userId === 'u1')!;
    expect(rahim.status).toBe('OPEN');
    expect(rahim.payoutsTotal).toBe(8000);
    expect(rahim.payoutsCount).toBe(2);
    expect(rahim.deductions).toBe(645.16);
    expect(rahim.netAmount).toBe(11354.84);
    expect(rahim.paidAmount).toBe(11354.84);
    expect(rahim.carryForward).toBe(0);

    const karim = report.rows.find((r) => r.userId === 'u2')!;
    expect(karim.previousBalance).toBe(500);
    expect(karim.netAmount).toBe(-2500);
    expect(karim.paidAmount).toBe(0);
    expect(karim.carryForward).toBe(2500);

    expect(report.totals).toMatchObject({
      employees: 2,
      openCount: 2,
      processedCount: 0,
      baseSalary: 32000,
      payouts: 22000,
      toPayAtProcessing: 11354.84,
      projectedOwed: 2500,
      paidAtProcessing: 0,
      cashOut: 22000,
    });
  });

  it('uses the stored figures for processed employees and ignores cancelled payouts', () => {
    const processed: ReportProcessed = {
      id: 'm1',
      userId: 'u1',
      status: 'PAID',
      amount: 20000,
      deductions: 0,
      bonuses: 500,
      advances: 6000,
      previousBalance: 0,
      netAmount: 14500,
      paidAmount: 14500,
      carryForward: 0,
      paidAt: '2026-09-30T12:00:00.000Z',
      processedBy: person('admin', 'Admin'),
      notes: null,
      user: person('u1', 'Rahim'),
    };

    const report = buildMonthReport({
      ...period,
      profiles: [profile('u1', 25000, 'Rahim')], // base changed after processing; stored 20000 wins
      payouts: [payout('u1', 6000), payout('u1', 999, { status: 'CANCELLED' })],
      processed: [processed],
      deductions: [],
      previousBalances: new Map(),
    });

    const row = report.rows[0]!;
    expect(row.status).toBe('PROCESSED');
    expect(row.baseSalary).toBe(20000);
    expect(row.payoutsTotal).toBe(6000);
    expect(row.payouts).toHaveLength(1);
    expect(row.processed?.id).toBe('m1');
    expect(report.totals.paidAtProcessing).toBe(14500);
    expect(report.totals.cashOut).toBe(20500);
  });

  it('lists employees who received money but have no base salary, and flags waiting legacy payouts', () => {
    const report = buildMonthReport({
      ...period,
      profiles: [],
      payouts: [payout('u9', 2000), payout('u9', 1000, { status: 'APPROVED', id: 'legacy' })],
      processed: [],
      deductions: [],
      previousBalances: new Map(),
    });

    const row = report.rows[0]!;
    expect(row.hasProfile).toBe(false);
    expect(row.baseSalary).toBe(0);
    expect(row.payoutsTotal).toBe(2000);
    expect(row.pendingPayoutsCount).toBe(1);
    expect(row.carryForward).toBe(2000);
  });

  it('summarizes an empty month', () => {
    expect(summarizeRows([])).toMatchObject({ employees: 0, baseSalary: 0, cashOut: 0 });
  });
});
