const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // First, push the schema to create tables
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database schema created successfully!');
    } catch (error) {
      console.log('⚠️  Schema might already exist, continuing...');
    }
    
    console.log('🔄 Creating admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('484848', 12);
    
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@sbprinters.com',
        firstName: 'System',
        lastName: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@sbprinters.com');
    console.log('Password: 484848');
    console.log('Role: ADMIN');
    console.log('User ID:', adminUser.id);
    
    // Create some default categories for testing
    const category1 = await prisma.category.create({
      data: {
        name: 'Business Cards',
        description: 'Professional business cards and stationery',
        isActive: true
      }
    });
    
    await prisma.category.createMany({
      data: [
        {
          name: 'Banners & Signs',
          description: 'Large format printing for banners and signage',
          isActive: true
        },
        {
          name: 'Marketing Materials',
          description: 'Brochures, flyers, and promotional materials',
          isActive: true
        }
      ]
    });
    
    console.log('✅ Default categories created!');
    
    // Create a sample product
    const product = await prisma.product.create({
      data: {
        name: 'Standard Business Cards',
        description: 'High-quality business cards on premium cardstock',
        sku: 'BC-001',
        basePrice: 25.00,
        baseCostPrice: 10.00,
        categoryId: category1.id, // Use the actual category ID
        type: 'PHYSICAL',
        isActive: true,
        minStock: 10,
        maxStock: 1000,
        unit: 'pack',
        weight: 0.1,
        dimensions: '3.5x2 inches'
      }
    });
    
    console.log('✅ Sample product created!');
    
    // Create inventory for the product
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: 100,
        reserved: 0,
        available: 100
      }
    });
    
    console.log('✅ Inventory record created!');
    
    console.log('\n🎉 Database setup complete! You can now log in to the application.');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    
    if (error.code === 'P2002') {
      console.log('Admin user may already exist. Try logging in with:');
      console.log('Email: admin@sbprinters.com');
      console.log('Password: 484848');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();