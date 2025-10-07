const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllSalesPurchaseData() {
  try {
    console.log('🗑️ Starting comprehensive sales and purchase data cleanup...');

    // Check current data counts
    const orderCount = await prisma.order.count();
    const purchaseOrderCount = await prisma.purchaseOrder.count();
    const invoiceCount = await prisma.invoice.count();
    const paymentCount = await prisma.payment.count();
    const inventoryCount = await prisma.inventory.count();
    
    console.log(`📊 Current data:`);
    console.log(`   - Orders: ${orderCount}`);
    console.log(`   - Purchase Orders: ${purchaseOrderCount}`);
    console.log(`   - Invoices: ${invoiceCount}`);
    console.log(`   - Payments: ${paymentCount}`);
    console.log(`   - Inventory: ${inventoryCount}`);

    if (orderCount === 0 && purchaseOrderCount === 0 && invoiceCount === 0 && paymentCount === 0) {
      console.log('✅ No sales/purchase data to delete!');
      return;
    }

    console.log('🔄 Deleting sales and purchase data in correct order...');
    
    // 1. Delete payments first (they reference orders and invoices)
    console.log('💳 Deleting payments...');
    const paymentsDeleted = await prisma.payment.deleteMany({});
    console.log(`✅ Deleted ${paymentsDeleted.count} payments`);

    // 2. Delete invoices (they reference orders)
    console.log('📄 Deleting invoices...');
    const invoicesDeleted = await prisma.invoice.deleteMany({});
    console.log(`✅ Deleted ${invoicesDeleted.count} invoices`);

    // 3. Delete order items (they reference orders and products)
    console.log('🛒 Deleting order items...');
    const orderItemsDeleted = await prisma.orderItem.deleteMany({});
    console.log(`✅ Deleted ${orderItemsDeleted.count} order items`);

    // 4. Delete purchase order items (they reference purchase orders and products)
    console.log('📦 Deleting purchase order items...');
    const purchaseOrderItemsDeleted = await prisma.purchaseOrderItem.deleteMany({});
    console.log(`✅ Deleted ${purchaseOrderItemsDeleted.count} purchase order items`);

    // 5. Delete orders
    console.log('📋 Deleting orders...');
    const ordersDeleted = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${ordersDeleted.count} orders`);

    // 6. Delete purchase orders
    console.log('🛍️ Deleting purchase orders...');
    const purchaseOrdersDeleted = await prisma.purchaseOrder.deleteMany({});
    console.log(`✅ Deleted ${purchaseOrdersDeleted.count} purchase orders`);

    // 7. Delete inventory movements
    console.log('📊 Deleting inventory movements...');
    const inventoryMovementsDeleted = await prisma.inventoryMovement.deleteMany({});
    console.log(`✅ Deleted ${inventoryMovementsDeleted.count} inventory movements`);

    // 8. Clear inventory quantities (set to 0 instead of deleting records)
    console.log('📦 Clearing inventory quantities...');
    const inventoryUpdated = await prisma.inventory.updateMany({
      data: {
        quantity: 0,
        reserved: 0,
        available: 0,
        lastUpdated: new Date()
      }
    });
    console.log(`✅ Cleared quantities for ${inventoryUpdated.count} inventory records`);

    // 9. Delete customer transactions
    console.log('👥 Deleting customer transactions...');
    const customerTransactionsDeleted = await prisma.customerTransaction.deleteMany({});
    console.log(`✅ Deleted ${customerTransactionsDeleted.count} customer transactions`);

    // 10. Delete supplier transactions
    console.log('🏢 Deleting supplier transactions...');
    const supplierTransactionsDeleted = await prisma.supplierTransaction.deleteMany({});
    console.log(`✅ Deleted ${supplierTransactionsDeleted.count} supplier transactions`);

    // 11. Delete company transactions
    console.log('🏛️ Deleting company transactions...');
    const companyTransactionsDeleted = await prisma.companyTransaction.deleteMany({});
    console.log(`✅ Deleted ${companyTransactionsDeleted.count} company transactions`);

    // 12. Delete commissions
    console.log('💰 Deleting commissions...');
    const commissionsDeleted = await prisma.commission.deleteMany({});
    console.log(`✅ Deleted ${commissionsDeleted.count} commissions`);

    // 13. Delete price history
    console.log('📈 Deleting price history...');
    const priceHistoryDeleted = await prisma.priceHistory.deleteMany({});
    console.log(`✅ Deleted ${priceHistoryDeleted.count} price history records`);

    // Verify final counts
    const finalOrderCount = await prisma.order.count();
    const finalPurchaseOrderCount = await prisma.purchaseOrder.count();
    const finalInvoiceCount = await prisma.invoice.count();
    const finalPaymentCount = await prisma.payment.count();

    console.log('🎉 Sales and purchase data cleanup completed successfully!');
    console.log(`📊 Final counts:`);
    console.log(`   - Orders: ${finalOrderCount}`);
    console.log(`   - Purchase Orders: ${finalPurchaseOrderCount}`);
    console.log(`   - Invoices: ${finalInvoiceCount}`);
    console.log(`   - Payments: ${finalPaymentCount}`);

  } catch (error) {
    console.error('❌ Error during sales/purchase data cleanup:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllSalesPurchaseData()
  .then(() => {
    console.log('🎉 All sales and purchase data cleared successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
