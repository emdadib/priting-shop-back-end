const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateExistingPurchaseOrders() {
  try {
    console.log('🔄 Updating existing purchase orders with payment tracking...');

    // Get all purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        poNumber: true,
        total: true,
        paidAmount: true,
        dueAmount: true,
        paymentStatus: true
      }
    });

    console.log(`Found ${purchaseOrders.length} purchase orders to update`);

    let updatedCount = 0;

    for (const po of purchaseOrders) {
      const totalAmount = parseFloat(po.total.toString());
      const currentPaidAmount = parseFloat(po.paidAmount?.toString() || '0');
      const currentDueAmount = parseFloat(po.dueAmount?.toString() || '0');

      // If payment tracking is not properly set, update it
      if (currentPaidAmount === 0 && currentDueAmount === 0) {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: {
            paidAmount: 0,
            dueAmount: totalAmount,
            paymentStatus: 'PENDING'
          }
        });

        console.log(`✅ Updated PO ${po.poNumber}: Total=${totalAmount}, Due=${totalAmount}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped PO ${po.poNumber}: Already has payment tracking`);
      }
    }

    console.log(`\n🎉 Update completed! Updated ${updatedCount} purchase orders.`);

    // Show summary
    const summary = await prisma.purchaseOrder.groupBy({
      by: ['paymentStatus'],
      _count: { id: true },
      _sum: { 
        total: true,
        paidAmount: true,
        dueAmount: true
      }
    });

    console.log('\n📊 Payment Status Summary:');
    summary.forEach(status => {
      console.log(`${status.paymentStatus}: ${status._count.id} orders, Total: ${status._sum.total}, Paid: ${status._sum.paidAmount}, Due: ${status._sum.dueAmount}`);
    });

  } catch (error) {
    console.error('❌ Error updating purchase orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingPurchaseOrders();
