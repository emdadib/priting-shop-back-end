const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('🗑️ Starting data cleanup...');

    // Check current data
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    
    console.log(`📊 Current data: ${productCount} products, ${categoryCount} categories`);

    if (productCount === 0 && categoryCount === 0) {
      console.log('✅ No data to delete!');
      return;
    }

    // Delete related data first
    console.log('🔄 Deleting related data...');
    
    try {
      await prisma.inventoryMovement.deleteMany({});
      console.log('✅ Deleted inventory movements');
    } catch (e) {
      console.log('ℹ️ No inventory movements to delete');
    }

    try {
      await prisma.inventory.deleteMany({});
      console.log('✅ Deleted inventory records');
    } catch (e) {
      console.log('ℹ️ No inventory records to delete');
    }

    try {
      await prisma.priceHistory.deleteMany({});
      console.log('✅ Deleted price history');
    } catch (e) {
      console.log('ℹ️ No price history to delete');
    }

    try {
      await prisma.orderItem.deleteMany({});
      console.log('✅ Deleted order items');
    } catch (e) {
      console.log('ℹ️ No order items to delete');
    }

    // Delete products
    console.log('📦 Deleting products...');
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.count} products`);

    // Delete categories
    console.log('📋 Deleting categories...');
    const deletedCategories = await prisma.category.deleteMany({});
    console.log(`✅ Deleted ${deletedCategories.count} categories`);

    console.log('🎉 Data cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
