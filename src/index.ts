import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import orderRoutes from './routes/orders';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import supplierRoutes from './routes/suppliers';
import purchaseOrderRoutes from './routes/purchaseOrders';
import attendanceRoutes from './routes/attendance';
import commissionRoutes from './routes/commissions';
import reportRoutes from './routes/reports';
import settingRoutes from './routes/settings';
import madeToOrderRoutes from './routes/madeToOrder';
import accountingRoutes from './routes/accounting';
import warrantyRoutes from './routes/warranties';
import permissionRoutes from './routes/permissions';
import supplierPaymentRoutes from './routes/supplierPayments';
import photocopyRoutes from './routes/photocopy';
import loanRoutes from './routes/loans';
import salaryRoutes from './routes/salaries';
import salaryAdvanceRoutes from './routes/salaryAdvances';
import improvedSalaryRoutes from './routes/improvedSalary';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authenticateToken } from './middleware/auth';

// Import database
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
export const prisma = new PrismaClient();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 200, // allow 200 requests per 15 minutes, then...
  delayMs: () => 200 // begin adding 200ms of delay per request above 200
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "https://sbprinters.xyz",
    "https://sbprinters.netlify.app",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);
app.use(speedLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/made-to-order', authenticateToken, madeToOrderRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/purchase-orders', authenticateToken, purchaseOrderRoutes);
app.use('/api/supplier-payments', authenticateToken, supplierPaymentRoutes);
app.use('/api/accounting', authenticateToken, accountingRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/commissions', authenticateToken, commissionRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/settings', authenticateToken, settingRoutes);
app.use('/api/warranties', authenticateToken, warrantyRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/photocopy', photocopyRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/salaries', authenticateToken, salaryRoutes);
app.use('/api/salary-advances', authenticateToken, salaryAdvanceRoutes);
app.use('/api/improved-salary', improvedSalaryRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user to their room for personalized updates
  socket.on('join-user', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join inventory room for stock updates
  socket.on('join-inventory', () => {
    socket.join('inventory-updates');
    console.log('Client joined inventory updates room');
  });

  // Join orders room for order updates
  socket.on('join-orders', () => {
    socket.join('order-updates');
    console.log('Client joined order updates room');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app; 