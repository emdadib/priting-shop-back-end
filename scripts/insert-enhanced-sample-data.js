const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertEnhancedSampleData() {
  try {
    console.log('📝 Starting to insert enhanced sample data...');

    // Insert Categories
    const categories = [
      { id: 'CAT01', name: 'Printing Services', description: 'Digital and offset printing services', parentId: null, isActive: true, sortOrder: 1 },
      { id: 'CAT02', name: 'Banners & Flex', description: 'Banner and flex printing services', parentId: null, isActive: true, sortOrder: 2 },
      { id: 'CAT03', name: 'Business Cards', description: 'Business card printing and design', parentId: null, isActive: true, sortOrder: 3 },
      { id: 'CAT04', name: 'Invitation Cards', description: 'Wedding and event invitation cards', parentId: null, isActive: true, sortOrder: 4 },
      { id: 'CAT05', name: 'Gift Items', description: 'Custom printed gift items', parentId: null, isActive: true, sortOrder: 5 },
      { id: 'CAT06', name: 'Copy & Lamination', description: 'Photocopy and lamination services', parentId: null, isActive: true, sortOrder: 6 },
      { id: 'CAT07', name: 'Promotional Items', description: 'Badges, promotional materials and custom items', parentId: null, isActive: true, sortOrder: 7 }
    ];

    for (const category of categories) {
      await prisma.category.upsert({ where: { id: category.id }, update: category, create: category });
    }
    console.log(`✅ Inserted ${categories.length} categories`);

    // Insert Products with Enhanced Pricing Models
    const products = [
      // Fixed Pricing Products (Photocopy, Lamination)
      { id: 'PROD01', name: 'ফটোকপি', description: 'Black and white photocopy service', sku: 'CPY-001', categoryId: 'CAT06', type: 'SERVICE', pricingModel: 'FIXED', basePrice: 2.00, baseCostPrice: 0.50, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, isCustomOrder: false, requiresSpecifications: false, unit: 'page' },
      { id: 'PROD02', name: 'লেমিনিটিং', description: 'Document lamination service', sku: 'LAM-001', categoryId: 'CAT06', type: 'SERVICE', pricingModel: 'FIXED', basePrice: 5.00, baseCostPrice: 2.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, isCustomOrder: false, requiresSpecifications: false, unit: 'page' },
      
      // Area-Based Pricing Products (Banners)
      { id: 'PROD03', name: 'ব্যানার প্রিন্ট', description: 'Vinyl banner printing service', sku: 'BNR-001', categoryId: 'CAT02', type: 'SERVICE', pricingModel: 'AREA_BASED', basePrice: 18.00, baseCostPrice: 13.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'sqft' },
      { id: 'PROD04', name: 'ফ্লেক্স প্রিন্ট', description: 'High-quality flex printing for banners and outdoor ads', sku: 'PRN-008', categoryId: 'CAT01', type: 'SERVICE', pricingModel: 'AREA_BASED', basePrice: 15.00, baseCostPrice: 8.00, taxRate: 0.05, isActive: true, isService: true, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'sqft' },
      
      // Variable Pricing Products (Cards, Business Items)
      { id: 'PROD05', name: 'বিজনেস কার্ড', description: 'Professional business card printing', sku: 'BC-001', categoryId: 'CAT03', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 6.00, baseCostPrice: 3.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' },
      { id: 'PROD06', name: 'বিয়ের কার্ড', description: 'Wedding invitation card printing', sku: 'WC-001', categoryId: 'CAT04', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 8.00, baseCostPrice: 4.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' },
      { id: 'PROD07', name: 'মগ প্রিন্ট', description: 'Custom mug printing', sku: 'GFT-003', categoryId: 'CAT05', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 10.00, baseCostPrice: 5.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' },
      { id: 'PROD08', name: 'টি-শার্ট প্রিন্ট', description: 'Custom T-shirt printing service', sku: 'GFT-004', categoryId: 'CAT05', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 12.00, baseCostPrice: 6.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' },
      { id: 'PROD09', name: 'আইডি কার্ড প্রিন্ট', description: 'Plastic PVC ID card printing service', sku: 'CPY-003', categoryId: 'CAT06', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 5.00, baseCostPrice: 2.50, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' },
      { id: 'PROD10', name: 'ব্যাজ প্রিন্ট', description: 'Custom printed badges for events and promotions', sku: 'PRM-001', categoryId: 'CAT07', type: 'PHYSICAL', pricingModel: 'VARIABLE', basePrice: 2.00, baseCostPrice: 1.00, taxRate: 0.05, isActive: true, isService: false, hasInventory: false, isCustomOrder: true, requiresSpecifications: true, unit: 'piece' }
    ];

    for (const product of products) {
      await prisma.product.upsert({ where: { id: product.id }, update: product, create: product });
    }
    console.log(`✅ Inserted ${products.length} products`);

    // Create Pricing Tiers for Variable Pricing Products
    const variablePricingProducts = products.filter(p => p.pricingModel === 'VARIABLE');
    
    for (const product of variablePricingProducts) {
      console.log(`💰 Creating pricing tiers for: ${product.name}`);
      
      // Tier 1: 1-50 pieces
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 1,
          maxQuantity: 50,
          unitPrice: product.basePrice,
          costPrice: product.baseCostPrice,
          discount: 0
        }
      });

      // Tier 2: 51-100 pieces (5% discount)
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 51,
          maxQuantity: 100,
          unitPrice: product.basePrice * 0.95,
          costPrice: product.baseCostPrice,
          discount: 0.05
        }
      });

      // Tier 3: 101+ pieces (10% discount)
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 101,
          maxQuantity: null,
          unitPrice: product.basePrice * 0.90,
          costPrice: product.baseCostPrice,
          discount: 0.10
        }
      });
    }

    // Create Pricing Tiers for Area-Based Products
    const areaBasedProducts = products.filter(p => p.pricingModel === 'AREA_BASED');
    
    for (const product of areaBasedProducts) {
      console.log(`📏 Creating area-based pricing for: ${product.name}`);
      
      // Tier 1: 1-10 sq ft
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 1,
          maxQuantity: 10,
          unitPrice: product.basePrice,
          costPrice: product.baseCostPrice,
          discount: 0
        }
      });

      // Tier 2: 11-50 sq ft (5% discount)
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 11,
          maxQuantity: 50,
          unitPrice: product.basePrice * 0.95,
          costPrice: product.baseCostPrice,
          discount: 0.05
        }
      });

      // Tier 3: 51+ sq ft (10% discount)
      await prisma.productPricingTier.create({
        data: {
          productId: product.id,
          minQuantity: 51,
          maxQuantity: null,
          unitPrice: product.basePrice * 0.90,
          costPrice: product.baseCostPrice,
          discount: 0.10
        }
      });
    }

    console.log('🎉 Enhanced sample data insertion completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Fixed Pricing Products: ${products.filter(p => p.pricingModel === 'FIXED').length}`);
    console.log(`   - Variable Pricing Products: ${variablePricingProducts.length}`);
    console.log(`   - Area-Based Products: ${areaBasedProducts.length}`);
    console.log(`   - Pricing Tiers Created: ${(variablePricingProducts.length + areaBasedProducts.length) * 3}`);

  } catch (error) {
    console.error('❌ Error during enhanced data insertion:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

insertEnhancedSampleData();
