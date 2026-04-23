const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Tenant } = require('../models');
const config = require('../config');

class AuthController {
  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const user = await User.findOne({
        where: { 
          email,
          is_deleted: false
        },
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'permissions']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'business_name', 'active']
          }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      if (user.tenant && !user.tenant.active) {
        return res.status(403).json({
          success: false,
          message: 'Tenant is not active'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role_id: user.role_id,
          tenant_id: user.tenant_id
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Update last login
      await user.update({ last_login: new Date() });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenant: user.tenant,
            outlet_id: user.outlet_id
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Register new user (for super admin only)
  static async register(req, res) {
    try {
      const { 
        name, 
        email, 
        password, 
        role_id, 
        tenant_id,
        outlet_id,
        phone,
        position
      } = req.body;

      // Validation
      if (!name || !email || !password || !role_id) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, password, and role are required'
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email, is_deleted: false }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role_id,
        tenant_id: tenant_id || 'default',
        outlet_id,
        phone,
        position,
        created_by: req.user?.id
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isPasswordValid = await bcrypt.compare(current_password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const hashedNewPassword = await bcrypt.hash(new_password, 10);

      await user.update({ password: hashedNewPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  // Get current user profile
  static async me(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'permissions']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'business_name']
          }
        ],
        attributes: { exclude: ['password'] }
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
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Logout (client-side token removal, but we can log it)
  static async logout(req, res) {
    try {
      // In a real app, you might want to blacklist the token
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;
