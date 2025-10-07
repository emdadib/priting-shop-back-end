import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
export const requireManager = requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
export const requireCashier = requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']);

// Permission-based middleware
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // SuperAdmin has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check if user has the specific permission
      const permission = await prisma.permission.findFirst({
        where: {
          resource,
          action,
          isActive: true
        }
      });

      if (!permission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission not found' 
        });
      }

      const userPermission = await prisma.userPermission.findFirst({
        where: {
          userId: req.user.id,
          permissionId: permission.id,
          granted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (!userPermission) {
        return res.status(403).json({ 
          success: false, 
          message: `Insufficient permissions: ${resource}.${action}` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Permission check failed' 
      });
    }
  };
};

// Check if user can view a specific menu
export const canViewMenu = async (userId: string, menuName: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) return false;

    // SuperAdmin can view all menus
    if (user.role === 'SUPER_ADMIN') return true;

    const menu = await prisma.menu.findUnique({
      where: { name: menuName }
    });

    if (!menu || !menu.isActive) return false;

    // Check if user has specific menu permission
    const menuPermission = await prisma.userMenuPermission.findFirst({
      where: {
        userId,
        menuId: menu.id,
        canView: true
      }
    });

    if (menuPermission) return true;

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

      const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[menu.requiresRole as keyof typeof roleHierarchy] || 0;

      return userRoleLevel >= requiredRoleLevel;
    }

    return true; // Menu has no role requirement
  } catch (error) {
    console.error('Menu permission check error:', error);
    return false;
  }
}; 