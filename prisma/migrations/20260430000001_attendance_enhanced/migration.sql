-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'WEEKEND', 'HOLIDAY', 'ON_LEAVE');

-- AlterTable: Add new columns to attendance
ALTER TABLE "attendance" ADD COLUMN "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';
ALTER TABLE "attendance" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "attendance" ADD COLUMN "lateMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: attendance_config
CREATE TABLE "attendance_config" (
    "id" TEXT NOT NULL,
    "checkInTime" TEXT NOT NULL DEFAULT '10:00',
    "checkInLateThreshold" TEXT NOT NULL DEFAULT '10:30',
    "lunchBreakStartEarliest" TEXT NOT NULL DEFAULT '13:00',
    "lunchBreakEndLatest" TEXT NOT NULL DEFAULT '15:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '20:30',
    "weekendDays" TEXT NOT NULL DEFAULT '[5]',
    "lateCountThreshold" INTEGER NOT NULL DEFAULT 3,
    "absentDaysThreshold" INTEGER NOT NULL DEFAULT 2,
    "lunchBreakMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable: attendance_salary_deductions
CREATE TABLE "attendance_salary_deductions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lateDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "lateDeductionDays" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "absentDeductionDays" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "totalDeductionDays" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "deductionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_salary_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "attendance_salary_deductions_userId_month_year_key" ON "attendance_salary_deductions"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "attendance_salary_deductions" ADD CONSTRAINT "attendance_salary_deductions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
