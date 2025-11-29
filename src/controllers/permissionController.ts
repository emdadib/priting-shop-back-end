import { Request, Response } from 'express';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Get all permissions
export const getAllPermissions = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
};

// Get user permissions
export const getUserPermissions = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true
      }
    });

    res.json({
      success: true,
      data: userPermissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions'
    });
  }
};

// Grant permission to user
export const grantPermission = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, permissionId, expiresAt } = req.body;
    const grantedBy = req.user?.id;

    if (!grantedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if permission already exists
    const existingPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permissionId
      }
    });

    let userPermission;
    if (existingPermission) {
      userPermission = await prisma.userPermission.update({
        where: { id: existingPermission.id },
        data: {
          granted: true,
          grantedBy,
          grantedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          permission: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    } else {
      userPermission = await prisma.userPermission.create({
        data: {
          userId,
          permissionId,
          granted: true,
          grantedBy,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          permission: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    }

    // Create audit log
    await createAuditLog({
      userId: grantedBy,
      action: 'GRANT_PERMISSION',
      entity: 'USER_PERMISSION',
      entityId: userPermission.id,
      newValues: {
        userId,
        permissionId,
        granted: true,
        expiresAt
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: userPermission
    });
  } catch (error) {
    console.error('Grant permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant permission'
    });
  }
};

// Revoke permission from user
export const revokePermission = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, permissionId } = req.body;
    const revokedBy = req.user?.id;

    if (!revokedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permissionId
      }
    });

    if (!userPermission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    await prisma.userPermission.update({
      where: { id: userPermission.id },
      data: {
        granted: false,
        grantedBy: revokedBy,
        grantedAt: new Date()
      }
    });

    // Create audit log
    await createAuditLog({
      userId: revokedBy,
      action: 'REVOKE_PERMISSION',
      entity: 'USER_PERMISSION',
      entityId: userPermission.id,
      oldValues: {
        userId,
        permissionId,
        granted: true
      },
      newValues: {
        userId,
        permissionId,
        granted: false
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Permission revoked successfully'
    });
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke permission'
    });
  }
};

// Get all menus
export const getAllMenus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const menus = await prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('Get all menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menus'
    });
  }
};

// Get user menu permissions
export const getUserMenuPermissions = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const userMenuPermissions = await prisma.userMenuPermission.findMany({
      where: { userId },
      include: {
        menu: true
      }
    });

    res.json({
      success: true,
      data: userMenuPermissions
    });
  } catch (error) {
    console.error('Get user menu permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user menu permissions'
    });
  }
};

// Grant menu permission to user
export const grantMenuPermission = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, menuId } = req.body;
    const grantedBy = req.user?.id;

    if (!grantedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if menu permission already exists
    const existingPermission = await prisma.userMenuPermission.findFirst({
      where: {
        userId,
        menuId
      }
    });

    let userMenuPermission;
    if (existingPermission) {
      userMenuPermission = await prisma.userMenuPermission.update({
        where: { id: existingPermission.id },
        data: {
          canView: true,
          grantedBy,
          grantedAt: new Date()
        },
        include: {
          menu: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    } else {
      userMenuPermission = await prisma.userMenuPermission.create({
        data: {
          userId,
          menuId,
          canView: true,
          grantedBy
        },
        include: {
          menu: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    }

    // Create audit log
    await createAuditLog({
      userId: grantedBy,
      action: 'GRANT_MENU_PERMISSION',
      entity: 'USER_MENU_PERMISSION',
      entityId: userMenuPermission.id,
      newValues: {
        userId,
        menuId,
        canView: true
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: userMenuPermission
    });
  } catch (error) {
    console.error('Grant menu permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant menu permission'
    });
  }
};

// Revoke menu permission from user
export const revokeMenuPermission = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId, menuId } = req.body;
    const revokedBy = req.user?.id;

    if (!revokedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userMenuPermission = await prisma.userMenuPermission.findFirst({
      where: {
        userId,
        menuId
      }
    });

    if (!userMenuPermission) {
      return res.status(404).json({
        success: false,
        message: 'Menu permission not found'
      });
    }

    await prisma.userMenuPermission.update({
      where: { id: userMenuPermission.id },
      data: {
        canView: false,
        grantedBy: revokedBy,
        grantedAt: new Date()
      }
    });

    // Create audit log
    await createAuditLog({
      userId: revokedBy,
      action: 'REVOKE_MENU_PERMISSION',
      entity: 'USER_MENU_PERMISSION',
      entityId: userMenuPermission.id,
      oldValues: {
        userId,
        menuId,
        canView: true
      },
      newValues: {
        userId,
        menuId,
        canView: false
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Menu permission revoked successfully'
    });
  } catch (error) {
    console.error('Revoke menu permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke menu permission'
    });
  }
};

// Get user's accessible menus
export const getUserAccessibleMenus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // SuperAdmin can access all menus
    if (user.role === 'SUPER_ADMIN') {
      const allMenus = await prisma.menu.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      return res.json({
        success: true,
        data: allMenus
      });
    }

    // Get role hierarchy
    const roleHierarchy = {
      'ADMIN': 5,
      'MANAGER': 4,
      'CASHIER': 3,
      'OPERATOR': 2,
      'STAFF': 1
    };

    const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;

    // Get user-specific menu permissions first
    const userMenuPermissions = await prisma.userMenuPermission.findMany({
      where: {
        userId,
        canView: true
      },
      include: {
        menu: {
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    // Get menu IDs that user has explicit permission for
    const permittedMenuIds = userMenuPermissions.map(p => p.menuId);

    // Get menus accessible by role (menus with requiresRole that matches user's role level)
    // NOTE: Menus with requiresRole: null are NOT automatically accessible
    // They must have explicit user menu permissions granted
    const roleBasedMenus = await prisma.menu.findMany({
      where: {
        isActive: true,
        requiresRole: { 
          in: Object.keys(roleHierarchy).filter(role => 
            roleHierarchy[role as keyof typeof roleHierarchy] <= userRoleLevel
          ) 
        }
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    // Combine role-based menus and explicitly permitted menus
    // Only include menus that either:
    // 1. Have a requiresRole that matches user's role level, OR
    // 2. Have explicit user menu permissions granted (including menus with requiresRole: null)
    const allAccessibleMenus: any[] = [];
    
    // Add role-based menus
    roleBasedMenus.forEach(menu => {
      allAccessibleMenus.push(menu);
    });
    
    // Add explicitly permitted menus (that aren't already included)
    // This includes menus with requiresRole: null that have been granted to the user
    userMenuPermissions.forEach(permission => {
      if (!allAccessibleMenus.find(menu => menu.id === permission.menu.id)) {
        allAccessibleMenus.push(permission.menu);
      }
    });

    res.json({
      success: true,
      data: allAccessibleMenus.sort((a, b) => a.sortOrder - b.sortOrder)
    });
  } catch (error) {
    console.error('Get user accessible menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accessible menus'
    });
  }
};
