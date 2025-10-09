"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const orders_1 = __importDefault(require("./routes/orders"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const payments_1 = __importDefault(require("./routes/payments"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const purchaseOrders_1 = __importDefault(require("./routes/purchaseOrders"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const commissions_1 = __importDefault(require("./routes/commissions"));
const reports_1 = __importDefault(require("./routes/reports"));
const settings_1 = __importDefault(require("./routes/settings"));
const madeToOrder_1 = __importDefault(require("./routes/madeToOrder"));
const accounting_1 = __importDefault(require("./routes/accounting"));
const warranties_1 = __importDefault(require("./routes/warranties"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const supplierPayments_1 = __importDefault(require("./routes/supplierPayments"));
const photocopy_1 = __importDefault(require("./routes/photocopy"));
const loans_1 = __importDefault(require("./routes/loans"));
const salaries_1 = __importDefault(require("./routes/salaries"));
const salaryAdvances_1 = __importDefault(require("./routes/salaryAdvances"));
const improvedSalary_1 = __importDefault(require("./routes/improvedSalary"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const auth_2 = require("./middleware/auth");
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000,
    delayAfter: 200,
    delayMs: () => 200
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);
app.use(speedLimiter);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', auth_2.authenticateToken, users_1.default);
app.use('/api/customers', auth_2.authenticateToken, customers_1.default);
app.use('/api/products', auth_2.authenticateToken, products_1.default);
app.use('/api/inventory', auth_2.authenticateToken, inventory_1.default);
app.use('/api/made-to-order', auth_2.authenticateToken, madeToOrder_1.default);
app.use('/api/orders', auth_2.authenticateToken, orders_1.default);
app.use('/api/invoices', auth_2.authenticateToken, invoices_1.default);
app.use('/api/payments', auth_2.authenticateToken, payments_1.default);
app.use('/api/suppliers', auth_2.authenticateToken, suppliers_1.default);
app.use('/api/purchase-orders', auth_2.authenticateToken, purchaseOrders_1.default);
app.use('/api/supplier-payments', auth_2.authenticateToken, supplierPayments_1.default);
app.use('/api/accounting', auth_2.authenticateToken, accounting_1.default);
app.use('/api/attendance', auth_2.authenticateToken, attendance_1.default);
app.use('/api/commissions', auth_2.authenticateToken, commissions_1.default);
app.use('/api/reports', auth_2.authenticateToken, reports_1.default);
app.use('/api/settings', auth_2.authenticateToken, settings_1.default);
app.use('/api/warranties', auth_2.authenticateToken, warranties_1.default);
app.use('/api/permissions', permissions_1.default);
app.use('/api/photocopy', photocopy_1.default);
app.use('/api/loans', loans_1.default);
app.use('/api/salaries', auth_2.authenticateToken, salaries_1.default);
app.use('/api/salary-advances', auth_2.authenticateToken, salaryAdvances_1.default);
app.use('/api/improved-salary', improvedSalary_1.default);
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
    });
    socket.on('join-inventory', () => {
        socket.join('inventory-updates');
        console.log('Client joined inventory updates room');
    });
    socket.on('join-orders', () => {
        socket.join('order-updates');
        console.log('Client joined order updates room');
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
app.set('io', io);
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await exports.prisma.$disconnect();
    server.close(() => {
        console.log('Process terminated');
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await exports.prisma.$disconnect();
    server.close(() => {
        console.log('Process terminated');
    });
});
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map