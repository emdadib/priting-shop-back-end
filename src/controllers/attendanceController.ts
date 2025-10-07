import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: [] });
};

export const getAttendanceById = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const createAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const updateAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, data: {} });
};

export const deleteAttendance = async (req: Request, res: Response): Promise<Response | void> => {
  res.json({ success: true, message: 'Attendance deleted' });
};

// Get attendance (alias for getAllAttendance)
export const getAttendance = getAllAttendance;

// Clock in
export const clockIn = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockOut: null
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today'
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: new Date(),
        clockIn: new Date()
      },
      include: {
        user: true
      }
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clock in'
    });
  }
};

// Clock out
export const clockOut = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockOut: null
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in found'
      });
    }

    const clockOutTime = new Date();
    const totalHours = attendance.clockIn ? (clockOutTime.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60) : 0;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: clockOutTime,
        totalHours: totalHours
      },
      include: {
        user: true
      }
    });

    res.json({
      success: true,
      data: updatedAttendance
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clock out'
    });
  }
};

// Get attendance report
export const getAttendanceReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (userId) {
      where.userId = userId as string;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    const totalHours = attendance.reduce((sum, record) => sum + Number(record.totalHours || 0), 0);
    const presentDays = attendance.filter(record => record.clockIn !== null).length;
    const absentDays = attendance.filter(record => record.clockIn === null).length;

    res.json({
      success: true,
      data: {
        attendance,
        totalHours,
        presentDays,
        absentDays,
        totalDays: attendance.length
      }
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendance report'
    });
  }
};
