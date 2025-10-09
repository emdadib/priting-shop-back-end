"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getStaffReport = exports.getProfitReport = exports.getFinancialReport = exports.getCustomerReport = exports.getInventoryReport = exports.getSalesReport = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await prisma.order.findMany({
            where: {
                type: 'SALE',
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const totalSales = orders.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + Number(item.total), 0);
        }, 0);
        res.json({
            success: true,
            data: {
                orders,
                totalSales,
                orderCount: orders.length
            }
        });
    }
    catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate sales report'
        });
    }
};
exports.getSalesReport = getSalesReport;
const getInventoryReport = async (req, res) => {
    try {
        const inventory = await prisma.inventory.findMany({
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                quantity: 'asc'
            }
        });
        const lowStockItems = inventory.filter(item => item.quantity <= item.product.minStock);
        const outOfStockItems = inventory.filter(item => item.quantity === 0);
        res.json({
            success: true,
            data: {
                inventory,
                lowStockItems,
                outOfStockItems,
                totalItems: inventory.length,
                lowStockCount: lowStockItems.length,
                outOfStockCount: outOfStockItems.length
            }
        });
    }
    catch (error) {
        console.error('Get inventory report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate inventory report'
        });
    }
};
exports.getInventoryReport = getInventoryReport;
const getCustomerReport = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                orders: {
                    where: {
                        status: 'COMPLETED'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const activeCustomers = customers.filter(customer => customer.orders.length > 0);
        const totalCustomers = customers.length;
        const totalOrders = customers.reduce((sum, customer) => sum + customer.orders.length, 0);
        res.json({
            success: true,
            data: {
                customers,
                activeCustomers,
                totalCustomers,
                totalOrders,
                averageOrdersPerCustomer: totalCustomers > 0 ? totalOrders / totalCustomers : 0
            }
        });
    }
    catch (error) {
        console.error('Get customer report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate customer report'
        });
    }
};
exports.getCustomerReport = getCustomerReport;
const getFinancialReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                }
            },
            include: {
                items: true
            }
        });
        const totalRevenue = orders.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + Number(item.total), 0);
        }, 0);
        const totalTax = orders.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + Number(item.taxAmount), 0);
        }, 0);
        res.json({
            success: true,
            data: {
                totalRevenue,
                totalTax,
                netRevenue: totalRevenue - totalTax,
                orderCount: orders.length,
                averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
            }
        });
    }
    catch (error) {
        console.error('Get financial report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate financial report'
        });
    }
};
exports.getFinancialReport = getFinancialReport;
const getProfitReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                basePrice: true,
                                baseCostPrice: true,
                                sku: true
                            }
                        }
                    }
                }
            }
        });
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        const profitByProduct = [];
        const profitByOrder = [];
        orders.forEach(order => {
            let orderRevenue = 0;
            let orderCost = 0;
            let orderProfit = 0;
            order.items.forEach(item => {
                const itemRevenue = Number(item.total);
                const itemCost = Number(item.product.baseCostPrice) * Number(item.quantity);
                const itemProfit = itemRevenue - itemCost;
                orderRevenue += itemRevenue;
                orderCost += itemCost;
                orderProfit += itemProfit;
                const existingProduct = profitByProduct.find(p => p.productId === item.product.id);
                if (existingProduct) {
                    existingProduct.revenue += itemRevenue;
                    existingProduct.cost += itemCost;
                    existingProduct.profit += itemProfit;
                    existingProduct.quantity += Number(item.quantity);
                }
                else {
                    profitByProduct.push({
                        productId: item.product.id,
                        productName: item.product.name,
                        sku: item.product.sku,
                        revenue: itemRevenue,
                        cost: itemCost,
                        profit: itemProfit,
                        quantity: Number(item.quantity),
                        margin: itemRevenue > 0 ? ((itemProfit / itemRevenue) * 100) : 0
                    });
                }
            });
            totalRevenue += orderRevenue;
            totalCost += orderCost;
            totalProfit += orderProfit;
            profitByOrder.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                revenue: orderRevenue,
                cost: orderCost,
                profit: orderProfit,
                margin: orderRevenue > 0 ? ((orderProfit / orderRevenue) * 100) : 0,
                itemCount: order.items.length,
                createdAt: order.createdAt
            });
        });
        profitByProduct.sort((a, b) => b.profit - a.profit);
        profitByOrder.sort((a, b) => b.profit - a.profit);
        const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    overallMargin,
                    orderCount: orders.length,
                    averageOrderProfit: orders.length > 0 ? totalProfit / orders.length : 0,
                    averageOrderMargin: orders.length > 0 ?
                        orders.reduce((sum, order) => {
                            const orderRevenue = order.items.reduce((itemSum, item) => itemSum + Number(item.total), 0);
                            const orderCost = order.items.reduce((itemSum, item) => itemSum + (Number(item.product.baseCostPrice) * Number(item.quantity)), 0);
                            return sum + (orderRevenue > 0 ? ((orderRevenue - orderCost) / orderRevenue) * 100 : 0);
                        }, 0) / orders.length : 0
                },
                profitByProduct: profitByProduct.slice(0, 20),
                profitByOrder: profitByOrder.slice(0, 50),
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    }
    catch (error) {
        console.error('Get profit report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate profit report'
        });
    }
};
exports.getProfitReport = getProfitReport;
const getStaffReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: {
                orders: {
                    where,
                    include: {
                        items: true
                    }
                },
                attendance: {
                    where: {
                        date: {
                            gte: startDate ? new Date(startDate) : undefined,
                            lte: endDate ? new Date(endDate) : undefined
                        }
                    }
                },
                commissions: {
                    where
                }
            }
        });
        const staffReport = users.map(user => {
            const totalOrders = user.orders.length;
            const totalSales = user.orders.reduce((sum, order) => sum + Number(order.total), 0);
            const totalHours = user.attendance.reduce((sum, record) => sum + Number(record.totalHours || 0), 0);
            const totalCommissions = user.commissions.reduce((sum, commission) => sum + Number(commission.amount), 0);
            return {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role
                },
                totalOrders,
                totalSales,
                totalHours,
                totalCommissions,
                averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
            };
        });
        res.json({
            success: true,
            data: staffReport
        });
    }
    catch (error) {
        console.error('Get staff report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate staff report'
        });
    }
};
exports.getStaffReport = getStaffReport;
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const todayOrders = await prisma.order.count({
            where: {
                createdAt: {
                    gte: new Date(today.setHours(0, 0, 0, 0)),
                    lte: new Date(today.setHours(23, 59, 59, 999))
                }
            }
        });
        const todaySales = await prisma.order.aggregate({
            where: {
                createdAt: {
                    gte: new Date(today.setHours(0, 0, 0, 0)),
                    lte: new Date(today.setHours(23, 59, 59, 999))
                }
            },
            _sum: {
                total: true
            }
        });
        const monthOrders = await prisma.order.count({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });
        const monthSales = await prisma.order.aggregate({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                total: true
            }
        });
        const pendingOrders = await prisma.order.count({
            where: {
                status: 'PENDING'
            }
        });
        const lowStockProducts = await prisma.inventory.findMany({
            where: {
                product: {
                    isActive: true,
                    hasInventory: true,
                    minStock: {
                        gt: 0
                    }
                }
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        minStock: true,
                        unit: true
                    }
                }
            }
        });
        const filteredLowStockProducts = lowStockProducts.filter(item => item.quantity <= item.product.minStock);
        console.log('Dashboard low stock check:', {
            totalInventoryItems: lowStockProducts.length,
            lowStockItems: filteredLowStockProducts.length,
            lowStockDetails: filteredLowStockProducts.map(item => ({
                productName: item.product.name,
                quantity: item.quantity,
                minStock: item.product.minStock
            }))
        });
        const recentOrders = await prisma.order.findMany({
            take: 5,
            include: {
                customer: true,
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const weeklySalesData = await getWeeklySalesData();
        const orderStatusData = await getOrderStatusDistribution();
        res.json({
            success: true,
            data: {
                today: {
                    orders: todayOrders,
                    sales: Number(todaySales._sum.total || 0)
                },
                month: {
                    orders: monthOrders,
                    sales: Number(monthSales._sum.total || 0)
                },
                pendingOrders,
                lowStockCount: filteredLowStockProducts.length,
                lowStockProducts: filteredLowStockProducts,
                recentOrders,
                weeklySalesData,
                orderStatusData
            }
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate dashboard stats'
        });
    }
};
exports.getDashboardStats = getDashboardStats;
const getWeeklySalesData = async () => {
    const today = new Date();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        const daySales = await prisma.order.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            _sum: {
                total: true
            }
        });
        weeklyData.push({
            name: weekDays[date.getDay()],
            sales: Number(daySales._sum.total || 0)
        });
    }
    return weeklyData;
};
const getOrderStatusDistribution = async () => {
    const statusCounts = await prisma.order.groupBy({
        by: ['status'],
        _count: {
            status: true
        }
    });
    const totalOrders = statusCounts.reduce((sum, item) => sum + item._count.status, 0);
    const statusData = statusCounts.map(item => {
        const percentage = totalOrders > 0 ? (item._count.status / totalOrders) * 100 : 0;
        let color = '#8884d8';
        switch (item.status) {
            case 'COMPLETED':
                color = '#4caf50';
                break;
            case 'PENDING':
                color = '#ff9800';
                break;
            case 'IN_PROGRESS':
                color = '#2196f3';
                break;
            case 'CANCELLED':
                color = '#f44336';
                break;
            default:
                color = '#8884d8';
        }
        return {
            name: item.status.replace('_', ' '),
            value: item._count.status,
            percentage: Math.round(percentage),
            color
        };
    });
    return statusData;
};
//# sourceMappingURL=reportController.js.map