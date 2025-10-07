const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleDashboardData() {
  try {
    console.log('📊 Adding sample data for dashboard...');

    // Get existing products and customers
    const products = await prisma.product.findMany({ take: 5 });
    const customers = await prisma.customer.findMany({ take: 3 });
    const users = await prisma.user.findMany({ take: 1 });

    if (products.length === 0 || customers.length === 0 || users.length === 0) {
      console.log('❌ Need products, customers, and users to create sample orders');
      return;
    }

    const product = products[0];
    const customer = customers[0];
    const user = users[0];

    // Create sample orders for the past week
    const today = new Date();
    const orders = [];

    for (let i = 6; i >= 0; i--) {
      const orderDate = new Date(today);
      orderDate.setDate(orderDate.getDate() - i);
      
      // Create 1-3 orders per day
      const ordersPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < ordersPerDay; j++) {
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const quantity = Math.floor(Math.random() * 5) + 1;
        const unitPrice = Math.floor(Math.random() * 100) + 10;
        const total = quantity * unitPrice;
        
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            userId: user.id,
            status: i < 2 ? 'PENDING' : i < 4 ? 'IN_PROGRESS' : 'COMPLETED',
            type: 'SALE',
            orderType: 'RETAIL',
            subtotal: total * 0.9,
            taxAmount: total * 0.1,
            total: total,
            notes: `Sample order for testing dashboard`,
            createdAt: orderDate,
            updatedAt: orderDate
          }
        });

        // Create order item
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            costPrice: unitPrice * 0.7,
            total: total,
            taxAmount: total * 0.1
          }
        });

        orders.push(order);
      }
    }

    console.log(`✅ Created ${orders.length} sample orders`);

    // Create some inventory with low stock
    const inventory = await prisma.inventory.findFirst({
      where: { productId: product.id }
    });

    if (inventory) {
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: 5, // Low stock
          available: 5,
          lastUpdated: new Date()
        }
      });
      console.log('✅ Updated inventory to show low stock alert');
    }

    console.log('🎉 Sample dashboard data created successfully!');

  } catch (error) {
    console.error('❌ Error creating sample dashboard data:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSampleDashboardData()
  .then(() => {
    console.log('🎉 Sample data creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sample data creation failed:', error);
    process.exit(1);
  });
