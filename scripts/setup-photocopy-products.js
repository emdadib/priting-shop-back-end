const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupPhotocopyProducts() {
  try {
    console.log('Setting up photocopy products...');

    // First, create or find a photocopy category
    let photocopyCategory = await prisma.category.findFirst({
      where: { name: 'Photocopy Services' }
    });

    if (!photocopyCategory) {
      photocopyCategory = await prisma.category.create({
        data: {
          name: 'Photocopy Services',
          description: 'Photocopy and printing services',
          sortOrder: 100
        }
      });
      console.log('Created photocopy category:', photocopyCategory.name);
    } else {
      console.log('Found existing photocopy category:', photocopyCategory.name);
    }

    // Create photocopy products
    const photocopyProducts = [
      {
        name: '১ পৃষ্ঠা (1 Side)',
        description: 'Single-sided photocopy service',
        sku: 'PHOTO-1SIDE-001',
        basePrice: 2.00, // 2 BDT per copy
        baseCostPrice: 0.50, // 0.5 BDT cost
        categoryId: photocopyCategory.id,
        type: 'SERVICE',
        pricingModel: 'FIXED',
        hasInventory: false,
        isCustomOrder: false,
        requiresSpecifications: false,
        isService: true,
        unit: 'copy',
        isActive: true
      },
      {
        name: 'উভয় পৃষ্ঠা (Both Side)',
        description: 'Double-sided photocopy service',
        sku: 'PHOTO-2SIDE-001',
        basePrice: 3.00, // 3 BDT per copy
        baseCostPrice: 0.75, // 0.75 BDT cost
        categoryId: photocopyCategory.id,
        type: 'SERVICE',
        pricingModel: 'FIXED',
        hasInventory: false,
        isCustomOrder: false,
        requiresSpecifications: false,
        isService: true,
        unit: 'copy',
        isActive: true
      },
      {
        name: 'Photocopy Page',
        description: 'Blank paper for photocopying',
        sku: 'PHOTO-PAGE-001',
        basePrice: 0.50, // 0.5 BDT per page
        baseCostPrice: 0.25, // 0.25 BDT cost
        categoryId: photocopyCategory.id,
        type: 'PHYSICAL',
        pricingModel: 'FIXED',
        hasInventory: true,
        isCustomOrder: false,
        requiresSpecifications: false,
        isService: false,
        unit: 'page',
        minStock: 1000,
        maxStock: 10000,
        isActive: true
      }
    ];

    for (const productData of photocopyProducts) {
      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        console.log(`Product ${productData.name} already exists, updating...`);
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData
        });
      } else {
        console.log(`Creating product: ${productData.name}`);
        const product = await prisma.product.create({
          data: productData
        });

        // Create inventory record if product has inventory
        if (productData.hasInventory) {
          await prisma.inventory.create({
            data: {
              productId: product.id,
              quantity: 5000, // Start with 5000 pages
              reserved: 0,
              available: 5000
            }
          });
          console.log(`Created inventory for ${productData.name} with 5000 pages`);
        }
      }
    }

    console.log('Photocopy products setup completed successfully!');
    
    // Display the created products
    const products = await prisma.product.findMany({
      where: { categoryId: photocopyCategory.id },
      include: { inventory: true }
    });

    console.log('\nPhotocopy Products:');
    products.forEach(product => {
      console.log(`- ${product.name} (${product.sku}): ${product.basePrice} BDT`);
      if (product.inventory) {
        console.log(`  Inventory: ${product.inventory.quantity} ${product.unit}`);
      }
    });

  } catch (error) {
    console.error('Error setting up photocopy products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupPhotocopyProducts();
