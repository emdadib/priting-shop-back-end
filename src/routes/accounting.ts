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
  deleteExpenseCategory
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

export default router;
