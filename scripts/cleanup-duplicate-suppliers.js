const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateSuppliers() {
  try {
    console.log('🔍 Finding duplicate suppliers...');
    
    // Find suppliers with the same name and company
    const suppliers = await prisma.supplier.findMany({
      orderBy: [
        { name: 'asc' },
        { company: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    const duplicates = {};
    
    suppliers.forEach(supplier => {
      const key = `${supplier.name}-${supplier.company}`.toLowerCase();
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(supplier);
    });

    console.log('📊 Duplicate analysis:');
    for (const [key, supplierList] of Object.entries(duplicates)) {
      if (supplierList.length > 1) {
        console.log(`\n${key}: ${supplierList.length} entries`);
        supplierList.forEach((supplier, index) => {
          console.log(`  ${index + 1}. ID: ${supplier.id}, Active: ${supplier.isActive}, Created: ${supplier.createdAt}`);
        });
      }
    }

    // Keep the first (oldest) active supplier, or if none are active, keep the oldest
    for (const [key, supplierList] of Object.entries(duplicates)) {
      if (supplierList.length > 1) {
        // Sort by: active first, then by creation date
        const sortedSuppliers = supplierList.sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const keepSupplier = sortedSuppliers[0];
        const deleteSuppliers = sortedSuppliers.slice(1);

        console.log(`\n✅ Keeping supplier: ${keepSupplier.name} (ID: ${keepSupplier.id}, Active: ${keepSupplier.isActive})`);
        
        for (const deleteSupplier of deleteSuppliers) {
          console.log(`🗑️  Deleting duplicate: ${deleteSupplier.name} (ID: ${deleteSupplier.id}, Active: ${deleteSupplier.isActive})`);
          
          // Check if supplier has any dependencies
          const hasProducts = await prisma.product.count({
            where: { supplierId: deleteSupplier.id }
          });
          
          const hasPurchaseOrders = await prisma.purchaseOrder.count({
            where: { supplierId: deleteSupplier.id }
          });

          if (hasProducts > 0 || hasPurchaseOrders > 0) {
            console.log(`   ⚠️  Cannot delete - has ${hasProducts} products and ${hasPurchaseOrders} purchase orders`);
            // Instead of deleting, just deactivate
            await prisma.supplier.update({
              where: { id: deleteSupplier.id },
              data: { isActive: false }
            });
            console.log(`   🔄 Deactivated instead`);
          } else {
            await prisma.supplier.delete({
              where: { id: deleteSupplier.id }
            });
            console.log(`   ✅ Deleted successfully`);
          }
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    
    // Show final supplier list
    const finalSuppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 Final supplier list:');
    finalSuppliers.forEach(supplier => {
      console.log(`  - ${supplier.name} (${supplier.company}) - ${supplier.isActive ? 'Active' : 'Inactive'}`);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateSuppliers();
