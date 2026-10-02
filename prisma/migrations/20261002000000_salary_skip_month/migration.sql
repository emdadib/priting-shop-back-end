-- A month can be closed without salary ("skipped") when the employee was not
-- present for the full month. Nothing is paid; what was already given during
-- the month stays as their pay, and any earlier debt carries forward.
ALTER TYPE "SalaryPaymentStatus" ADD VALUE 'SKIPPED';
