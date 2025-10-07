import express from 'express';
import {
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanPayment,
  getLoanPayments,
  getLoanSummary
} from '../controllers/loanController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Loan management routes
router.get('/', getLoans);
router.get('/summary', getLoanSummary);
router.get('/:id', getLoan);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

// Loan payment routes
router.get('/:loanId/payments', getLoanPayments);
router.post('/:loanId/payments', addLoanPayment);

export default router;
