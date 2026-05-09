-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable shop_closures
CREATE TABLE "shop_closures" (
    "id" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_closures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_closures_startDate_endDate_idx" ON "shop_closures"("startDate", "endDate");

-- CreateTable employee_leaves
CREATE TABLE "employee_leaves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'ANNUAL',
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leaves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_leaves_userId_status_idx" ON "employee_leaves"("userId", "status");
CREATE INDEX "employee_leaves_startDate_endDate_idx" ON "employee_leaves"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "employee_leaves" ADD CONSTRAINT "employee_leaves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_leaves" ADD CONSTRAINT "employee_leaves_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
