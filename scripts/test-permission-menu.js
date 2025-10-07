const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissionMenu() {
  try {
    console.log('🧪 Testing Permission Management Menu Setup\n');

    // Check if the menu exists in database
    const permissionMenu = await prisma.menu.findUnique({
      where: { name: 'permission-management' }
    });

    if (permissionMenu) {
      console.log('✅ Permission Management menu found in database:');
      console.log(`   - Name: ${permissionMenu.name}`);
      console.log(`   - Label: ${permissionMenu.label}`);
      console.log(`   - Path: ${permissionMenu.path}`);
      console.log(`   - Icon: ${permissionMenu.icon}`);
      console.log(`   - Requires Role: ${permissionMenu.requiresRole}`);
      console.log(`   - Sort Order: ${permissionMenu.sortOrder}`);
      console.log(`   - Active: ${permissionMenu.isActive}`);
    } else {
      console.log('❌ Permission Management menu not found in database');
    }

    // Test menu visibility for different roles
    console.log('\n🔍 Testing Menu Visibility by Role:');
    
    const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'];
    
    for (const role of roles) {
      const canView = await canViewMenuByRole(role, 'permission-management');
      console.log(`   - ${role}: ${canView ? '✅ Can view' : '❌ Cannot view'}`);
    }

    // Show all menus with their role requirements
    console.log('\n📋 All Menus and Their Role Requirements:');
    const allMenus = await prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    allMenus.forEach(menu => {
      console.log(`   ${menu.sortOrder}. ${menu.label} (${menu.name}) - Requires: ${menu.requiresRole || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error testing permission menu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function canViewMenuByRole(userRole, menuName) {
  try {
    const menu = await prisma.menu.findUnique({
      where: { name: menuName }
    });

    if (!menu || !menu.isActive) return false;

    // SuperAdmin can view all menus
    if (userRole === 'SUPER_ADMIN') return true;

    // Check role-based access
    if (menu.requiresRole) {
      const roleHierarchy = {
        'SUPER_ADMIN': 6,
        'ADMIN': 5,
        'MANAGER': 4,
        'CASHIER': 3,
        'OPERATOR': 2,
        'STAFF': 1
      };

      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[menu.requiresRole] || 0;

      return userRoleLevel >= requiredRoleLevel;
    }

    return true; // Menu has no role requirement
  } catch (error) {
    console.error('Error checking menu access:', error);
    return false;
  }
}

testPermissionMenu();
