import express from 'express';
import {
  getCustomerLedger,
  getSupplierLedger,
  getCompanyLedger,
  addCustomerTransaction,
  addSupplierTransaction,
  addCompanyTransaction,
  getAccountingSummary,
  getAgingReport,
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseCategories,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  depositProfit,
  withdrawProfit,
  ownerWithdrawal,
  getProfitSummary,
  calculateAndRecordProfit,
  findOrphanedTransactions,
  cleanupOrphanedTransactions,
  deletePurchaseOrderLedgerEntries
} from '../controllers/accountingController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Customer ledger routes
router.get('/customers/:customerId/ledger', getCustomerLedger);
router.post('/customers/transactions', addCustomerTransaction);

// Supplier ledger routes
router.get('/suppliers/:supplierId/ledger', getSupplierLedger);
router.post('/suppliers/transactions', addSupplierTransaction);

// Company ledger routes
router.get('/company/ledger', getCompanyLedger);
router.post('/company/transactions', addCompanyTransaction);

// Summary and reports
router.get('/summary', getAccountingSummary);
router.get('/aging-report', getAgingReport);

// Expense management routes
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/expense-summary', getExpenseSummary);

// Expense category routes
router.get('/expense-categories', getExpenseCategories);
router.post('/expense-categories', addExpenseCategory);
router.put('/expense-categories/:id', updateExpenseCategory);
router.delete('/expense-categories/:id', deleteExpenseCategory);

// Profit management routes
router.post('/profit/deposit', depositProfit);
router.post('/profit/withdraw', withdrawProfit);
router.post('/owner/withdraw', ownerWithdrawal); // Simple owner cash withdrawal
router.get('/profit/summary', getProfitSummary);
router.post('/profit/calculate', calculateAndRecordProfit); // Calculate profit from sales automatically

// Orphaned transactions management
router.get('/orphaned-transactions', findOrphanedTransactions);
router.post('/cleanup-orphaned-transactions', cleanupOrphanedTransactions);

// Purchase order ledger cleanup
router.post('/cleanup-purchase-order-ledger', deletePurchaseOrderLedgerEntries);

export default router;
