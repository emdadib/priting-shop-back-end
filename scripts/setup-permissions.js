const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupPermissions() {
  try {
    console.log('Setting up permissions and menus...');

    // Create permissions
    const permissions = [
      // Products
      { name: 'products.create', description: 'Create products', resource: 'products', action: 'create' },
      { name: 'products.read', description: 'View products', resource: 'products', action: 'read' },
      { name: 'products.update', description: 'Update products', resource: 'products', action: 'update' },
      { name: 'products.delete', description: 'Delete products', resource: 'products', action: 'delete' },
      
      // Orders
      { name: 'orders.create', description: 'Create orders', resource: 'orders', action: 'create' },
      { name: 'orders.read', description: 'View orders', resource: 'orders', action: 'read' },
      { name: 'orders.update', description: 'Update orders', resource: 'orders', action: 'update' },
      { name: 'orders.delete', description: 'Delete orders', resource: 'orders', action: 'delete' },
      
      // Customers
      { name: 'customers.create', description: 'Create customers', resource: 'customers', action: 'create' },
      { name: 'customers.read', description: 'View customers', resource: 'customers', action: 'read' },
      { name: 'customers.update', description: 'Update customers', resource: 'customers', action: 'update' },
      { name: 'customers.delete', description: 'Delete customers', resource: 'customers', action: 'delete' },
      
      // Inventory
      { name: 'inventory.create', description: 'Create inventory', resource: 'inventory', action: 'create' },
      { name: 'inventory.read', description: 'View inventory', resource: 'inventory', action: 'read' },
      { name: 'inventory.update', description: 'Update inventory', resource: 'inventory', action: 'update' },
      { name: 'inventory.delete', description: 'Delete inventory', resource: 'inventory', action: 'delete' },
      
      // Users
      { name: 'users.create', description: 'Create users', resource: 'users', action: 'create' },
      { name: 'users.read', description: 'View users', resource: 'users', action: 'read' },
      { name: 'users.update', description: 'Update users', resource: 'users', action: 'update' },
      { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' },
      
      // Reports
      { name: 'reports.read', description: 'View reports', resource: 'reports', action: 'read' },
      
      // Settings
      { name: 'settings.read', description: 'View settings', resource: 'settings', action: 'read' },
      { name: 'settings.update', description: 'Update settings', resource: 'settings', action: 'update' },
      
      // Accounting
      { name: 'accounting.read', description: 'View accounting', resource: 'accounting', action: 'read' },
      { name: 'accounting.update', description: 'Update accounting', resource: 'accounting', action: 'update' },
      
      // Expenses
      { name: 'expenses.create', description: 'Create expenses', resource: 'expenses', action: 'create' },
      { name: 'expenses.read', description: 'View expenses', resource: 'expenses', action: 'read' },
      { name: 'expenses.update', description: 'Update expenses', resource: 'expenses', action: 'update' },
      { name: 'expenses.delete', description: 'Delete expenses', resource: 'expenses', action: 'delete' },
      
      // Salary
      { name: 'salary.create', description: 'Create salary records', resource: 'salary', action: 'create' },
      { name: 'salary.read', description: 'View salary records', resource: 'salary', action: 'read' },
      { name: 'salary.update', description: 'Update salary records', resource: 'salary', action: 'update' },
      { name: 'salary.delete', description: 'Delete salary records', resource: 'salary', action: 'delete' },
    ];

    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    }

    console.log('✅ Permissions created successfully');

    // Create menus
    const menus = [
      { name: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'Dashboard', sortOrder: 1 },
      { name: 'orders', label: 'Orders', path: '/orders', icon: 'ShoppingCart', sortOrder: 2 },
      { name: 'products', label: 'Products', path: '/products', icon: 'Inventory', sortOrder: 3 },
      { name: 'customers', label: 'Customers', path: '/customers', icon: 'People', sortOrder: 4 },
      { name: 'inventory', label: 'Inventory', path: '/inventory', icon: 'Warehouse', sortOrder: 5 },
      { name: 'suppliers', label: 'Suppliers', path: '/suppliers', icon: 'Business', sortOrder: 6 },
      { name: 'purchase-orders', label: 'Purchase Orders', path: '/purchase-orders', icon: 'ShoppingBag', sortOrder: 7 },
      { name: 'reports', label: 'Reports', path: '/reports', icon: 'Assessment', sortOrder: 8 },
      { name: 'accounting', label: 'Accounting', path: '/accounting', icon: 'AccountBalance', sortOrder: 9 },
      { name: 'expenses', label: 'Expenses', path: '/expenses', icon: 'Receipt', sortOrder: 10 },
      { name: 'warranties', label: 'Warranties', path: '/warranties', icon: 'Security', sortOrder: 11 },
      { name: 'users', label: 'Employee', path: '/users', icon: 'Person', sortOrder: 12, requiresRole: 'ADMIN' },
      { name: 'salary-management', label: 'Salary & Advances', path: '/salary-management', icon: 'AttachMoney', sortOrder: 13, requiresRole: 'ADMIN' },
      { name: 'permission-management', label: 'Permission', path: '/permission-management', icon: 'AdminPanelSettings', sortOrder: 14, requiresRole: 'SUPER_ADMIN' },
      { name: 'settings', label: 'Settings', path: '/settings', icon: 'Settings', sortOrder: 15, requiresRole: 'ADMIN' },
    ];

    for (const menu of menus) {
      await prisma.menu.upsert({
        where: { name: menu.name },
        update: menu,
        create: menu,
      });
    }

    console.log('✅ Menus created successfully');

    // Create SuperAdmin user if it doesn't exist
    const superAdminExists = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!superAdminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const superAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@printingshop.com',
          username: 'superadmin',
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      console.log('✅ SuperAdmin user created successfully');
      console.log('Email: superadmin@printingshop.com');
      console.log('Password: admin123');
      console.log('⚠️  Please change the password after first login!');
    } else {
      console.log('✅ SuperAdmin user already exists');
    }

    console.log('🎉 Setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupPermissions();
