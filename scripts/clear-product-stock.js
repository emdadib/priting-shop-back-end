const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearProductStock() {
  try {
    console.log('📦 Starting product stock cleanup...');

    // Check current inventory data
    const inventoryCount = await prisma.inventory.count();
    const totalQuantity = await prisma.inventory.aggregate({
      _sum: {
        quantity: true,
        reserved: true,
        available: true
      }
    });
    
    console.log(`📊 Current inventory data:`);
    console.log(`   - Inventory records: ${inventoryCount}`);
    console.log(`   - Total quantity: ${totalQuantity._sum.quantity || 0}`);
    console.log(`   - Total reserved: ${totalQuantity._sum.reserved || 0}`);
    console.log(`   - Total available: ${totalQuantity._sum.available || 0}`);

    if (inventoryCount === 0) {
      console.log('✅ No inventory records to clear!');
      return;
    }

    console.log('🔄 Clearing all product stock quantities...');
    
    // Clear all inventory quantities to 0
    const inventoryUpdated = await prisma.inventory.updateMany({
      data: {
        quantity: 0,
        reserved: 0,
        available: 0,
        lastUpdated: new Date()
      }
    });
    
    console.log(`✅ Cleared stock quantities for ${inventoryUpdated.count} inventory records`);

    // Delete all inventory movements
    console.log('📊 Deleting inventory movements...');
    const inventoryMovementsDeleted = await prisma.inventoryMovement.deleteMany({});
    console.log(`✅ Deleted ${inventoryMovementsDeleted.count} inventory movements`);

    // Verify final state
    const finalInventoryCount = await prisma.inventory.count();
    const finalTotalQuantity = await prisma.inventory.aggregate({
      _sum: {
        quantity: true,
        reserved: true,
        available: true
      }
    });

    console.log('🎉 Product stock cleanup completed successfully!');
    console.log(`📊 Final inventory state:`);
    console.log(`   - Inventory records: ${finalInventoryCount}`);
    console.log(`   - Total quantity: ${finalTotalQuantity._sum.quantity || 0}`);
    console.log(`   - Total reserved: ${finalTotalQuantity._sum.reserved || 0}`);
    console.log(`   - Total available: ${finalTotalQuantity._sum.available || 0}`);

  } catch (error) {
    console.error('❌ Error during product stock cleanup:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearProductStock()
  .then(() => {
    console.log('🎉 All product stock cleared successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Stock cleanup failed:', error);
    process.exit(1);
  });
