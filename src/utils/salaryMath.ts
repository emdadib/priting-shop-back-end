/**
 * Pure salary arithmetic and month-report building. No database access, so
 * everything here is unit-testable and shared by the salary controller.
 *
 * Money model
 * -----------
 * During a month an employee can take cash from the company any number of
 * times ("payouts"). When the month is processed the company settles up:
 *
 *   net = base salary + bonuses - deductions - payouts already given
 *         - balance the employee still owed from earlier months
 *
 *   net > 0  -> the company pays `net` now and the employee is square.
 *   net < 0  -> the employee took more than they earned; nothing is paid and
 *               the shortfall is carried forward to the next processed month.
 */

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type MonthlyStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type RowStatus = 'OPEN' | 'PROCESSED';

export interface Period {
  month: number; // 1-12
  year: number;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function isValidPeriod(p: Period): boolean {
  return Number.isInteger(p.month) && Number.isInteger(p.year) &&
    p.month >= 1 && p.month <= 12 && p.year >= 2000 && p.year <= 2100;
}

/** Negative when `a` is before `b`, zero when equal, positive when after. */
export function comparePeriods(a: Period, b: Period): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

export function periodLabel(p: Period): string {
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
}

// ---------------------------------------------------------------------------
// Settlement arithmetic
// ---------------------------------------------------------------------------

export interface SalaryFigures {
  baseSalary: number;
  deductions: number;
  bonuses: number;
  /** Cash already handed over during the month. */
  payouts: number;
  /** What the employee still owed the company coming into this month. */
  previousBalance: number;
}

export interface SalaryResult {
  /** Signed net: positive = company pays this, negative = employee owes it. */
  netAmount: number;
  /** Cash to hand over at processing time (never negative). */
  paidAmount: number;
  /** Debt carried to the next processed month (never negative). */
  carryForward: number;
}

export function computeMonthlySalary(f: SalaryFigures): SalaryResult {
  const netAmount = round2(
    toNumber(f.baseSalary) + toNumber(f.bonuses) - toNumber(f.deductions) -
    toNumber(f.payouts) - toNumber(f.previousBalance)
  );
  return {
    netAmount,
    paidAmount: netAmount > 0 ? netAmount : 0,
    carryForward: netAmount < 0 ? round2(-netAmount) : 0,
  };
}

// ---------------------------------------------------------------------------
// Month report
// ---------------------------------------------------------------------------

export interface PersonRef {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  email?: string;
}

export interface ReportProfile {
  id: string;
  userId: string;
  baseSalary: number;
  user: PersonRef;
}

export interface ReportPayout {
  id: string;
  userId: string;
  amount: number;
  status: PayoutStatus;
  /** ISO date the money was given (or requested, for legacy rows). */
  date: string;
  reason: string | null;
  notes: string | null;
  givenBy: PersonRef | null;
  user: PersonRef;
}

export interface ReportProcessed {
  id: string;
  userId: string;
  status: MonthlyStatus;
  amount: number;
  deductions: number;
  bonuses: number;
  advances: number;
  previousBalance: number;
  netAmount: number;
  paidAmount: number;
  carryForward: number;
  paidAt: string | null;
  processedBy: PersonRef | null;
  notes: string | null;
  user: PersonRef;
}

export interface ReportDeduction {
  userId: string;
  deductionAmount: number;
  lateDays: number;
  absentDays: number;
  totalDeductionDays: number;
}

export interface EmployeeMonthRow {
  userId: string;
  user: PersonRef;
  status: RowStatus;
  hasProfile: boolean;
  baseSalary: number;
  /** Suggested / applied attendance deduction detail, if any was calculated. */
  attendance: ReportDeduction | null;
  deductions: number;
  bonuses: number;
  payoutsTotal: number;
  payoutsCount: number;
  /** Legacy payouts still waiting to be handed over (block processing). */
  pendingPayoutsCount: number;
  payouts: ReportPayout[];
  previousBalance: number;
  netAmount: number;
  paidAmount: number;
  carryForward: number;
  processed: {
    id: string;
    paidAt: string | null;
    processedBy: PersonRef | null;
    notes: string | null;
  } | null;
}

export interface MonthTotals {
  employees: number;
  processedCount: number;
  openCount: number;
  baseSalary: number;
  payouts: number;
  deductions: number;
  bonuses: number;
  previousBalance: number;
  netAmount: number;
  /** Cash still to hand over when the open rows get processed. */
  toPayAtProcessing: number;
  /** Cash already handed over at processing time this month. */
  paidAtProcessing: number;
  /** Debt carried forward by processed rows. */
  owed: number;
  /** Debt the open rows would carry forward if processed as-is. */
  projectedOwed: number;
  /** Everything that left the cash box for this month's salaries. */
  cashOut: number;
}

export interface MonthReport extends Period {
  label: string;
  rows: EmployeeMonthRow[];
  totals: MonthTotals;
}

export interface MonthReportInput extends Period {
  profiles: ReportProfile[];
  payouts: ReportPayout[];
  processed: ReportProcessed[];
  deductions: ReportDeduction[];
  /** userId -> carryForward of the latest processed month before this one. */
  previousBalances: Map<string, number>;
}

const COUNTED_PAYOUT: ReadonlySet<PayoutStatus> = new Set(['PAID']);
const WAITING_PAYOUT: ReadonlySet<PayoutStatus> = new Set(['PENDING', 'APPROVED']);

const fullName = (p: PersonRef) => `${p.firstName} ${p.lastName}`.trim().toLowerCase();

export function buildMonthReport(input: MonthReportInput): MonthReport {
  const profileByUser = new Map(input.profiles.map((p) => [p.userId, p]));
  const processedByUser = new Map(
    input.processed.filter((p) => p.status === 'PAID').map((p) => [p.userId, p])
  );
  const draftByUser = new Map(
    input.processed.filter((p) => p.status !== 'PAID').map((p) => [p.userId, p])
  );
  const deductionByUser = new Map(input.deductions.map((d) => [d.userId, d]));

  const payoutsByUser = new Map<string, ReportPayout[]>();
  for (const payout of input.payouts) {
    if (payout.status === 'REJECTED' || payout.status === 'CANCELLED') continue;
    const list = payoutsByUser.get(payout.userId) ?? [];
    list.push(payout);
    payoutsByUser.set(payout.userId, list);
  }

  const users = new Map<string, PersonRef>();
  for (const p of input.profiles) users.set(p.userId, p.user);
  for (const p of input.payouts) if (!users.has(p.userId)) users.set(p.userId, p.user);
  for (const p of input.processed) if (!users.has(p.userId)) users.set(p.userId, p.user);

  const rows: EmployeeMonthRow[] = [];

  for (const [userId, user] of users) {
    const profile = profileByUser.get(userId) ?? null;
    const processed = processedByUser.get(userId) ?? null;
    const draft = draftByUser.get(userId) ?? null;
    const attendance = deductionByUser.get(userId) ?? null;
    const payouts = (payoutsByUser.get(userId) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const payoutsTotal = round2(
      payouts.filter((p) => COUNTED_PAYOUT.has(p.status)).reduce((sum, p) => sum + toNumber(p.amount), 0)
    );
    const pendingPayoutsCount = payouts.filter((p) => WAITING_PAYOUT.has(p.status)).length;

    if (processed) {
      rows.push({
        userId,
        user,
        status: 'PROCESSED',
        hasProfile: !!profile,
        baseSalary: toNumber(processed.amount),
        attendance,
        deductions: toNumber(processed.deductions),
        bonuses: toNumber(processed.bonuses),
        payoutsTotal: toNumber(processed.advances),
        payoutsCount: payouts.filter((p) => COUNTED_PAYOUT.has(p.status)).length,
        pendingPayoutsCount,
        payouts,
        previousBalance: toNumber(processed.previousBalance),
        netAmount: toNumber(processed.netAmount),
        paidAmount: toNumber(processed.paidAmount),
        carryForward: toNumber(processed.carryForward),
        processed: {
          id: processed.id,
          paidAt: processed.paidAt,
          processedBy: processed.processedBy,
          notes: processed.notes,
        },
      });
      continue;
    }

    const baseSalary = profile ? toNumber(profile.baseSalary) : 0;
    // A draft row from the old two-step flow keeps whatever bonus/deduction
    // the admin typed; otherwise suggest the attendance deduction.
    const deductions = draft && draft.deductions !== null && draft.deductions !== undefined
      ? toNumber(draft.deductions)
      : toNumber(attendance?.deductionAmount);
    const bonuses = draft ? toNumber(draft.bonuses) : 0;
    const previousBalance = toNumber(input.previousBalances.get(userId));
    const figures = computeMonthlySalary({ baseSalary, deductions, bonuses, payouts: payoutsTotal, previousBalance });

    rows.push({
      userId,
      user,
      status: 'OPEN',
      hasProfile: !!profile,
      baseSalary,
      attendance,
      deductions,
      bonuses,
      payoutsTotal,
      payoutsCount: payouts.filter((p) => COUNTED_PAYOUT.has(p.status)).length,
      pendingPayoutsCount,
      payouts,
      previousBalance,
      ...figures,
      processed: null,
    });
  }

  rows.sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)));

  return {
    month: input.month,
    year: input.year,
    label: periodLabel(input),
    rows,
    totals: summarizeRows(rows),
  };
}

export function summarizeRows(rows: EmployeeMonthRow[]): MonthTotals {
  const totals: MonthTotals = {
    employees: rows.length,
    processedCount: 0,
    openCount: 0,
    baseSalary: 0,
    payouts: 0,
    deductions: 0,
    bonuses: 0,
    previousBalance: 0,
    netAmount: 0,
    toPayAtProcessing: 0,
    paidAtProcessing: 0,
    owed: 0,
    projectedOwed: 0,
    cashOut: 0,
  };

  for (const row of rows) {
    totals.baseSalary += row.baseSalary;
    totals.payouts += row.payoutsTotal;
    totals.deductions += row.deductions;
    totals.bonuses += row.bonuses;
    totals.previousBalance += row.previousBalance;
    totals.netAmount += row.netAmount;
    if (row.status === 'PROCESSED') {
      totals.processedCount += 1;
      totals.paidAtProcessing += row.paidAmount;
      totals.owed += row.carryForward;
    } else {
      totals.openCount += 1;
      totals.toPayAtProcessing += row.paidAmount;
      totals.projectedOwed += row.carryForward;
    }
  }
  totals.cashOut = totals.payouts + totals.paidAtProcessing;

  for (const key of Object.keys(totals) as (keyof MonthTotals)[]) {
    totals[key] = round2(totals[key]);
  }
  return totals;
}
