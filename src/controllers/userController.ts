import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Create user (admin only)
export const createUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, username, firstName, lastName, password, role } = req.body;
    const currentUser = req.user;

    // Only SuperAdmin can create SuperAdmin users
    if (role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can create SuperAdmin users'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        firstName,
        lastName,
        password: hashedPassword,
        role: role || 'STAFF',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId: currentUser?.id || 'unknown',
      action: 'CREATE',
      entity: 'USER',
      entityId: user.id,
      newValues: { email, username, firstName, lastName, role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { email, username, firstName, lastName, role, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        username,
        firstName,
        lastName,
        role,
        isActive
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE',
      entity: 'USER',
      entityId: id,
      oldValues: {
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role,
        isActive: existingUser.isActive
      },
      newValues: { email, username, firstName, lastName, role, isActive },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 'unknown',
      action: 'DELETE',
      entity: 'USER',
      entityId: id,
      oldValues: {
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

// Update current user profile
export const updateCurrentUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { email, username, firstName, lastName } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        username,
        firstName,
        lastName
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      oldValues: {
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName
      },
      newValues: { email, username, firstName, lastName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Aliases for backward compatibility with routes
export const getUserProfile = getCurrentUser;
export const updateUserProfile = updateCurrentUser;