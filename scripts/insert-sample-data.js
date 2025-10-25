const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertSampleData() {
  try {
    console.log('📝 Starting to insert sample data...');

    // Insert categories first
    console.log('📋 Inserting categories...');
    const categories = [
      { id: 'CAT01', name: 'Printing', description: 'All kinds of printing services', parentId: null, isActive: true, sortOrder: 1 },
      { id: 'CAT02', name: 'Framing', description: 'Photo frames and related services', parentId: null, isActive: true, sortOrder: 2 },
      { id: 'CAT03', name: 'Design', description: 'Digital and graphic design services', parentId: null, isActive: true, sortOrder: 3 },
      { id: 'CAT04', name: 'Stationery', description: 'Books, receipts, and office materials', parentId: null, isActive: true, sortOrder: 4 },
      { id: 'CAT05', name: 'Gifts', description: 'Custom gift items like mugs', parentId: null, isActive: true, sortOrder: 5 },
      { id: 'CAT06', name: 'Copy & Lamination', description: 'Photocopy and lamination services', parentId: null, isActive: true, sortOrder: 6 },
      { id: 'CAT07', name: 'Promotional Items', description: 'Badges, promotional materials and custom items', parentId: null, isActive: true, sortOrder: 7 }
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: category,
        create: category
      });
    }
    console.log(`✅ Inserted ${categories.length} categories`);

    // Insert products
    console.log('📦 Inserting products...');
    const products = [
      // Printing
      { id: 'PROD01', name: 'লিপলেট', description: 'Leaflet printing service', sku: 'PRN-001', categoryId: 'CAT01', type: 'SERVICE', basePrice: 5.00, baseCostPrice: 2.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD02', name: 'ব্যানার', description: 'Banner printing service', sku: 'PRN-002', categoryId: 'CAT01', type: 'SERVICE', basePrice: 12.00, baseCostPrice: 6.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD03', name: 'পোষ্টার 20*30', description: 'Poster printing size 20x30 inches', sku: 'PRN-003', categoryId: 'CAT01', type: 'SERVICE', basePrice: 8.00, baseCostPrice: 4.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece', dimensions: '20x30 inches' },
      { id: 'PROD04', name: 'পোষ্টার 18*23', description: 'Poster printing size 18x23 inches', sku: 'PRN-004', categoryId: 'CAT01', type: 'SERVICE', basePrice: 6.00, baseCostPrice: 3.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece', dimensions: '18x23 inches' },
      { id: 'PROD05', name: 'প্রিন্ট- অপসেট', description: 'Offset printing service', sku: 'PRN-005', categoryId: 'CAT01', type: 'SERVICE', basePrice: 15.00, baseCostPrice: 7.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD06', name: 'লেমিনিটিং', description: 'Document lamination service', sku: 'CPY-001', categoryId: 'CAT06', type: 'SERVICE', basePrice: 2.00, baseCostPrice: 1.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD07', name: 'ফটোকপি', description: 'Photocopy service', sku: 'CPY-002', categoryId: 'CAT06', type: 'SERVICE', basePrice: 0.50, baseCostPrice: 0.20, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'page' },

      // Framing
      { id: 'PROD08', name: 'ফ্রেম/প্রীতি A4', description: 'Photo frame A4 size', sku: 'FRM-001', categoryId: 'CAT02', type: 'PHYSICAL', basePrice: 10.00, baseCostPrice: 5.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 5, maxStock: 50, unit: 'piece', dimensions: 'A4' },
      { id: 'PROD09', name: 'ফ্রেম/প্রীতি A3', description: 'Photo frame A3 size', sku: 'FRM-002', categoryId: 'CAT02', type: 'PHYSICAL', basePrice: 15.00, baseCostPrice: 7.50, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 5, maxStock: 50, unit: 'piece', dimensions: 'A3' },
      { id: 'PROD10', name: 'ফ্রেম/প্রীতি অনলাইন', description: 'Custom online order photo frame', sku: 'FRM-003', categoryId: 'CAT02', type: 'PHYSICAL', basePrice: 20.00, baseCostPrice: 10.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 2, maxStock: 20, unit: 'piece' },

      // Design
      { id: 'PROD11', name: 'ছবি প্রিন্ট', description: 'Photo printing service', sku: 'PRN-006', categoryId: 'CAT01', type: 'SERVICE', basePrice: 3.00, baseCostPrice: 1.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD12', name: 'স্ট্যাম্প প্রিন্ট', description: 'Custom stamp printing', sku: 'PRN-007', categoryId: 'CAT01', type: 'SERVICE', basePrice: 5.00, baseCostPrice: 2.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD13', name: 'ফেইসবুক ডিজাইন', description: 'Custom Facebook post design', sku: 'DSN-001', categoryId: 'CAT03', type: 'SERVICE', basePrice: 8.00, baseCostPrice: 4.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'design' },

      // Stationery
      { id: 'PROD14', name: 'ভিজিটিং কার্ড', description: 'Visiting card printing', sku: 'STN-001', categoryId: 'CAT04', type: 'SERVICE', basePrice: 5.00, baseCostPrice: 2.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'pack' },
      { id: 'PROD15', name: 'ক্যাশ মেমো', description: 'Cash memo book', sku: 'STN-002', categoryId: 'CAT04', type: 'PHYSICAL', basePrice: 2.00, baseCostPrice: 1.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 10, maxStock: 100, unit: 'piece' },
      { id: 'PROD16', name: 'রশিদ বই', description: 'Receipt book', sku: 'STN-003', categoryId: 'CAT04', type: 'PHYSICAL', basePrice: 2.50, baseCostPrice: 1.20, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 10, maxStock: 100, unit: 'piece' },
      { id: 'PROD17', name: 'দাওয়াত কার্ড', description: 'Invitation card printing', sku: 'STN-004', categoryId: 'CAT04', type: 'SERVICE', basePrice: 4.00, baseCostPrice: 2.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD18', name: 'বিয়ের কার্ড', description: 'Wedding card printing', sku: 'STN-005', categoryId: 'CAT04', type: 'SERVICE', basePrice: 6.00, baseCostPrice: 3.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD19', name: 'আবেদন', description: 'Application form printing', sku: 'STN-006', categoryId: 'CAT04', type: 'SERVICE', basePrice: 1.00, baseCostPrice: 0.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD20', name: 'ফরম', description: 'Form printing', sku: 'STN-007', categoryId: 'CAT04', type: 'SERVICE', basePrice: 1.50, baseCostPrice: 0.70, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },
      { id: 'PROD21', name: 'খাম', description: 'Envelope printing', sku: 'STN-008', categoryId: 'CAT04', type: 'SERVICE', basePrice: 2.00, baseCostPrice: 1.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'piece' },

      // Gifts
      { id: 'PROD22', name: 'স্টিকার', description: 'Custom sticker printing', sku: 'GFT-001', categoryId: 'CAT05', type: 'PHYSICAL', basePrice: 1.00, baseCostPrice: 0.50, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 50, maxStock: 500, unit: 'piece' },
      { id: 'PROD23', name: 'ক্যালেন্ডার', description: 'Custom calendar printing', sku: 'GFT-002', categoryId: 'CAT05', type: 'PHYSICAL', basePrice: 8.00, baseCostPrice: 4.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 10, maxStock: 100, unit: 'piece' },
      { id: 'PROD24', name: 'মগ প্রিন্ট', description: 'Custom mug printing', sku: 'GFT-003', categoryId: 'CAT05', type: 'PHYSICAL', basePrice: 10.00, baseCostPrice: 5.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 5, maxStock: 50, unit: 'piece' },

      // Additional Products
      { id: 'PROD25', name: 'ফ্লেক্স প্রিন্ট', description: 'High-quality flex printing for banners and outdoor ads', sku: 'PRN-008', categoryId: 'CAT01', type: 'SERVICE', basePrice: 15.00, baseCostPrice: 8.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, minStock: 0, unit: 'sqft' },
      { id: 'PROD26', name: 'টি-শার্ট প্রিন্ট', description: 'Custom T-shirt printing service', sku: 'GFT-004', categoryId: 'CAT05', type: 'PHYSICAL', basePrice: 12.00, baseCostPrice: 6.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 5, maxStock: 50, unit: 'piece', dimensions: 'various sizes' },
      { id: 'PROD27', name: 'আইডি কার্ড প্রিন্ট', description: 'Plastic PVC ID card printing service', sku: 'CPY-003', categoryId: 'CAT06', type: 'PHYSICAL', basePrice: 5.00, baseCostPrice: 2.50, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 10, maxStock: 200, unit: 'piece', dimensions: 'standard ID size' },
      { id: 'PROD28', name: 'ব্যাজ প্রিন্ট', description: 'Custom printed badges for events and promotions', sku: 'PRM-001', categoryId: 'CAT07', type: 'PHYSICAL', basePrice: 2.00, baseCostPrice: 1.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: true, minStock: 50, maxStock: 500, unit: 'piece', dimensions: 'various sizes' }
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: product,
        create: product
      });
    }
    console.log(`✅ Inserted ${products.length} products`);

    // Create inventory records for physical products
    console.log('📦 Creating inventory records for physical products...');
    const physicalProducts = products.filter(p => p.type === 'PHYSICAL');
    
    for (const product of physicalProducts) {
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: {
          quantity: product.maxStock || 0,
          available: product.maxStock || 0,
          reserved: 0
        },
        create: {
          productId: product.id,
          quantity: product.maxStock || 0,
          available: product.maxStock || 0,
          reserved: 0
        }
      });
    }
    console.log(`✅ Created inventory records for ${physicalProducts.length} physical products`);

    console.log('🎉 Sample data insertion completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Physical Products: ${physicalProducts.length}`);
    console.log(`   - Service Products: ${products.length - physicalProducts.length}`);

  } catch (error) {
    console.error('❌ Error during data insertion:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

insertSampleData();
