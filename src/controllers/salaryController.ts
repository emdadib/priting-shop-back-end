import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';
import {
  buildMonthReport,
  comparePeriods,
  computeMonthlySalary,
  isValidPeriod,
  periodLabel,
  round2,
  toNumber,
  type Period,
  type PersonRef,
  type ReportDeduction,
  type ReportPayout,
  type ReportProcessed,
  type ReportProfile,
} from '../utils/salaryMath';

/**
 * Salary module.
 *
 *  - profiles : each employee's monthly base salary
 *  - payouts  : cash handed to an employee during the month (one step: the
 *               money is given when the row is recorded)
 *  - process  : month-end settlement per employee -> pays the remainder or
 *               carries the shortfall forward
 *
 * Every cash movement is mirrored into company_transactions (CASH credit +
 * EXPENSES debit under the "Salary" expense category) so the accounting
 * reports stay in sync. Reversals deactivate those rows via `referenceId`.
 */

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

const SALARY_EXPENSE_CATEGORY = 'Salary';
const ACTIVE_PAYOUT_STATUSES = ['PENDING', 'APPROVED', 'PAID'] as const;

/** A closed month: salary paid out (PAID) or skipped because the employee was not present for the full month. */
const CLOSED_STATUSES = ['PAID', 'SKIPPED'] as const;
type ClosedStatus = (typeof CLOSED_STATUSES)[number];
const isClosed = (status: string | null | undefined): status is ClosedStatus =>
  (CLOSED_STATUSES as readonly string[]).includes(status ?? '');
const closedMessage = (status: ClosedStatus, period: Period) =>
  status === 'SKIPPED'
    ? `${periodLabel(period)} was skipped (closed without salary) for this employee. Undo the skip first.`
    : `${periodLabel(period)} is already processed for this employee. Undo the processing first.`;

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const actorSelect = { id: true, firstName: true, lastName: true } as const;

const payoutInclude = {
  user: { select: userSelect },
  paidByUser: { select: actorSelect },
} as const;

const monthlyInclude = {
  user: { select: userSelect },
  paidByUser: { select: actorSelect },
} as const;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, message });

/**
 * 500 whose message tells the admin what to do. The common field failure is
 * a database that has not had the salary migration applied yet (Prisma
 * P2021 = table missing, P2022 = column missing).
 */
const failFromError = (res: Response, error: unknown, fallback: string) => {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P2021' || code === 'P2022') {
    return fail(
      res,
      500,
      `${fallback}: the database is behind the code. Run "npm run migrate:deploy" inside server/ and restart the server.`
    );
  }
  return fail(res, 500, fallback);
};

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

function parsePeriod(src: { month?: unknown; year?: unknown }): Period {
  const now = new Date();
  const month = src.month !== undefined && src.month !== '' ? parseInt(String(src.month), 10) : now.getMonth() + 1;
  const year = src.year !== undefined && src.year !== '' ? parseInt(String(src.year), 10) : now.getFullYear();
  return { month, year };
}

const toIso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

type PayoutRecord = Prisma.SalaryPayoutGetPayload<{ include: typeof payoutInclude }>;
type MonthlyRecord = Prisma.MonthlySalaryGetPayload<{ include: typeof monthlyInclude }>;
type ProfileRecord = Prisma.EmployeeSalaryProfileGetPayload<{ include: { user: { select: typeof userSelect } } }>;

const toPayout = (p: PayoutRecord): ReportPayout => ({
  id: p.id,
  userId: p.userId,
  amount: toNumber(p.amount),
  status: p.status,
  date: (p.paidAt ?? p.requestDate).toISOString(),
  reason: p.reason ?? null,
  notes: p.notes ?? null,
  givenBy: p.paidByUser ?? null,
  user: p.user,
});

const toProcessed = (m: MonthlyRecord): ReportProcessed => ({
  id: m.id,
  userId: m.userId,
  status: m.status,
  amount: toNumber(m.amount),
  deductions: toNumber(m.deductions),
  bonuses: toNumber(m.bonuses),
  advances: toNumber(m.advances),
  previousBalance: toNumber(m.previousBalance),
  netAmount: toNumber(m.netAmount),
  paidAmount: toNumber(m.paidAmount),
  carryForward: toNumber(m.carryForward),
  paidAt: toIso(m.paidAt),
  processedBy: m.paidByUser ?? null,
  notes: m.notes ?? null,
  user: m.user,
});

const toProfile = (p: ProfileRecord): ReportProfile => ({
  id: p.id,
  userId: p.userId,
  baseSalary: toNumber(p.baseSalary),
  user: p.user,
});

const toDeduction = (d: {
  userId: string;
  deductionAmount: Prisma.Decimal | number;
  lateDays: number;
  absentDays: number;
  totalDeductionDays: Prisma.Decimal | number;
}): ReportDeduction => ({
  userId: d.userId,
  deductionAmount: toNumber(d.deductionAmount),
  lateDays: d.lateDays,
  absentDays: d.absentDays,
  totalDeductionDays: toNumber(d.totalDeductionDays),
});

async function salaryExpenseCategoryId(tx: Tx): Promise<string> {
  const category = await tx.expenseCategory.upsert({
    where: { name: SALARY_EXPENSE_CATEGORY },
    update: {},
    create: { name: SALARY_EXPENSE_CATEGORY, description: 'Employee salaries and salary payouts' },
  });
  return category.id;
}

/** Cash leaves the box and is booked as a salary expense. */
async function recordCashOut(
  tx: Tx,
  args: { amount: number; description: string; reference: string; referenceId: string; date: Date }
): Promise<void> {
  if (args.amount <= 0) return;
  const expenseCategoryId = await salaryExpenseCategoryId(tx);
  const shared = {
    amount: args.amount,
    description: args.description,
    reference: args.reference,
    referenceType: 'ADJUSTMENT' as const,
    referenceId: args.referenceId,
    date: args.date,
    isActive: true,
  };
  await tx.companyTransaction.create({ data: { ...shared, accountType: 'CASH', type: 'CREDIT' } });
  await tx.companyTransaction.create({
    data: { ...shared, accountType: 'EXPENSES', type: 'DEBIT', expenseCategoryId },
  });
}

/**
 * Reverse the cash-out for a payout / processed month. Rows written by this
 * module carry `referenceId`; rows written by the old salary code only carry
 * the `reference` string, so both are matched.
 */
async function voidCashOut(tx: Tx, referenceId: string, references: string[]): Promise<void> {
  await tx.companyTransaction.updateMany({
    where: {
      referenceType: 'ADJUSTMENT',
      isActive: true,
      OR: [{ referenceId }, { reference: { in: references } }],
    },
    data: { isActive: false },
  });
}

/** Latest processed month strictly before `period` for this employee. */
function latestProcessedBefore(db: Db, userId: string, period: Period) {
  return db.monthlySalary.findFirst({
    where: {
      userId,
      status: { in: [...CLOSED_STATUSES] },
      OR: [{ year: { lt: period.year } }, { year: period.year, month: { lt: period.month } }],
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

/** Earliest processed month strictly after `period` for this employee. */
function firstProcessedAfter(db: Db, userId: string, period: Period) {
  return db.monthlySalary.findFirst({
    where: {
      userId,
      status: { in: [...CLOSED_STATUSES] },
      OR: [{ year: { gt: period.year } }, { year: period.year, month: { gt: period.month } }],
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
}

function audit(req: Request, entry: Omit<Parameters<typeof createAuditLog>[0], 'userId' | 'ipAddress' | 'userAgent'>) {
  return createAuditLog({
    userId: req.user?.id || 'unknown',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    ...entry,
  });
}

// ---------------------------------------------------------------------------
// Profiles (base salary)
// ---------------------------------------------------------------------------

export const getProfiles = async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const profiles = await prisma.employeeSalaryProfile.findMany({
      where: { isActive: true },
      include: { user: { select: userSelect } },
      orderBy: { user: { firstName: 'asc' } },
    });
    return res.json({ success: true, data: profiles.map(toProfile) });
  } catch (error) {
    console.error('Get salary profiles error:', error);
    return failFromError(res, error, 'Failed to fetch salary profiles');
  }
};

export const setBaseSalary = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, baseSalary, notes } = req.body as { userId: string; baseSalary: number; notes?: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return fail(res, 404, 'Employee not found');

    const existing = await prisma.employeeSalaryProfile.findUnique({ where: { userId } });
    const profile = await prisma.employeeSalaryProfile.upsert({
      where: { userId },
      update: { baseSalary: round2(toNumber(baseSalary)), notes: notes ?? null, isActive: true, endDate: null },
      create: { userId, baseSalary: round2(toNumber(baseSalary)), notes: notes ?? null, isActive: true },
      include: { user: { select: userSelect } },
    });

    await audit(req, {
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'EMPLOYEE_SALARY_PROFILE',
      entityId: profile.id,
      oldValues: existing ? { baseSalary: toNumber(existing.baseSalary) } : undefined,
      newValues: { userId, baseSalary: toNumber(baseSalary), notes },
    });

    return res.status(existing ? 200 : 201).json({ success: true, data: toProfile(profile) });
  } catch (error) {
    console.error('Set base salary error:', error);
    return failFromError(res, error, 'Failed to save base salary');
  }
};

// ---------------------------------------------------------------------------
// Month report
// ---------------------------------------------------------------------------

async function loadMonthReport(period: Period) {
  const { month, year } = period;
  const beforePeriod = {
    OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
  };

  const [profiles, payouts, processed, deductions, earlier] = await Promise.all([
    prisma.employeeSalaryProfile.findMany({
      where: { isActive: true, user: { isActive: true } },
      include: { user: { select: userSelect } },
    }),
    prisma.salaryPayout.findMany({
      where: { year, month, status: { in: [...ACTIVE_PAYOUT_STATUSES] } },
      include: payoutInclude,
      orderBy: { requestDate: 'asc' },
    }),
    prisma.monthlySalary.findMany({ where: { year, month }, include: monthlyInclude }),
    prisma.attendanceSalaryDeduction.findMany({ where: { year, month } }),
    prisma.monthlySalary.findMany({
      where: { status: { in: [...CLOSED_STATUSES] }, ...beforePeriod },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { userId: true, carryForward: true },
    }),
  ]);

  const previousBalances = new Map<string, number>();
  for (const row of earlier) {
    if (!previousBalances.has(row.userId)) previousBalances.set(row.userId, toNumber(row.carryForward));
  }

  return buildMonthReport({
    month,
    year,
    profiles: profiles.map(toProfile),
    payouts: payouts.map(toPayout),
    processed: processed.map(toProcessed),
    deductions: deductions.map(toDeduction),
    previousBalances,
  });
}

export const getMonthReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const period = parsePeriod(req.query);
    if (!isValidPeriod(period)) return fail(res, 400, 'Invalid month or year');
    return res.json({ success: true, data: await loadMonthReport(period) });
  } catch (error) {
    console.error('Get salary month report error:', error);
    return failFromError(res, error, 'Failed to build the salary report');
  }
};

/** One employee across a whole year: processed months as stored, open months with what is known so far. */
export const getEmployeeYear = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = String(req.params.userId);
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(res, 400, 'Invalid year');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) return fail(res, 404, 'Employee not found');

    const [profile, payouts, processed, deductions] = await Promise.all([
      prisma.employeeSalaryProfile.findUnique({ where: { userId } }),
      prisma.salaryPayout.findMany({
        where: { userId, year, status: { in: [...ACTIVE_PAYOUT_STATUSES] } },
        include: payoutInclude,
        orderBy: { requestDate: 'asc' },
      }),
      prisma.monthlySalary.findMany({ where: { userId, year }, include: monthlyInclude }),
      prisma.attendanceSalaryDeduction.findMany({ where: { userId, year } }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
      const monthPayouts = payouts.filter((p) => p.month === month).map(toPayout);
      const row = processed.find((m) => m.month === month && isClosed(m.status));
      const attendance = deductions.find((d) => d.month === month);
      const payoutsTotal = round2(
        monthPayouts.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
      );
      if (row) {
        const plain = toProcessed(row);
        return {
          month,
          year,
          label: periodLabel({ month, year }),
          status: row.status === 'SKIPPED' ? ('SKIPPED' as const) : ('PROCESSED' as const),
          baseSalary: plain.amount,
          payoutsTotal: plain.advances,
          payoutsCount: monthPayouts.filter((p) => p.status === 'PAID').length,
          deductions: plain.deductions,
          bonuses: plain.bonuses,
          previousBalance: plain.previousBalance,
          netAmount: plain.netAmount,
          paidAmount: plain.paidAmount,
          carryForward: plain.carryForward,
          processedAt: plain.paidAt,
          processedBy: plain.processedBy,
          processedId: plain.id,
          payouts: monthPayouts,
        };
      }
      return {
        month,
        year,
        label: periodLabel({ month, year }),
        status: 'OPEN' as const,
        baseSalary: profile && profile.isActive ? toNumber(profile.baseSalary) : 0,
        payoutsTotal,
        payoutsCount: monthPayouts.filter((p) => p.status === 'PAID').length,
        deductions: toNumber(attendance?.deductionAmount),
        bonuses: 0,
        previousBalance: null,
        netAmount: null,
        paidAmount: null,
        carryForward: null,
        processedAt: null,
        processedBy: null,
        processedId: null,
        payouts: monthPayouts,
      };
    });

    const totals = months.reduce(
      (acc, m) => {
        acc.payouts += m.payoutsTotal;
        if (m.status === 'PROCESSED') {
          acc.paidAtProcessing += m.paidAmount ?? 0;
          acc.deductions += m.deductions;
          acc.bonuses += m.bonuses;
          acc.processedMonths += 1;
        }
        return acc;
      },
      { payouts: 0, paidAtProcessing: 0, deductions: 0, bonuses: 0, processedMonths: 0 }
    );

    const latest = await latestProcessedBefore(prisma, userId, { month: 12, year: year + 1 });

    return res.json({
      success: true,
      data: {
        user,
        year,
        baseSalary: profile && profile.isActive ? toNumber(profile.baseSalary) : null,
        currentBalanceOwed: toNumber(latest?.carryForward),
        months,
        totals: {
          payouts: round2(totals.payouts),
          paidAtProcessing: round2(totals.paidAtProcessing),
          cashOut: round2(totals.payouts + totals.paidAtProcessing),
          deductions: round2(totals.deductions),
          bonuses: round2(totals.bonuses),
          processedMonths: totals.processedMonths,
        },
      },
    });
  } catch (error) {
    console.error('Get employee salary year error:', error);
    return failFromError(res, error, 'Failed to fetch employee salary history');
  }
};

// ---------------------------------------------------------------------------
// Payouts (cash given during the month)
// ---------------------------------------------------------------------------

export const createPayout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, amount, reason, notes, date } = req.body as {
      userId: string; amount: number; reason?: string; notes?: string; date?: string;
    };
    const period = parsePeriod(req.body);
    if (!isValidPeriod(period)) return fail(res, 400, 'Invalid month or year');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) return fail(res, 404, 'Employee not found');
    if (!user.isActive) return fail(res, 400, 'Employee is not active');

    const processed = await prisma.monthlySalary.findUnique({
      where: { userId_month_year: { userId, month: period.month, year: period.year } },
    });
    if (processed && isClosed(processed.status)) {
      return fail(res, 400, closedMessage(processed.status, period));
    }

    const givenAt = date ? new Date(date) : new Date();
    if (Number.isNaN(givenAt.getTime())) return fail(res, 400, 'Invalid date');
    const value = round2(toNumber(amount));
    if (value <= 0) return fail(res, 400, 'Amount must be greater than zero');

    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.salaryPayout.create({
        data: {
          userId,
          amount: value,
          month: period.month,
          year: period.year,
          requestDate: givenAt,
          status: 'PAID',
          paidBy: req.user?.id,
          paidAt: givenAt,
          approvedBy: req.user?.id,
          approvedAt: givenAt,
          reason: reason || null,
          notes: notes || null,
        },
        include: payoutInclude,
      });
      await recordCashOut(tx, {
        amount: value,
        description: `Salary payout - ${fullName(user)} (${periodLabel(period)})`,
        reference: `SALARY-PAYOUT-${created.id}`,
        referenceId: created.id,
        date: givenAt,
      });
      return created;
    });

    await audit(req, {
      action: 'CREATE',
      entity: 'SALARY_PAYOUT',
      entityId: payout.id,
      newValues: { userId, amount: value, month: period.month, year: period.year, reason, notes, date: givenAt },
    });

    return res.status(201).json({ success: true, data: toPayout(payout) });
  } catch (error) {
    console.error('Create salary payout error:', error);
    return failFromError(res, error, 'Failed to record salary payout');
  }
};

/** Legacy rows from the old request/approve flow: hand the money over now. */
export const payPendingPayout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.salaryPayout.findUnique({ where: { id }, include: payoutInclude });
    if (!existing) return fail(res, 404, 'Payout not found');
    if (existing.status === 'PAID') return fail(res, 400, 'Already handed over');
    if (existing.status !== 'PENDING' && existing.status !== 'APPROVED') {
      return fail(res, 400, 'Only waiting payouts can be handed over');
    }
    const period = { month: existing.month, year: existing.year };
    const processed = await prisma.monthlySalary.findUnique({
      where: { userId_month_year: { userId: existing.userId, ...period } },
    });
    if (processed && isClosed(processed.status)) return fail(res, 400, closedMessage(processed.status, period));

    const now = new Date();
    const payout = await prisma.$transaction(async (tx) => {
      const updated = await tx.salaryPayout.update({
        where: { id },
        data: { status: 'PAID', paidBy: req.user?.id, paidAt: now, approvedBy: existing.approvedBy ?? req.user?.id, approvedAt: existing.approvedAt ?? now },
        include: payoutInclude,
      });
      await recordCashOut(tx, {
        amount: toNumber(existing.amount),
        description: `Salary payout - ${fullName(existing.user)} (${periodLabel(period)})`,
        reference: `SALARY-PAYOUT-${id}`,
        referenceId: id,
        date: now,
      });
      return updated;
    });

    await audit(req, {
      action: 'UPDATE',
      entity: 'SALARY_PAYOUT',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'PAID', paidBy: req.user?.id, paidAt: now },
    });

    return res.json({ success: true, data: toPayout(payout) });
  } catch (error) {
    console.error('Pay pending payout error:', error);
    return failFromError(res, error, 'Failed to hand over payout');
  }
};

export const cancelPayout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.salaryPayout.findUnique({ where: { id } });
    if (!existing) return fail(res, 404, 'Payout not found');
    if (existing.status === 'PAID') return fail(res, 400, 'Money already handed over. Delete the payout instead.');
    if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') return fail(res, 400, 'Already cancelled');

    const updated = await prisma.salaryPayout.update({
      where: { id },
      data: { status: 'CANCELLED', notes: (req.body as { reason?: string }).reason || existing.notes },
      include: payoutInclude,
    });

    await audit(req, {
      action: 'UPDATE',
      entity: 'SALARY_PAYOUT',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED' },
    });

    return res.json({ success: true, data: toPayout(updated) });
  } catch (error) {
    console.error('Cancel payout error:', error);
    return failFromError(res, error, 'Failed to cancel payout');
  }
};

export const deletePayout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.salaryPayout.findUnique({ where: { id } });
    if (!existing) return fail(res, 404, 'Payout not found');

    const period = { month: existing.month, year: existing.year };
    const processed = await prisma.monthlySalary.findUnique({
      where: { userId_month_year: { userId: existing.userId, ...period } },
    });
    if (processed && isClosed(processed.status)) {
      return fail(res, 400, closedMessage(processed.status, period));
    }

    await prisma.$transaction(async (tx) => {
      await voidCashOut(tx, id, [`SALARY-PAYOUT-${id}`, `ADVANCE-${id}`]);
      await tx.salaryPayout.delete({ where: { id } });
    });

    await audit(req, {
      action: 'DELETE',
      entity: 'SALARY_PAYOUT',
      entityId: id,
      oldValues: { userId: existing.userId, amount: toNumber(existing.amount), month: existing.month, year: existing.year, status: existing.status },
    });

    return res.json({ success: true, message: 'Payout deleted' });
  } catch (error) {
    console.error('Delete payout error:', error);
    return failFromError(res, error, 'Failed to delete payout');
  }
};

// ---------------------------------------------------------------------------
// Month-end processing
// ---------------------------------------------------------------------------

interface ProcessInput extends Period {
  userId: string;
  deductions?: number;
  bonuses?: number;
  notes?: string;
  actorId: string;
  /** Close the month without salary (employee not present for the full month). */
  skip?: boolean;
}

type ProcessOutcome =
  | { ok: true; row: MonthlyRecord }
  | { ok: false; status: number; reason: string };

async function processEmployeeMonth(input: ProcessInput): Promise<ProcessOutcome> {
  const { userId, month, year } = input;
  const period = { month, year };

  return prisma.$transaction(async (tx): Promise<ProcessOutcome> => {
    const profile = await tx.employeeSalaryProfile.findFirst({ where: { userId, isActive: true } });
    if (!profile) return { ok: false, status: 400, reason: 'No base salary set for this employee' };

    const existing = await tx.monthlySalary.findUnique({ where: { userId_month_year: { userId, month, year } } });
    if (existing && isClosed(existing.status)) return { ok: false, status: 400, reason: closedMessage(existing.status, period) };

    const later = await firstProcessedAfter(tx, userId, period);
    if (later) {
      return {
        ok: false,
        status: 400,
        reason: `${periodLabel({ month: later.month, year: later.year })} is already closed; earlier months cannot be changed after it`,
      };
    }

    const payouts = await tx.salaryPayout.findMany({
      where: { userId, month, year, status: { in: [...ACTIVE_PAYOUT_STATUSES] } },
    });
    if (payouts.some((p) => p.status !== 'PAID')) {
      return { ok: false, status: 400, reason: 'Some payouts are still waiting to be handed over or cancelled' };
    }
    const payoutsTotal = round2(payouts.reduce((sum, p) => sum + toNumber(p.amount), 0));

    let deductions = input.skip ? 0 : input.deductions;
    if (deductions === undefined) {
      const attendance = await tx.attendanceSalaryDeduction.findUnique({
        where: { userId_month_year: { userId, month, year } },
      });
      deductions = toNumber(attendance?.deductionAmount);
    }
    const bonuses = input.skip ? 0 : input.bonuses ?? 0;

    const previous = await latestProcessedBefore(tx, userId, period);
    const previousBalance = toNumber(previous?.carryForward);

    const baseSalary = toNumber(profile.baseSalary);
    // Skipped: nothing is calculated or paid; what was given stays as the
    // employee's pay for the month and earlier debt simply carries on.
    const figures = input.skip
      ? { netAmount: 0, paidAmount: 0, carryForward: previousBalance }
      : computeMonthlySalary({ baseSalary, deductions, bonuses, payouts: payoutsTotal, previousBalance });
    const now = new Date();

    const data = {
      profileId: profile.id,
      amount: baseSalary,
      status: input.skip ? ('SKIPPED' as const) : ('PAID' as const),
      paidAt: now,
      paidBy: input.actorId,
      deductions: round2(deductions),
      bonuses: round2(bonuses),
      advances: payoutsTotal,
      previousBalance,
      netAmount: figures.netAmount,
      paidAmount: figures.paidAmount,
      carryForward: figures.carryForward,
      notes: input.notes || null,
    };

    const row = existing
      ? await tx.monthlySalary.update({ where: { id: existing.id }, data, include: monthlyInclude })
      : await tx.monthlySalary.create({ data: { userId, month, year, ...data }, include: monthlyInclude });

    await recordCashOut(tx, {
      amount: figures.paidAmount,
      description: `Salary ${periodLabel(period)} - ${fullName(row.user)}`,
      reference: `SALARY-${row.id}`,
      referenceId: row.id,
      date: now,
    });

    return { ok: true, row };
  });
}

export const processMonth = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, deductions, bonuses, notes } = req.body as {
      userId: string; deductions?: number; bonuses?: number; notes?: string;
    };
    const period = parsePeriod(req.body);
    if (!isValidPeriod(period)) return fail(res, 400, 'Invalid month or year');

    const outcome = await processEmployeeMonth({
      userId,
      ...period,
      deductions: deductions === undefined || deductions === null ? undefined : toNumber(deductions),
      bonuses: bonuses === undefined || bonuses === null ? undefined : toNumber(bonuses),
      notes,
      actorId: req.user?.id || 'unknown',
    });
    if (!outcome.ok) return fail(res, outcome.status, outcome.reason);

    const plain = toProcessed(outcome.row);
    await audit(req, {
      action: 'CREATE',
      entity: 'MONTHLY_SALARY',
      entityId: plain.id,
      newValues: { ...period, ...plain, user: undefined, processedBy: undefined },
    });

    return res.status(201).json({ success: true, data: plain });
  } catch (error) {
    console.error('Process salary month error:', error);
    return failFromError(res, error, 'Failed to process salary');
  }
};

/** Close a month without salary: the employee was not present for the full month. */
export const skipMonth = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, reason } = req.body as { userId: string; reason?: string };
    const period = parsePeriod(req.body);
    if (!isValidPeriod(period)) return fail(res, 400, 'Invalid month or year');

    const outcome = await processEmployeeMonth({
      userId,
      ...period,
      skip: true,
      notes: reason,
      actorId: req.user?.id || 'unknown',
    });
    if (!outcome.ok) return fail(res, outcome.status, outcome.reason);

    const plain = toProcessed(outcome.row);
    await audit(req, {
      action: 'CREATE',
      entity: 'MONTHLY_SALARY',
      entityId: plain.id,
      newValues: { ...period, ...plain, user: undefined, processedBy: undefined, skipped: true },
    });

    return res.status(201).json({ success: true, data: plain });
  } catch (error) {
    console.error('Skip salary month error:', error);
    return failFromError(res, error, 'Failed to skip this month');
  }
};

export const processAllForMonth = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const period = parsePeriod(req.body);
    if (!isValidPeriod(period)) return fail(res, 400, 'Invalid month or year');
    const { notes, userIds } = req.body as { notes?: string; userIds?: string[] };
    // Optional subset: the dialog lets the admin untick people who should wait.
    const only = Array.isArray(userIds) && userIds.length > 0 ? new Set(userIds) : null;

    const report = await loadMonthReport(period);
    const open = report.rows.filter((r) => r.status === 'OPEN' && (!only || only.has(r.userId)));

    const processed: ReturnType<typeof toProcessed>[] = [];
    const skipped: { userId: string; name: string; reason: string }[] = [];

    for (const row of open) {
      if (!row.hasProfile) {
        skipped.push({ userId: row.userId, name: fullName(row.user), reason: 'No base salary set' });
        continue;
      }
      const outcome = await processEmployeeMonth({
        userId: row.userId,
        ...period,
        notes,
        actorId: req.user?.id || 'unknown',
      });
      if (outcome.ok) processed.push(toProcessed(outcome.row));
      else skipped.push({ userId: row.userId, name: fullName(row.user), reason: outcome.reason });
    }

    if (processed.length) {
      await audit(req, {
        action: 'CREATE',
        entity: 'MONTHLY_SALARY',
        entityId: `${period.year}-${period.month}`,
        newValues: { ...period, processed: processed.map((p) => ({ id: p.id, userId: p.userId, paidAmount: p.paidAmount, carryForward: p.carryForward })), skipped },
      });
    }

    return res.json({
      success: true,
      data: { ...period, label: periodLabel(period), processedCount: processed.length, processed, skipped },
    });
  } catch (error) {
    console.error('Process all salaries error:', error);
    return failFromError(res, error, 'Failed to process salaries');
  }
};

export const undoProcessMonth = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.monthlySalary.findUnique({ where: { id }, include: monthlyInclude });
    if (!existing) return fail(res, 404, 'Processed month not found');
    if (!isClosed(existing.status)) return fail(res, 400, 'This month is not closed');

    const period = { month: existing.month, year: existing.year };
    const later = await firstProcessedAfter(prisma, existing.userId, period);
    if (later) {
      return fail(res, 400, `Undo ${periodLabel({ month: later.month, year: later.year })} first; it was closed after this month`);
    }

    await prisma.$transaction(async (tx) => {
      await voidCashOut(tx, id, [`SALARY-${id}`]);
      await tx.monthlySalary.delete({ where: { id } });
    });

    await audit(req, {
      action: 'DELETE',
      entity: 'MONTHLY_SALARY',
      entityId: id,
      oldValues: { ...toProcessed(existing), user: undefined, processedBy: undefined },
    });

    return res.json({ success: true, message: `${periodLabel(period)} is open again for ${fullName(existing.user)}` });
  } catch (error) {
    console.error('Undo salary processing error:', error);
    return failFromError(res, error, 'Failed to undo salary processing');
  }
};

// Exported for tests.
export const __internal = { comparePeriods, parsePeriod };
export type { PersonRef };
