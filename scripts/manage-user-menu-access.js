const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function manageUserMenuAccess() {
  try {
    console.log('🔧 User Menu Access Management Tool\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    console.log('📋 Available Users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });

    // Get all menus
    const menus = await prisma.menu.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        label: true,
        requiresRole: true
      }
    });

    console.log('\n📋 Available Menus:');
    menus.forEach((menu, index) => {
      console.log(`${index + 1}. ${menu.label} (${menu.name}) - Requires: ${menu.requiresRole || 'None'}`);
    });

    // Example: Grant specific menu access to a user
    console.log('\n🔧 Example: Granting menu access...');
    
    // Find a user (example: first non-SuperAdmin user)
    const targetUser = users.find(user => user.role !== 'SUPER_ADMIN');
    if (targetUser) {
      // Find a menu (example: reports menu)
      const reportsMenu = menus.find(menu => menu.name === 'reports');
      
      if (reportsMenu) {
        // Check if user already has access
        const existingPermission = await prisma.userMenuPermission.findFirst({
          where: {
            userId: targetUser.id,
            menuId: reportsMenu.id
          }
        });

        if (!existingPermission) {
          // Grant access
          await prisma.userMenuPermission.create({
            data: {
              userId: targetUser.id,
              menuId: reportsMenu.id,
              canView: true,
              grantedBy: users.find(u => u.role === 'SUPER_ADMIN')?.id
            }
          });
          console.log(`✅ Granted ${reportsMenu.label} access to ${targetUser.firstName} ${targetUser.lastName}`);
        } else {
          console.log(`ℹ️  ${targetUser.firstName} ${targetUser.lastName} already has access to ${reportsMenu.label}`);
        }
      }
    }

    // Show current menu permissions for all users
    console.log('\n📊 Current Menu Permissions:');
    for (const user of users) {
      const userMenuPermissions = await prisma.userMenuPermission.findMany({
        where: { userId: user.id },
        include: { menu: true }
      });

      console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.role}):`);
      if (userMenuPermissions.length > 0) {
        userMenuPermissions.forEach(perm => {
          console.log(`  ✅ ${perm.menu.label} (${perm.menu.name})`);
        });
      } else {
        console.log(`  📝 No specific menu permissions (using role-based access)`);
      }
    }

  } catch (error) {
    console.error('❌ Error managing menu access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions for common operations
async function grantMenuAccess(userEmail, menuName) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    const menu = await prisma.menu.findUnique({
      where: { name: menuName }
    });

    if (!user || !menu) {
      console.log('❌ User or menu not found');
      return;
    }

    const existingPermission = await prisma.userMenuPermission.findFirst({
      where: {
        userId: user.id,
        menuId: menu.id
      }
    });

    if (existingPermission) {
      await prisma.userMenuPermission.update({
        where: { id: existingPermission.id },
        data: { canView: true }
      });
    } else {
      await prisma.userMenuPermission.create({
        data: {
          userId: user.id,
          menuId: menu.id,
          canView: true
        }
      });
    }

    console.log(`✅ Granted ${menu.label} access to ${user.firstName} ${user.lastName}`);
  } catch (error) {
    console.error('❌ Error granting menu access:', error);
  }
}

async function revokeMenuAccess(userEmail, menuName) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    const menu = await prisma.menu.findUnique({
      where: { name: menuName }
    });

    if (!user || !menu) {
      console.log('❌ User or menu not found');
      return;
    }

    const permission = await prisma.userMenuPermission.findFirst({
      where: {
        userId: user.id,
        menuId: menu.id
      }
    });

    if (permission) {
      await prisma.userMenuPermission.update({
        where: { id: permission.id },
        data: { canView: false }
      });
      console.log(`❌ Revoked ${menu.label} access from ${user.firstName} ${user.lastName}`);
    } else {
      console.log(`ℹ️  No specific permission found for ${user.firstName} ${user.lastName} and ${menu.label}`);
    }
  } catch (error) {
    console.error('❌ Error revoking menu access:', error);
  }
}

// Export functions for use in other scripts
module.exports = {
  manageUserMenuAccess,
  grantMenuAccess,
  revokeMenuAccess
};

// Run the main function if this script is executed directly
if (require.main === module) {
  manageUserMenuAccess();
}
