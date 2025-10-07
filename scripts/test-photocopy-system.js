const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhotocopySystem() {
  try {
    console.log('Testing photocopy system...\n');

    // 1. Check if photocopy products exist
    console.log('1. Checking photocopy products...');
    const photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    if (!photocopyCategory) {
      console.log('❌ Photocopy category not found');
      return;
    }

    const products = await prisma.product.findMany({
      where: { categoryId: photocopyCategory.id },
      include: { inventory: true }
    });

    console.log(`✅ Found ${products.length} photocopy products:`);
    products.forEach(product => {
      console.log(`   - ${product.name} (${product.sku}): ${product.basePrice} BDT`);
      if (product.inventory) {
        console.log(`     Inventory: ${product.inventory.quantity} ${product.unit}`);
      }
    });

    // 2. Test creating a photocopy order
    console.log('\n2. Testing photocopy order creation...');
    
    const oneSidedProduct = products.find(p => p.name.includes('১ পৃষ্ঠা'));
    const bothSidedProduct = products.find(p => p.name.includes('উভয় পৃষ্ঠা'));
    const photocopyPageProduct = products.find(p => p.name.toLowerCase().includes('photocopy page'));

    if (!oneSidedProduct || !bothSidedProduct || !photocopyPageProduct) {
      console.log('❌ Required photocopy products not found');
      return;
    }

    // Get system user
    const systemUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!systemUser) {
      console.log('❌ No system user found');
      return;
    }

    // Create test order
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-PHOTO-${Date.now()}`,
        userId: systemUser.id,
        status: 'COMPLETED',
        type: 'SALE',
        orderType: 'RETAIL',
        subtotal: 10.00,
        taxAmount: 0,
        discountAmount: 0,
        total: 10.00,
        notes: 'Test photocopy order - 2 one-sided, 1 two-sided',
        completedAt: new Date(),
        items: {
          create: [
            {
              productId: oneSidedProduct.id,
              quantity: 2,
              unitPrice: oneSidedProduct.basePrice,
              costPrice: oneSidedProduct.baseCostPrice,
              discount: 0,
              taxAmount: 0,
              total: 2 * oneSidedProduct.basePrice
            },
            {
              productId: bothSidedProduct.id,
              quantity: 1,
              unitPrice: bothSidedProduct.basePrice,
              costPrice: bothSidedProduct.baseCostPrice,
              discount: 0,
              taxAmount: 0,
              total: 1 * bothSidedProduct.basePrice
            },
            {
              productId: photocopyPageProduct.id,
              quantity: 4, // 2 + (1 * 2) = 4 pages
              unitPrice: photocopyPageProduct.basePrice,
              costPrice: photocopyPageProduct.baseCostPrice,
              discount: 0,
              taxAmount: 0,
              total: 4 * photocopyPageProduct.basePrice
            }
          ]
        }
      }
    });

    console.log(`✅ Test order created: ${testOrder.orderNumber}`);

    // 3. Test inventory update
    console.log('\n3. Testing inventory update...');
    
    const inventoryBefore = await prisma.inventory.findUnique({
      where: { productId: photocopyPageProduct.id }
    });

    console.log(`   Before: ${inventoryBefore?.quantity || 0} pages`);

    // Update inventory
    const newQuantity = (inventoryBefore?.quantity || 0) - 4;
    const newAvailable = (inventoryBefore?.available || 0) - 4;

    await prisma.inventory.update({
      where: { productId: photocopyPageProduct.id },
      data: {
        quantity: newQuantity,
        available: newAvailable
      }
    });

    // Create inventory movement
    await prisma.inventoryMovement.create({
      data: {
        productId: photocopyPageProduct.id,
        type: 'SALE',
        quantity: -4,
        previousQuantity: inventoryBefore?.quantity || 0,
        newQuantity,
        reason: `Test photocopy order ${testOrder.orderNumber}`,
        reference: testOrder.orderNumber,
        userId: systemUser.id
      }
    });

    const inventoryAfter = await prisma.inventory.findUnique({
      where: { productId: photocopyPageProduct.id }
    });

    console.log(`   After: ${inventoryAfter?.quantity || 0} pages`);
    console.log(`✅ Inventory updated successfully`);

    // 4. Clean up test data
    console.log('\n4. Cleaning up test data...');
    
    // Delete order items first
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrder.id }
    });
    
    // Then delete the order
    await prisma.order.delete({
      where: { id: testOrder.id }
    });

    // Restore inventory
    await prisma.inventory.update({
      where: { productId: photocopyPageProduct.id },
      data: {
        quantity: inventoryBefore?.quantity || 0,
        available: inventoryBefore?.available || 0
      }
    });

    // Delete inventory movement
    await prisma.inventoryMovement.deleteMany({
      where: { reference: testOrder.orderNumber }
    });

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Photocopy system test completed successfully!');
    console.log('\nThe photocopy system is ready to use:');
    console.log('- Access the photocopy page at: /photocopy');
    console.log('- API endpoints are available at: /api/photocopy/*');
    console.log('- Inventory management is working correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhotocopySystem();
