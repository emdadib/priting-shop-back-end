const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔄 Creating Super Admin user...');
    
    // Check if superadmin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists:');
      console.log(`   Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('superadmin123', 12);
    
    // Create superadmin user
    const superAdmin = await prisma.user.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@sbprinters.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        phone: '+1234567890',
        address: 'Admin Office'
      }
    });
    
    console.log('✅ Super Admin created successfully!');
    console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: superadmin123`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   ID: ${superAdmin.id}`);
    
    // Also update the existing admin to SUPER_ADMIN if needed
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@sbprinters.com' }
    });
    
    if (existingAdmin && existingAdmin.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'SUPER_ADMIN' }
      });
      console.log('✅ Updated existing admin to SUPER_ADMIN role');
    }
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
