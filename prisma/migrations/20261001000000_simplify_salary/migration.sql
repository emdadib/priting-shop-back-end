-- Simplified salary module.
--
-- * salary_advances  -> "payouts": cash handed to an employee during the month.
--                       Gets an explicit salary period (month/year) and is
--                       created directly as PAID from now on.
-- * salary_payments  -> "monthly salary": one processed row per employee per
--                       month, now storing the settlement figures.
-- * salaries         -> legacy salary-process module, removed.

-- 1. Payouts: explicit salary period ---------------------------------------
ALTER TABLE "salary_advances"
  ADD COLUMN "month" INTEGER,
  ADD COLUMN "year"  INTEGER;

-- Backfill from the date the money was given (falls back to the request
-- date). Timestamps are stored in UTC; the shop runs on Asia/Dhaka time.
UPDATE "salary_advances"
SET "month" = EXTRACT(MONTH FROM ((COALESCE("paidAt", "requestDate") AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'))::INTEGER,
    "year"  = EXTRACT(YEAR  FROM ((COALESCE("paidAt", "requestDate") AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'))::INTEGER;

ALTER TABLE "salary_advances"
  ALTER COLUMN "month" SET NOT NULL,
  ALTER COLUMN "year"  SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PAID';

CREATE INDEX "salary_advances_userId_year_month_idx" ON "salary_advances"("userId", "year", "month");

-- 2. Drop the link from payouts to the legacy salaries table ---------------
ALTER TABLE "salary_advances" DROP CONSTRAINT "salary_advances_salaryId_fkey";
ALTER TABLE "salary_advances" DROP COLUMN "salaryId";

-- 3. Monthly salary: settlement figures ------------------------------------
ALTER TABLE "salary_payments"
  ADD COLUMN "previousBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "netAmount"       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paidAmount"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "carryForward"    DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill months that were already marked paid so history reads correctly.
UPDATE "salary_payments"
SET "netAmount"    = "amount" + COALESCE("bonuses", 0) - COALESCE("deductions", 0) - COALESCE("advances", 0),
    "paidAmount"   = GREATEST("amount" + COALESCE("bonuses", 0) - COALESCE("deductions", 0) - COALESCE("advances", 0), 0),
    "carryForward" = GREATEST(-("amount" + COALESCE("bonuses", 0) - COALESCE("deductions", 0) - COALESCE("advances", 0)), 0)
WHERE "status" = 'PAID';

-- 4. Remove the legacy salary-process module --------------------------------
-- WARNING: this drops the old "salaries" table and its rows. That module has
-- not been reachable from the app for some time; back the table up first if
-- you want to keep its history.
DROP TABLE "salaries";
DROP TYPE "SalaryStatus";
