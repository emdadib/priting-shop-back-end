const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateProductsForCustomPricing() {
  try {
    console.log('🔄 Updating products for custom pricing support...');

    // Update existing products to support custom pricing
    const products = await prisma.product.findMany();

    for (const product of products) {
      console.log(`📦 Updating product: ${product.name}`);

      // Determine pricing model based on product type and name
      let pricingModel = 'FIXED';
      let isCustomOrder = true;
      let requiresSpecifications = false;

      // Set pricing model based on product characteristics
      if (product.name.includes('ব্যানার') || product.name.includes('Banner') || 
          product.name.includes('ফ্লেক্স') || product.name.includes('Flex')) {
        pricingModel = 'AREA_BASED';
        requiresSpecifications = true;
      } else if (product.name.includes('ফটোকপি') || product.name.includes('Photocopy')) {
        pricingModel = 'FIXED';
        isCustomOrder = false;
      } else if (product.name.includes('লেমিনিটিং') || product.name.includes('Lamination')) {
        pricingModel = 'FIXED';
        isCustomOrder = false;
      } else {
        // Most printing services should have variable pricing
        pricingModel = 'VARIABLE';
        requiresSpecifications = true;
      }

      // Update product with new fields
      await prisma.product.update({
        where: { id: product.id },
        data: {
          pricingModel,
          basePrice: product.price,
          baseCostPrice: product.costPrice,
          isCustomOrder,
          requiresSpecifications,
          hasInventory: product.type === 'PHYSICAL' && !isCustomOrder
        }
      });

      // Create pricing tiers for variable pricing products
      if (pricingModel === 'VARIABLE') {
        console.log(`💰 Creating pricing tiers for: ${product.name}`);
        
        // Create tier 1: 1-50 pieces
        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 1,
            maxQuantity: 50,
            unitPrice: product.price,
            costPrice: product.costPrice,
            discount: 0
          }
        });

        // Create tier 2: 51-100 pieces (5% discount)
        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 51,
            maxQuantity: 100,
            unitPrice: product.price * 0.95, // 5% discount
            costPrice: product.costPrice,
            discount: 0.05
          }
        });

        // Create tier 3: 101+ pieces (10% discount)
        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 101,
            maxQuantity: null, // Unlimited
            unitPrice: product.price * 0.90, // 10% discount
            costPrice: product.costPrice,
            discount: 0.10
          }
        });
      }

      // Create pricing tiers for area-based products
      if (pricingModel === 'AREA_BASED') {
        console.log(`📏 Creating area-based pricing for: ${product.name}`);
        
        // For banners, create different pricing based on area
        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 1, // 1 sq ft
            maxQuantity: 10,
            unitPrice: product.price,
            costPrice: product.costPrice,
            discount: 0
          }
        });

        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 11,
            maxQuantity: 50,
            unitPrice: product.price * 0.95, // 5% discount for larger areas
            costPrice: product.costPrice,
            discount: 0.05
          }
        });

        await prisma.productPricingTier.create({
          data: {
            productId: product.id,
            minQuantity: 51,
            maxQuantity: null,
            unitPrice: product.price * 0.90, // 10% discount for large areas
            costPrice: product.costPrice,
            discount: 0.10
          }
        });
      }
    }

    console.log('✅ Products updated successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('   - Added pricingModel field to all products');
    console.log('   - Added basePrice and baseCostPrice fields');
    console.log('   - Added isCustomOrder and requiresSpecifications flags');
    console.log('   - Created pricing tiers for variable pricing products');
    console.log('   - Created area-based pricing for banner products');

  } catch (error) {
    console.error('❌ Error updating products:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductsForCustomPricing();
