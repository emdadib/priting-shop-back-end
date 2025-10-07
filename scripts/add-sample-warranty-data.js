const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleWarrantyData() {
  try {
    console.log('Adding sample warranty data...');

    // First, let's get some existing products, customers, and orders
    const products = await prisma.product.findMany({
      where: { hasWarranty: true },
      take: 3
    });

    const customers = await prisma.customer.findMany({
      take: 3
    });

    const orders = await prisma.order.findMany({
      take: 3
    });

    if (products.length === 0) {
      console.log('No products with warranty found. Creating sample products...');
      
      // Create a sample product with warranty
      const sampleProduct = await prisma.product.create({
        data: {
          name: 'Sample Printer',
          description: 'A sample printer for testing',
          sku: 'PRINT-001',
          basePrice: 299.99,
          baseCostPrice: 199.99,
          categoryId: (await prisma.category.findFirst())?.id || 'default',
          type: 'PHYSICAL',
          pricingModel: 'FIXED',
          hasInventory: true,
          isCustomOrder: false,
          requiresSpecifications: false,
          minStock: 5,
          maxStock: 50,
          unit: 'piece',
          isActive: true,
          hasWarranty: true,
          warrantyPeriod: 365, // 1 year warranty
          warrantyDescription: '1 year manufacturer warranty'
        }
      });
      products.push(sampleProduct);
    }

    if (customers.length === 0) {
      console.log('No customers found. Creating sample customers...');
      
      const sampleCustomer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          address: '123 Main St, City, State 12345'
        }
      });
      customers.push(sampleCustomer);
    }

    if (orders.length === 0) {
      console.log('No orders found. Creating sample orders...');
      
      const sampleOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          customerId: customers[0].id,
          type: 'SALE',
          status: 'COMPLETED',
          totalAmount: 299.99,
          items: {
            create: [{
              productId: products[0].id,
              quantity: 1,
              unitPrice: 299.99,
              totalPrice: 299.99
            }]
          }
        }
      });
      orders.push(sampleOrder);
    }

    // Create sample warranties
    const sampleWarranties = [
      {
        productId: products[0].id,
        orderId: orders[0].id,
        customerId: customers[0].id,
        warrantyNumber: `WAR-${Date.now()}-001`,
        issueDescription: 'Printer not printing properly - paper jams frequently',
        status: 'OPEN',
        priority: 'HIGH',
        notes: 'Customer reported issue within warranty period',
        createdBy: (await prisma.user.findFirst())?.id || 'default'
      },
      {
        productId: products[0].id,
        orderId: orders[0].id,
        customerId: customers[0].id,
        warrantyNumber: `WAR-${Date.now()}-002`,
        issueDescription: 'Display screen is flickering',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        notes: 'Technician assigned to investigate',
        createdBy: (await prisma.user.findFirst())?.id || 'default'
      },
      {
        productId: products[0].id,
        orderId: orders[0].id,
        customerId: customers[0].id,
        warrantyNumber: `WAR-${Date.now()}-003`,
        issueDescription: 'Power button not responding',
        status: 'RESOLVED',
        priority: 'URGENT',
        resolution: 'Replaced power button assembly',
        resolvedDate: new Date(),
        notes: 'Issue resolved by replacing defective component',
        createdBy: (await prisma.user.findFirst())?.id || 'default'
      }
    ];

    for (const warrantyData of sampleWarranties) {
      const warranty = await prisma.warranty.create({
        data: warrantyData
      });
      console.log(`Created warranty: ${warranty.warrantyNumber}`);
    }

    console.log('Sample warranty data added successfully!');
  } catch (error) {
    console.error('Error adding sample warranty data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleWarrantyData();
