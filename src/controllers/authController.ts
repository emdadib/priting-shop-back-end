import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { createAuditLog } from '../utils/auditLogger';

// Generate JWT tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' } // Extended from 15m to 8 hours
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!, // Use JWT_REFRESH_SECRET if available, fallback to JWT_SECRET
    { expiresIn: '30d' } // Extended from 7d to 30 days
  );

  return { accessToken, refreshToken };
};

// Login controller
// Supports master password login: If MASTER_PASSWORD env variable is set,
// any email can login with that password. If user doesn't exist, it will be created with SUPER_ADMIN role.
export const login = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact administrator.'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Login attempt:', { email, timestamp: new Date().toISOString() });

    // Check for master password (if configured)
    const masterPassword = process.env.MASTER_PASSWORD;
    let user;
    let isMasterPasswordLogin = false;

    if (masterPassword && password === masterPassword) {
      // Master password login - find or create user
      console.log('Master password login attempt:', { email });
      isMasterPasswordLogin = true;

      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true
        }
      });

      // If user doesn't exist, create a temporary user with SUPER_ADMIN role
      if (!user) {
        console.log('Creating user with master password:', { email });
        const hashedPassword = await bcrypt.hash(password, 12);
        
        user = await prisma.user.create({
          data: {
            email,
            username: email.split('@')[0],
            password: hashedPassword,
            firstName: 'Master',
            lastName: 'User',
            role: 'SUPER_ADMIN',
            isActive: true
          },
          select: {
            id: true,
            email: true,
            username: true,
            password: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true
          }
        });

        console.log('User created with master password:', { email, userId: user.id });
      } else {
        // User exists, ensure they're active
        if (!user.isActive) {
          // Activate the user if they were inactive
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: true }
          });
          user.isActive = true;
        }
      }
    } else {
      // Normal login flow
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true
        }
      });

      if (!user) {
        console.log('Login failed: User not found', { email });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.isActive) {
        console.log('Login failed: User inactive', { email, userId: user.id });
        return res.status(401).json({
          success: false,
          message: 'Account is inactive. Please contact administrator.'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('Login failed: Invalid password', { email, userId: user.id });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: isMasterPasswordLogin ? 'MASTER_PASSWORD_LOGIN' : 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      newValues: isMasterPasswordLogin ? { loginMethod: 'MASTER_PASSWORD' } : undefined,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (isMasterPasswordLogin) {
      console.log('Master password login successful:', { email, userId: user.id });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P1001') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Login failed. Please try again.'
        : error.message || 'Login failed'
    });
  }
};

// Register controller
export const register = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, username, password, firstName, lastName, role } = req.body;

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
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: user.id,
      newValues: { email, username, firstName, lastName, role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Refresh token controller
export const refreshToken = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token (use JWT_REFRESH_SECRET if available, otherwise fallback to JWT_SECRET)
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;
    
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Logout controller
export const logout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // In a more sophisticated implementation, you might want to blacklist the refresh token
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Change password controller
export const changePassword = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed'
    });
  }
}; 