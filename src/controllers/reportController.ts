import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get sales report
export const getSalesReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        type: 'SALE',
        status: 'COMPLETED',
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
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
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report'
    });
  }
};

// Get inventory report
export const getInventoryReport = async (req: Request, res: Response): Promise<Response | void> => {
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
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report'
    });
  }
};

// Get customer report
export const getCustomerReport = async (req: Request, res: Response): Promise<Response | void> => {
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
  } catch (error) {
    console.error('Get customer report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate customer report'
    });
  }
};

// Get financial report
export const getFinancialReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
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
  } catch (error) {
    console.error('Get financial report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate financial report'
    });
  }
};

// Get profit report
export const getProfitReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
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
    const profitByProduct: any[] = [];
    const profitByOrder: any[] = [];

    // Calculate profit for each order
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

        // Track profit by product
        const existingProduct = profitByProduct.find(p => p.productId === item.product.id);
        if (existingProduct) {
          existingProduct.revenue += itemRevenue;
          existingProduct.cost += itemCost;
          existingProduct.profit += itemProfit;
          existingProduct.quantity += Number(item.quantity);
        } else {
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

    // Sort products by profit (highest first)
    profitByProduct.sort((a, b) => b.profit - a.profit);

    // Sort orders by profit (highest first)
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
              const orderCost = order.items.reduce((itemSum, item) => 
                itemSum + (Number(item.product.baseCostPrice) * Number(item.quantity)), 0);
              return sum + (orderRevenue > 0 ? ((orderRevenue - orderCost) / orderRevenue) * 100 : 0);
            }, 0) / orders.length : 0
        },
        profitByProduct: profitByProduct.slice(0, 20), // Top 20 products
        profitByOrder: profitByOrder.slice(0, 50), // Top 50 orders
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Get profit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate profit report'
    });
  }
};

// Get staff report
export const getStaffReport = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
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
              gte: startDate ? new Date(startDate as string) : undefined,
              lte: endDate ? new Date(endDate as string) : undefined
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
  } catch (error) {
    console.error('Get staff report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate staff report'
    });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const today = new Date();
    // Fix date calculation bug - create new Date objects to avoid mutation
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Run all independent queries in parallel for better performance
    const [
      todayOrders,
      todaySales,
      monthOrders,
      monthSales,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      weeklySalesData,
      orderStatusData
    ] = await Promise.all([
      // Get today's orders count
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }),
      // Get today's sales total
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        _sum: {
          total: true
        }
      }),
      // Get this month's orders count
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      // Get this month's sales total
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          total: true
        }
      }),
      // Get pending orders count
      prisma.order.count({
        where: {
          status: 'PENDING'
        }
      }),
      // Get low stock alerts - use actual minStock values
      prisma.inventory.findMany({
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
      }),
      // Get recent orders
      prisma.order.findMany({
        take: 5,
        include: {
          customer: true,
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // Get weekly sales data for charts
      getWeeklySalesData(),
      // Get order status distribution for charts
      getOrderStatusDistribution()
    ]);

    // Filter items where quantity is less than or equal to minStock
    const filteredLowStockProducts = lowStockProducts.filter(item => 
      item.quantity <= item.product.minStock
    );

    console.log('Dashboard low stock check:', {
      totalInventoryItems: lowStockProducts.length,
      lowStockItems: filteredLowStockProducts.length,
      lowStockDetails: filteredLowStockProducts.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        minStock: item.product.minStock
      }))
    });

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
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard stats'
    });
  }
};

// Helper function to get weekly sales data
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

// Helper function to get order status distribution
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