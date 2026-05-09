import { Request, Response } from 'express';
import { PrismaClient, AttendanceStatus, LeaveRequestStatus } from '@prisma/client';

const prisma = new PrismaClient();

// --- Time Helpers ---

function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function getMinutesFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseBodyDate(isoLike: string): Date {
  if (typeof isoLike === 'string' && /^\d{4}-\d{2}-\d{2}/.test(isoLike)) {
    const nums = isoLike.slice(0, 10).split('-').map(Number);
    const y = nums[0] ?? 1970;
    const m = nums[1] ?? 1;
    const d = nums[2] ?? 1;
    return new Date(y, m - 1, d);
  }
  return startOfLocalDay(new Date(isoLike));
}

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function isWeekendDay(date: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(date.getDay());
}

function buildClosureDaysYmdInMonth(
  year: number,
  month: number,
  closures: { startDate: Date; endDate: Date }[],
  todayCeil: Date
): Set<string> {
  const set = new Set<string>();
  let cur = new Date(year, month - 1, 1);
  while (cur.getMonth() === month - 1) {
    const dayDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
    if (dayDate > todayCeil) break;
    const sod = startOfLocalDay(dayDate);
    for (const c of closures) {
      const cs = startOfLocalDay(c.startDate);
      const ce = startOfLocalDay(c.endDate);
      if (sod >= cs && sod <= ce) {
        set.add(toYmd(sod));
        break;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}

async function fetchShopClosuresOverlappingMonth(year: number, month: number) {
  const { start, end } = getMonthRange(year, month);
  return prisma.shopClosure.findMany({
    where: { startDate: { lt: end }, endDate: { gte: start } },
    orderBy: { startDate: 'asc' },
  });
}

async function isShopClosedOnDate(date: Date): Promise<boolean> {
  const sod = startOfLocalDay(date);
  const n = await prisma.shopClosure.count({
    where: { startDate: { lte: sod }, endDate: { gte: sod } },
  });
  return n > 0;
}

async function getShopClosureCovering(date: Date) {
  const sod = startOfLocalDay(date);
  return prisma.shopClosure.findFirst({
    where: { startDate: { lte: sod }, endDate: { gte: sod } },
    orderBy: { startDate: 'asc' },
  });
}

async function isOnApprovedLeave(userId: string, date: Date): Promise<boolean> {
  const sod = startOfLocalDay(date);
  const n = await prisma.employeeLeave.count({
    where: {
      userId,
      status: 'APPROVED',
      startDate: { lte: sod },
      endDate: { gte: sod },
    },
  });
  return n > 0;
}

async function getApprovedLeaveCovering(userId: string, date: Date) {
  const sod = startOfLocalDay(date);
  return prisma.employeeLeave.findFirst({
    where: {
      userId,
      status: 'APPROVED',
      startDate: { lte: sod },
      endDate: { gte: sod },
    },
    orderBy: { startDate: 'asc' },
  });
}

async function fetchApprovedLeavesForMonth(year: number, month: number, filterUserId?: string) {
  const { start, end } = getMonthRange(year, month);
  return prisma.employeeLeave.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lt: end },
      endDate: { gte: start },
      ...(filterUserId ? { userId: filterUserId } : {}),
    },
    select: { userId: true, startDate: true, endDate: true },
  });
}

function countApprovedLeaveDaysOnWorkingDates(
  leaveRanges: { startDate: Date; endDate: Date }[],
  workingDays: Date[]
): number {
  const ws = new Set(workingDays.map(toYmd));
  const counted = new Set<string>();
  for (const range of leaveRanges) {
    let cur = startOfLocalDay(range.startDate);
    const last = startOfLocalDay(range.endDate);
    while (cur <= last) {
      const key = toYmd(cur);
      if (ws.has(key)) counted.add(key);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return counted.size;
}

/** Working dates = non-weekend, not future, excluded shop-closure weekdays */
function getWorkingDaysInMonth(
  year: number,
  month: number,
  weekendDays: number[],
  closureDaysYmd: Set<string>
): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let current = new Date(year, month - 1, 1);
  while (current.getMonth() === month - 1) {
    const dayDate = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    if (dayDate <= today && !isWeekendDay(dayDate, weekendDays)) {
      if (!closureDaysYmd.has(toYmd(dayDate))) {
        days.push(dayDate);
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Closure weekdays in month til today — for summary display */
function countWeekdayClosureDays(
  year: number,
  month: number,
  weekendDays: number[],
  closures: { startDate: Date; endDate: Date }[],
  todayCeil: Date
): number {
  const ymdClosure = buildClosureDaysYmdInMonth(year, month, closures, todayCeil);
  let n = 0;
  ymdClosure.forEach((ymdStr) => {
    const parts = ymdStr.split('-').map(Number);
    const yy = parts[0] ?? 1970;
    const mm = parts[1] ?? 1;
    const dd = parts[2] ?? 1;
    const d = new Date(yy, mm - 1, dd);
    if (!isWeekendDay(d, weekendDays)) n += 1;
  });
  return n;
}

async function findOverlappingLeave(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
) {
  const start = startOfLocalDay(startDate);
  const end = startOfLocalDay(endDate);
  return prisma.employeeLeave.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: ['PENDING', 'APPROVED'] },
      AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
    },
  });
}

async function loadMonthAttendanceMath(year: number, month: number) {
  const config = await getOrCreateConfig();
  const weekendDays = parseWeekendDays(config);
  const closures = await fetchShopClosuresOverlappingMonth(year, month);
  const todayCeil = new Date();
  todayCeil.setHours(23, 59, 59, 999);
  const closureYmd = buildClosureDaysYmdInMonth(year, month, closures, todayCeil);
  const workingDates = getWorkingDaysInMonth(year, month, weekendDays, closureYmd);
  const shopClosureWeekdays = countWeekdayClosureDays(year, month, weekendDays, closures, todayCeil);

  const allApprovedLeaves = await fetchApprovedLeavesForMonth(year, month);
  const leavesByUser = new Map<string, { startDate: Date; endDate: Date }[]>();
  for (const L of allApprovedLeaves) {
    const arr = leavesByUser.get(L.userId) || [];
    arr.push({ startDate: L.startDate, endDate: L.endDate });
    leavesByUser.set(L.userId, arr);
  }

  return { config, closures, closureYmd, workingDates, leavesByUser, shopClosureWeekdays };
}

async function getOrCreateConfig() {
  let config = await prisma.attendanceConfig.findFirst();
  if (!config) {
    config = await prisma.attendanceConfig.create({
      data: {
        checkInTime: '10:00',
        checkInLateThreshold: '10:30',
        lunchBreakStartEarliest: '13:00',
        lunchBreakEndLatest: '15:00',
        checkOutTime: '20:30',
        weekendDays: '[5]',
        lateCountThreshold: 3,
        absentDaysThreshold: 2,
        lunchBreakMandatory: true,
      },
    });
  }
  return config;
}

function parseWeekendDays(config: { weekendDays: string }): number[] {
  try {
    return JSON.parse(config.weekendDays);
  } catch {
    return [5];
  }
}

// --- Employee Endpoints ---

export const checkIn = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const config = await getOrCreateConfig();
    const weekendDays = parseWeekendDays(config);
    const now = new Date();

    if (isWeekendDay(now, weekendDays)) {
      return res.status(400).json({ success: false, message: 'Today is a weekend. No attendance required.' });
    }

    if (await isShopClosedOnDate(now)) {
      return res.status(400).json({
        success: false,
        message: 'The shop is closed today. Attendance actions are disabled.',
      });
    }

    if (await isOnApprovedLeave(userId, now)) {
      return res.status(400).json({
        success: false,
        message: 'You are on approved leave today. Contact a manager if you need to amend your leave.',
      });
    }

    const { today, tomorrow } = getTodayRange();
    const existing = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (existing?.checkIn) {
      return res.status(400).json({ success: false, message: 'Already checked in today.' });
    }

    const currentMinutes = getMinutesFromDate(now);
    const lateThresholdMinutes = timeToMinutes(config.checkInLateThreshold);
    const checkInMinutes = timeToMinutes(config.checkInTime);
    const isLate = currentMinutes > lateThresholdMinutes;
    const lateMinutes = isLate ? Math.max(0, currentMinutes - checkInMinutes) : 0;
    const status: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn: now, status, isLate, lateMinutes },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : await prisma.attendance.create({
          data: { userId, date: today, checkIn: now, status, isLate, lateMinutes },
          include: { user: { select: { firstName: true, lastName: true } } },
        });

    return res.status(201).json({
      success: true,
      message: isLate
        ? `Checked in late (${lateMinutes} minutes after ${config.checkInTime})`
        : 'Checked in successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check in' });
  }
};

export const lunchOut = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const now = new Date();
    if (await isShopClosedOnDate(now)) {
      return res.status(400).json({ success: false, message: 'The shop is closed today.' });
    }
    if (await isOnApprovedLeave(userId, now)) {
      return res.status(400).json({ success: false, message: 'You are on approved leave today.' });
    }

    const config = await getOrCreateConfig();
    const { today, tomorrow } = getTodayRange();

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (!attendance?.checkIn) {
      return res.status(400).json({ success: false, message: 'You must check in before starting lunch.' });
    }
    if (attendance.lunchOut) {
      return res.status(400).json({ success: false, message: 'Already on lunch break.' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out for the day.' });
    }

    const currentMinutes = getMinutesFromDate(now);
    const lunchStart = timeToMinutes(config.lunchBreakStartEarliest);
    const lunchEnd = timeToMinutes(config.lunchBreakEndLatest);

    if (currentMinutes < lunchStart) {
      return res.status(400).json({
        success: false,
        message: `Lunch break window opens at ${config.lunchBreakStartEarliest}. Please wait.`,
      });
    }
    if (currentMinutes > lunchEnd) {
      return res.status(400).json({
        success: false,
        message: `Lunch break window closed at ${config.lunchBreakEndLatest}.`,
      });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { lunchOut: now },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return res.json({ success: true, message: 'Lunch break started', data: updated });
  } catch (error) {
    console.error('Lunch out error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record lunch start' });
  }
};

export const lunchIn = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const now = new Date();
    if (await isShopClosedOnDate(now)) {
      return res.status(400).json({ success: false, message: 'The shop is closed today.' });
    }
    if (await isOnApprovedLeave(userId, now)) {
      return res.status(400).json({ success: false, message: 'You are on approved leave today.' });
    }

    const { today, tomorrow } = getTodayRange();

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (!attendance?.lunchOut) {
      return res.status(400).json({ success: false, message: 'No active lunch break found.' });
    }
    if (attendance.lunchIn) {
      return res.status(400).json({ success: false, message: 'Already returned from lunch.' });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { lunchIn: now },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return res.json({ success: true, message: 'Returned from lunch', data: updated });
  } catch (error) {
    console.error('Lunch in error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record lunch return' });
  }
};

export const checkOut = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const now = new Date();
    if (await isShopClosedOnDate(now)) {
      return res.status(400).json({ success: false, message: 'The shop is closed today.' });
    }
    if (await isOnApprovedLeave(userId, now)) {
      return res.status(400).json({ success: false, message: 'You are on approved leave today.' });
    }

    const config = await getOrCreateConfig();
    const { today, tomorrow } = getTodayRange();

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (!attendance?.checkIn) {
      return res.status(400).json({ success: false, message: 'No check-in found for today.' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out today.' });
    }

    let totalHoursWorked =
      (now.getTime() - attendance.checkIn!.getTime()) / (1000 * 60 * 60);
    if (attendance.lunchOut && attendance.lunchIn) {
      const lunchDuration =
        (attendance.lunchIn.getTime() - attendance.lunchOut.getTime()) / (1000 * 60 * 60);
      totalHoursWorked -= lunchDuration;
    }
    totalHoursWorked = Math.max(0, totalHoursWorked);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: now, totalHours: totalHoursWorked },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return res.json({
      success: true,
      message: `Checked out. Total hours worked: ${totalHoursWorked.toFixed(2)}h`,
      data: updated,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check out' });
  }
};

export const getTodayStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const config = await getOrCreateConfig();
    const weekendDays = parseWeekendDays(config);
    const { today, tomorrow } = getTodayRange();
    const now = new Date();

    const attendance = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const shopClosed = await isShopClosedOnDate(now);
    const shopClosureToday = shopClosed ? await getShopClosureCovering(now) : null;
    const approvedLeaveRow = await getApprovedLeaveCovering(userId, now);

    return res.json({
      success: true,
      data: {
        attendance,
        isWeekend: isWeekendDay(now, weekendDays),
        isShopClosed: shopClosed,
        shopClosureToday: shopClosureToday
          ? {
              id: shopClosureToday.id,
              reason: shopClosureToday.reason,
              startDate: shopClosureToday.startDate,
              endDate: shopClosureToday.endDate,
            }
          : null,
        onApprovedLeaveToday: Boolean(approvedLeaveRow),
        approvedLeaveToday: approvedLeaveRow
          ? {
              id: approvedLeaveRow.id,
              leaveType: approvedLeaveRow.leaveType,
              reason: approvedLeaveRow.reason,
              startDate: approvedLeaveRow.startDate,
              endDate: approvedLeaveRow.endDate,
            }
          : null,
        config: {
          checkInTime: config.checkInTime,
          checkInLateThreshold: config.checkInLateThreshold,
          lunchBreakStartEarliest: config.lunchBreakStartEarliest,
          lunchBreakEndLatest: config.lunchBreakEndLatest,
          checkOutTime: config.checkOutTime,
          lunchBreakMandatory: config.lunchBreakMandatory,
          weekendDays,
        },
      },
    });
  } catch (error) {
    console.error('Get today status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get today status' });
  }
};

export const getMyHistory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const now = new Date();
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(now.getFullYear()));
    const { start, end } = getMonthRange(year, month);

    const records = await prisma.attendance.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: 'desc' },
    });

    const { config, workingDates, leavesByUser, shopClosureWeekdays } = await loadMonthAttendanceMath(year, month);
    const lev = leavesByUser.get(userId) || [];
    const approvedLeaveDays = countApprovedLeaveDaysOnWorkingDates(lev, workingDates);
    const expectedPresentDays = Math.max(0, workingDates.length - approvedLeaveDays);

    const presentDays = records.filter((r) => r.checkIn !== null).length;
    const lateDays = records.filter((r) => r.isLate).length;
    const absentDays = Math.max(0, expectedPresentDays - presentDays);
    const lateDeductionDays = Math.floor(lateDays / config.lateCountThreshold);
    const absentDeductionDays = Math.floor(absentDays / config.absentDaysThreshold);
    const totalDeductionDays = lateDeductionDays + absentDeductionDays;

    return res.json({
      success: true,
      data: {
        records,
        summary: {
          workingDays: workingDates.length,
          shopClosureWeekdays,
          approvedLeaveDays,
          expectedPresentDays,
          presentDays,
          lateDays,
          absentDays,
          lateDeductionDays,
          absentDeductionDays,
          totalDeductionDays,
        },
      },
    });
  } catch (error) {
    console.error('Get my history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get attendance history' });
  }
};

// --- Admin Endpoints ---

export const getAllAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, date, month, year } = req.query;
    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId as string;

    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    } else if (month && year) {
      const { start, end } = getMonthRange(
        parseInt(year as string),
        parseInt(month as string)
      );
      where.date = { gte: start, lt: end };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });

    return res.json({ success: true, data: records });
  } catch (error) {
    console.error('Get all attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get attendance records' });
  }
};

export const getMonthlyReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const now = new Date();
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(now.getFullYear()));
    const filterUserId = req.query.userId as string | undefined;

    const { config, workingDates, leavesByUser, shopClosureWeekdays } =
      await loadMonthAttendanceMath(year, month);
    const { start, end } = getMonthRange(year, month);

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(filterUserId ? { id: filterUserId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const allAttendance = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lt: end },
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
    });

    const report = users.map((user) => {
      const userAttendance = allAttendance.filter((a) => a.userId === user.id);
      const presentDays = userAttendance.filter((a) => a.checkIn !== null).length;
      const lateDays = userAttendance.filter((a) => a.isLate).length;
      const lev = leavesByUser.get(user.id) || [];
      const approvedLeaveDays = countApprovedLeaveDaysOnWorkingDates(lev, workingDates);
      const expectedPresentDays = Math.max(0, workingDates.length - approvedLeaveDays);
      const absentDays = Math.max(0, expectedPresentDays - presentDays);
      const lateDeductionDays = Math.floor(lateDays / config.lateCountThreshold);
      const absentDeductionDays = Math.floor(absentDays / config.absentDaysThreshold);
      const totalDeductionDays = lateDeductionDays + absentDeductionDays;

      return {
        user,
        workingDays: workingDates.length,
        shopClosureWeekdays,
        approvedLeaveDays,
        expectedPresentDays,
        presentDays,
        lateDays,
        absentDays,
        lateDeductionDays,
        absentDeductionDays,
        totalDeductionDays,
        attendanceRecords: userAttendance,
      };
    });

    return res.json({
      success: true,
      data: {
        month,
        year,
        workingDays: workingDates.length,
        shopClosureWeekdays,
        report,
      },
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
};

export const getConfig = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const config = await getOrCreateConfig();
    const weekendDays = parseWeekendDays(config);
    return res.json({ success: true, data: { ...config, weekendDays } });
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get config' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      checkInTime,
      checkInLateThreshold,
      lunchBreakStartEarliest,
      lunchBreakEndLatest,
      checkOutTime,
      weekendDays,
      lateCountThreshold,
      absentDaysThreshold,
      lunchBreakMandatory,
    } = req.body;

    const config = await getOrCreateConfig();
    const updated = await prisma.attendanceConfig.update({
      where: { id: config.id },
      data: {
        ...(checkInTime !== undefined && { checkInTime }),
        ...(checkInLateThreshold !== undefined && { checkInLateThreshold }),
        ...(lunchBreakStartEarliest !== undefined && { lunchBreakStartEarliest }),
        ...(lunchBreakEndLatest !== undefined && { lunchBreakEndLatest }),
        ...(checkOutTime !== undefined && { checkOutTime }),
        ...(weekendDays !== undefined && {
          weekendDays: Array.isArray(weekendDays)
            ? JSON.stringify(weekendDays)
            : weekendDays,
        }),
        ...(lateCountThreshold !== undefined && { lateCountThreshold: Number(lateCountThreshold) }),
        ...(absentDaysThreshold !== undefined && { absentDaysThreshold: Number(absentDaysThreshold) }),
        ...(lunchBreakMandatory !== undefined && { lunchBreakMandatory: Boolean(lunchBreakMandatory) }),
      },
    });

    const weekendDaysParsed = parseWeekendDays(updated);
    return res.json({
      success: true,
      message: 'Attendance config updated successfully',
      data: { ...updated, weekendDays: weekendDaysParsed },
    });
  } catch (error) {
    console.error('Update config error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update config' });
  }
};

export const calculateMonthlyDeductions = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const now = new Date();
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(now.getFullYear()));
    const filterUserId = req.query.userId as string | undefined;

    const { config, workingDates, leavesByUser } = await loadMonthAttendanceMath(year, month);
    const { start, end } = getMonthRange(year, month);

    const users = await prisma.user.findMany({
      where: { isActive: true, ...(filterUserId ? { id: filterUserId } : {}) },
      include: { salaryProfile: true },
    });

    const allAttendance = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lt: end },
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
    });

    const results = [];

    for (const user of users) {
      const userAttendance = allAttendance.filter((a) => a.userId === user.id);
      const presentDays = userAttendance.filter((a) => a.checkIn !== null).length;
      const lateDays = userAttendance.filter((a) => a.isLate).length;
      const lev = leavesByUser.get(user.id) || [];
      const approvedLeaveDays = countApprovedLeaveDaysOnWorkingDates(lev, workingDates);
      const expectedPresentDays = Math.max(0, workingDates.length - approvedLeaveDays);
      const absentDays = Math.max(0, expectedPresentDays - presentDays);
      const lateDeductionDays = Math.floor(lateDays / config.lateCountThreshold);
      const absentDeductionDays = Math.floor(absentDays / config.absentDaysThreshold);
      const totalDeductionDays = lateDeductionDays + absentDeductionDays;

      let deductionAmount = 0;
      if (user.salaryProfile && workingDates.length > 0) {
        const dailyRate = Number(user.salaryProfile.baseSalary) / workingDates.length;
        deductionAmount = dailyRate * totalDeductionDays;
      }

      const deduction = await prisma.attendanceSalaryDeduction.upsert({
        where: { userId_month_year: { userId: user.id, month, year } },
        update: {
          lateDays,
          absentDays,
          lateDeductionDays,
          absentDeductionDays,
          totalDeductionDays,
          deductionAmount,
        },
        create: {
          userId: user.id,
          month,
          year,
          lateDays,
          absentDays,
          lateDeductionDays,
          absentDeductionDays,
          totalDeductionDays,
          deductionAmount,
        },
      });

      results.push({
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        ...deduction,
      });
    }

    return res.json({
      success: true,
      message: `Deductions calculated for ${results.length} employee(s)`,
      data: results,
    });
  } catch (error) {
    console.error('Calculate deductions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate deductions' });
  }
};

export const getMonthlyDeductions = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const now = new Date();
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(now.getFullYear()));
    const filterUserId = req.query.userId as string | undefined;

    const deductions = await prisma.attendanceSalaryDeduction.findMany({
      where: {
        month,
        year,
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return res.json({ success: true, data: deductions });
  } catch (error) {
    console.error('Get deductions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get deductions' });
  }
};

export const adminMarkAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      userId,
      date,
      status,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      lunchOut: lunchOutTime,
      lunchIn: lunchInTime,
      notes,
    } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ success: false, message: 'userId and date are required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const checkInDate = checkInTime ? new Date(checkInTime) : null;
    const checkOutDate = checkOutTime ? new Date(checkOutTime) : null;
    const lunchOutDate = lunchOutTime ? new Date(lunchOutTime) : null;
    const lunchInDate = lunchInTime ? new Date(lunchInTime) : null;

    let totalHours: number | null = null;
    if (checkInDate && checkOutDate) {
      totalHours = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
      if (lunchOutDate && lunchInDate) {
        totalHours -= (lunchInDate.getTime() - lunchOutDate.getTime()) / (1000 * 60 * 60);
      }
      totalHours = Math.max(0, totalHours);
    }

    const config = await getOrCreateConfig();
    let isLate = false;
    let lateMinutes = 0;
    if (checkInDate) {
      const checkInMins = getMinutesFromDate(checkInDate);
      const lateThreshold = timeToMinutes(config.checkInLateThreshold);
      const standardCheckIn = timeToMinutes(config.checkInTime);
      isLate = checkInMins > lateThreshold;
      lateMinutes = isLate ? Math.max(0, checkInMins - standardCheckIn) : 0;
    }

    const existing = await prisma.attendance.findFirst({
      where: { userId, date: { gte: attendanceDate, lt: nextDay } },
    });

    const attendanceData = {
      status: (status as AttendanceStatus) || 'PRESENT',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      lunchOut: lunchOutDate,
      lunchIn: lunchInDate,
      totalHours,
      isLate,
      lateMinutes,
      notes: notes || null,
    };

    const attendance = existing
      ? await prisma.attendance.update({ where: { id: existing.id }, data: attendanceData })
      : await prisma.attendance.create({
          data: { userId, date: attendanceDate, ...attendanceData },
        });

    return res.json({ success: true, message: 'Attendance recorded', data: attendance });
  } catch (error) {
    console.error('Admin mark attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
};

export const deleteAttendanceRecord = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    await prisma.attendance.delete({ where: { id } });
    return res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
};

// --- Shop closures (manager+) ---

export const listShopClosures = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const now = new Date();
    const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const m = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
    const closures = await fetchShopClosuresOverlappingMonth(y, m);
    return res.json({ success: true, data: closures });
  } catch (error) {
    console.error('listShopClosures', error);
    return res.status(500).json({ success: false, message: 'Failed to list shop closures' });
  }
};

export const createShopClosure = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const s = parseBodyDate(startDate);
    const e = parseBodyDate(endDate);
    if (e.getTime() < s.getTime()) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }
    const row = await prisma.shopClosure.create({
      data: {
        startDate: s,
        endDate: e,
        reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
      },
    });
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('createShopClosure', error);
    return res.status(500).json({ success: false, message: 'Failed to create shop closure' });
  }
};

export const deleteShopClosure = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { closureId } = req.params;
    await prisma.shopClosure.delete({ where: { id: closureId } });
    return res.json({ success: true, message: 'Shop closure removed' });
  } catch (error) {
    console.error('deleteShopClosure', error);
    return res.status(500).json({ success: false, message: 'Failed to delete shop closure' });
  }
};

// --- Employee leave ---

export const listMyLeaves = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const list = await prisma.employeeLeave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('listMyLeaves', error);
    return res.status(500).json({ success: false, message: 'Failed to list leave requests' });
  }
};

export const requestLeave = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { startDate, endDate, leaveType, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const s = parseBodyDate(startDate);
    const e = parseBodyDate(endDate);
    if (e.getTime() < s.getTime()) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }

    const clash = await findOverlappingLeave(userId, s, e);
    if (clash) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending or approved leave that overlaps these dates.',
      });
    }

    const row = await prisma.employeeLeave.create({
      data: {
        userId,
        startDate: s,
        endDate: e,
        leaveType: typeof leaveType === 'string' && leaveType.trim() ? leaveType.trim().slice(0, 64) : 'ANNUAL',
        reason: typeof reason === 'string' ? reason.slice(0, 1000) : null,
      },
    });

    return res.status(201).json({ success: true, message: 'Leave request submitted', data: row });
  } catch (error) {
    console.error('requestLeave', error);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
};

export const cancelMyLeavePending = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { leaveId } = req.params;
    const row = await prisma.employeeLeave.findUnique({ where: { id: leaveId } });

    if (!row || row.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (row.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be withdrawn' });
    }

    await prisma.employeeLeave.update({
      where: { id: leaveId },
      data: { status: LeaveRequestStatus.CANCELLED },
    });

    return res.json({ success: true, message: 'Leave request cancelled' });
  } catch (error) {
    console.error('cancelMyLeavePending', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel leave request' });
  }
};

export const reviewLeaveRequest = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { leaveId } = req.params;
    const { approved, reviewNote } = req.body as { approved?: boolean; reviewNote?: string };

    if (approved !== true && approved !== false) {
      return res.status(400).json({ success: false, message: 'approved (boolean) is required' });
    }

    const row = await prisma.employeeLeave.findUnique({ where: { id: leaveId } });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (row.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This request is no longer pending' });
    }

    const updated = await prisma.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: approved ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: typeof reviewNote === 'string' ? reviewNote.slice(0, 500) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return res.json({
      success: true,
      message: approved ? 'Leave approved' : 'Leave rejected',
      data: updated,
    });
  } catch (error) {
    console.error('reviewLeaveRequest', error);
    return res.status(500).json({ success: false, message: 'Failed to review leave request' });
  }
};

export const listLeavesForManager = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const status = req.query.status as string | undefined;
    const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

    const list = await prisma.employeeLeave.findMany({
      where: status && statuses.includes(status) ? { status: status as LeaveRequestStatus } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('listLeavesForManager', error);
    return res.status(500).json({ success: false, message: 'Failed to list leave requests' });
  }
};

export const updateAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const {
      clockIn,
      clockOut,
      breakStart,
      breakEnd,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      lunchOut: lunchOutTime,
      lunchIn: lunchInTime,
      notes,
      status,
    } = req.body;

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...((clockIn || checkInTime) && { checkIn: new Date(clockIn || checkInTime) }),
        ...((clockOut || checkOutTime) && { checkOut: new Date(clockOut || checkOutTime) }),
        ...((breakStart || lunchOutTime) && { lunchOut: new Date(breakStart || lunchOutTime) }),
        ...((breakEnd || lunchInTime) && { lunchIn: new Date(breakEnd || lunchInTime) }),
        ...(notes !== undefined && { notes }),
        ...(status && { status: status as AttendanceStatus }),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update attendance' });
  }
};

// --- Legacy aliases (backward compatibility) ---
export const getAttendance = getAllAttendance;
export const getAttendanceById = async (_req: Request, res: Response) =>
  res.json({ success: true, data: {} });
export const createAttendance = async (_req: Request, res: Response) =>
  res.json({ success: true, data: {} });
export const clockIn = checkIn;
export const clockOut = checkOut;
export const getAttendanceReport = getMonthlyReport;
export const deleteAttendance = deleteAttendanceRecord;
