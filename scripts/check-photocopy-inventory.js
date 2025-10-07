const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPhotocopyInventory() {
  try {
    console.log('Checking photocopy inventory...');

    // Find photocopy category
    const photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    if (!photocopyCategory) {
      console.log('Photocopy category not found');
      return;
    }

    // Get photocopy page product
    const photocopyPageProduct = await prisma.product.findFirst({
      where: {
        categoryId: photocopyCategory.id,
        name: { contains: 'Photocopy Page' }
      },
      include: {
        inventory: true
      }
    });

    if (!photocopyPageProduct) {
      console.log('Photocopy page product not found');
      return;
    }

    console.log(`\nPhotocopy Page Inventory:`);
    console.log(`Product: ${photocopyPageProduct.name}`);
    console.log(`SKU: ${photocopyPageProduct.sku}`);
    console.log(`Current Stock: ${photocopyPageProduct.inventory?.quantity || 0} pages`);
    console.log(`Available: ${photocopyPageProduct.inventory?.available || 0} pages`);
    console.log(`Reserved: ${photocopyPageProduct.inventory?.reserved || 0} pages`);

    // Check if stock is low
    const minStock = photocopyPageProduct.minStock || 1000;
    const currentStock = photocopyPageProduct.inventory?.quantity || 0;

    if (currentStock < minStock) {
      console.log(`\n⚠️  WARNING: Stock is low!`);
      console.log(`Current: ${currentStock} pages`);
      console.log(`Minimum: ${minStock} pages`);
      console.log(`Need to restock: ${minStock - currentStock} pages`);
    } else {
      console.log(`\n✅ Stock level is good`);
    }

    // Show recent inventory movements
    const recentMovements = await prisma.inventoryMovement.findMany({
      where: {
        productId: photocopyPageProduct.id
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (recentMovements.length > 0) {
      console.log(`\nRecent Inventory Movements:`);
      recentMovements.forEach(movement => {
        const user = movement.user ? `${movement.user.firstName} ${movement.user.lastName}` : 'System';
        const sign = movement.quantity > 0 ? '+' : '';
        console.log(`- ${movement.createdAt.toLocaleDateString()}: ${sign}${movement.quantity} (${movement.reason}) by ${user}`);
      });
    }

  } catch (error) {
    console.error('Error checking photocopy inventory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkPhotocopyInventory();
