const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWarrantyFlow() {
  try {
    console.log('🧪 Testing Warranty Flow...\n');

    // 1. Create a test product with warranty
    console.log('1. Creating test product with warranty...');
    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Printer with Warranty',
        description: 'A test printer for warranty testing',
        sku: 'TEST-PRINTER-001',
        barcode: '1234567890123',
        categoryId: 'clx1234567890', // You'll need to replace with actual category ID
        type: 'PHYSICAL',
        pricingModel: 'FIXED',
        basePrice: 1000.00,
        baseCostPrice: 800.00,
        hasWarranty: true,
        warrantyPeriod: 365, // 1 year
        warrantyPeriodType: 'ONE_YEAR',
        warrantyDescription: '1 year manufacturer warranty covering parts and labor'
      }
    });
    console.log(`✅ Created product: ${testProduct.name} (ID: ${testProduct.id})`);

    // 2. Create a test customer
    console.log('\n2. Creating test customer...');
    const testCustomer = await prisma.customer.create({
      data: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'BD'
      }
    });
    console.log(`✅ Created customer: ${testCustomer.firstName} ${testCustomer.lastName} (ID: ${testCustomer.id})`);

    // 3. Create a test user (you'll need to replace with actual user ID)
    console.log('\n3. Using existing user...');
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    console.log(`✅ Using user: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})`);

    // 4. Create a test order with warranty items
    console.log('\n4. Creating test order with warranty items...');
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}`,
        customerId: testCustomer.id,
        userId: testUser.id,
        status: 'COMPLETED',
        type: 'SALE',
        subtotal: 1000.00,
        taxAmount: 80.00,
        total: 1080.00,
        items: {
          create: [{
            productId: testProduct.id,
            quantity: 1,
            unitPrice: 1000.00,
            costPrice: 800.00,
            total: 1000.00,
            serialNumbers: 'SN001,SN002,SN003',
            warrantyStartDate: new Date(),
            warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          }]
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    console.log(`✅ Created order: ${testOrder.orderNumber} (ID: ${testOrder.id})`);
    console.log(`   - Warranty Start: ${testOrder.items[0].warrantyStartDate}`);
    console.log(`   - Warranty End: ${testOrder.items[0].warrantyEndDate}`);
    console.log(`   - Serial Numbers: ${testOrder.items[0].serialNumbers}`);

    // 5. Create a warranty claim
    console.log('\n5. Creating warranty claim...');
    const warrantyClaim = await prisma.warranty.create({
      data: {
        productId: testProduct.id,
        orderId: testOrder.id,
        customerId: testCustomer.id,
        warrantyNumber: `WAR-${Date.now()}`,
        issueDescription: 'Test warranty claim - printer not working',
        priority: 'MEDIUM',
        status: 'OPEN',
        createdBy: testUser.id
      },
      include: {
        product: true,
        customer: true,
        order: true
      }
    });
    console.log(`✅ Created warranty claim: ${warrantyClaim.warrantyNumber} (ID: ${warrantyClaim.id})`);

    // 6. Test warranty validation
    console.log('\n6. Testing warranty validation...');
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        orderId: testOrder.id,
        productId: testProduct.id
      }
    });

    if (orderItem) {
      const now = new Date();
      const warrantyStart = new Date(orderItem.warrantyStartDate);
      const warrantyEnd = new Date(orderItem.warrantyEndDate);

      console.log(`   - Current Date: ${now.toISOString()}`);
      console.log(`   - Warranty Start: ${warrantyStart.toISOString()}`);
      console.log(`   - Warranty End: ${warrantyEnd.toISOString()}`);

      if (now >= warrantyStart && now <= warrantyEnd) {
        console.log('✅ Warranty is VALID - within warranty period');
      } else if (now < warrantyStart) {
        console.log('❌ Warranty is INVALID - warranty has not started yet');
      } else {
        console.log('❌ Warranty is INVALID - warranty has expired');
      }
    }

    console.log('\n🎉 Warranty flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Product: ${testProduct.name} (${testProduct.warrantyPeriodType})`);
    console.log(`   - Order: ${testOrder.orderNumber}`);
    console.log(`   - Warranty Claim: ${warrantyClaim.warrantyNumber}`);
    console.log(`   - Serial Numbers: ${orderItem?.serialNumbers}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWarrantyFlow();
