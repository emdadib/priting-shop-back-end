const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearProductsAndCategories() {
  try {
    console.log('🗑️  Starting cleanup of products and categories...');

    // First, let's check what we have
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    
    console.log(`📊 Found ${productCount} products and ${categoryCount} categories`);

    if (productCount === 0 && categoryCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }

    // Delete in the correct order to handle foreign key constraints
    console.log('🔄 Deleting products and related data...');
    
    // Delete price history records
    const priceHistoryDeleted = await prisma.priceHistory.deleteMany({});
    console.log(`🗑️  Deleted ${priceHistoryDeleted.count} price history records`);

    // Delete inventory movements
    const inventoryMovementsDeleted = await prisma.inventoryMovement.deleteMany({});
    console.log(`🗑️  Deleted ${inventoryMovementsDeleted.count} inventory movements`);

    // Delete inventory records
    const inventoryDeleted = await prisma.inventory.deleteMany({});
    console.log(`🗑️  Deleted ${inventoryDeleted.count} inventory records`);

    // Delete order items
    const orderItemsDeleted = await prisma.orderItem.deleteMany({});
    console.log(`🗑️  Deleted ${orderItemsDeleted.count} order items`);

    // Delete products
    const productsDeleted = await prisma.product.deleteMany({});
    console.log(`🗑️  Deleted ${productsDeleted.count} products`);

    // Delete categories (children first, then parents)
    const categoriesDeleted = await prisma.category.deleteMany({});
    console.log(`🗑️  Deleted ${categoriesDeleted.count} categories`);

    // Verify deletion
    const finalProductCount = await prisma.product.count();
    const finalCategoryCount = await prisma.category.count();

    console.log('✅ Cleanup completed successfully!');
    console.log(`📊 Final counts: ${finalProductCount} products, ${finalCategoryCount} categories`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearProductsAndCategories()
  .then(() => {
    console.log('🎉 Database cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });

