const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function grantMenuAccessExample() {
  try {
    console.log('🎯 Granting Menu Access Examples\n');

    // Example 1: Grant Reports access to a Manager
    console.log('📊 Example 1: Granting Reports access to a Manager');
    
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    });

    const reportsMenu = await prisma.menu.findUnique({
      where: { name: 'reports' }
    });

    if (manager && reportsMenu) {
      // Check if already has access
      const existingPermission = await prisma.userMenuPermission.findFirst({
        where: {
          userId: manager.id,
          menuId: reportsMenu.id
        }
      });

      if (!existingPermission) {
        await prisma.userMenuPermission.create({
          data: {
            userId: manager.id,
            menuId: reportsMenu.id,
            canView: true
          }
        });
        console.log(`✅ Granted Reports access to ${manager.firstName} ${manager.lastName}`);
      } else {
        console.log(`ℹ️  ${manager.firstName} ${manager.lastName} already has Reports access`);
      }
    }

    // Example 2: Grant Users management access to a specific user
    console.log('\n👥 Example 2: Granting Users management access');
    
    const cashier = await prisma.user.findFirst({
      where: { role: 'CASHIER' }
    });

    const usersMenu = await prisma.menu.findUnique({
      where: { name: 'users' }
    });

    if (cashier && usersMenu) {
      const existingPermission = await prisma.userMenuPermission.findFirst({
        where: {
          userId: cashier.id,
          menuId: usersMenu.id
        }
      });

      if (!existingPermission) {
        await prisma.userMenuPermission.create({
          data: {
            userId: cashier.id,
            menuId: usersMenu.id,
            canView: true
          }
        });
        console.log(`✅ Granted Users management access to ${cashier.firstName} ${cashier.lastName}`);
      } else {
        console.log(`ℹ️  ${cashier.firstName} ${cashier.lastName} already has Users management access`);
      }
    }

    // Example 3: Show current menu access for all users
    console.log('\n📋 Current Menu Access Summary:');
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    for (const user of allUsers) {
      const userMenuPermissions = await prisma.userMenuPermission.findMany({
        where: { 
          userId: user.id,
          canView: true
        },
        include: { menu: true }
      });

      console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.role}):`);
      
      if (userMenuPermissions.length > 0) {
        userMenuPermissions.forEach(perm => {
          console.log(`  ✅ ${perm.menu.label}`);
        });
      } else {
        console.log(`  📝 Using role-based access only`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantMenuAccessExample();
