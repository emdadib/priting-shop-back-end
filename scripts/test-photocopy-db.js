const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhotocopyDatabase() {
  try {
    console.log('Testing photocopy database connection...\n');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Check if photocopy category exists
    const photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    if (photocopyCategory) {
      console.log('✅ Photocopy category found:', photocopyCategory.name);
    } else {
      console.log('❌ Photocopy category not found');
      return;
    }

    // Check photocopy products
    const products = await prisma.product.findMany({
      where: {
        categoryId: photocopyCategory.id,
        isActive: true
      },
      include: {
        inventory: true
      }
    });

    console.log(`\n✅ Found ${products.length} photocopy products:`);
    products.forEach(product => {
      console.log(`- ${product.name} (${product.sku}): ${product.basePrice} BDT`);
      if (product.inventory) {
        console.log(`  Inventory: ${product.inventory.quantity} ${product.unit}`);
      }
    });

    if (products.length === 0) {
      console.log('\n❌ No photocopy products found. Run setup script first.');
      console.log('Run: node scripts/setup-photocopy-products.js');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhotocopyDatabase();
