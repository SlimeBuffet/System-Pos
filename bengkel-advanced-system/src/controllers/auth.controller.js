const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const dbManager = require('../database');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, username, full_name, role_id, outlet_id } = req.body;
      
      const sequelize = dbManager.getConnection('default');
      const User = sequelize.models.User;
      const Role = sequelize.models.Role;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        username,
        full_name,
        role_id,
        outlet_id,
        tenant_id: req.tenantId || 'default'
      });

      // Generate token
      const token = this.generateToken(user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: error.message
      });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const sequelize = dbManager.getConnection('default');
      const User = sequelize.models.User;
      const Role = sequelize.models.Role;

      // Find user with role
      const user = await User.scope('all').findOne({
        where: { email },
        include: [{ model: Role, as: 'role' }]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (user.is_deleted || !user.active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Generate token
      const token = this.generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            role: user.role ? {
              id: user.role.id,
              name: user.role.name,
              slug: user.role.slug
            } : null,
            outlet_id: user.outlet_id
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to login',
        error: error.message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const sequelize = req.db;
      const User = sequelize.models.User;
      const Role = sequelize.models.Role;
      const Outlet = sequelize.models.Outlet;

      const user = await User.findByPk(req.user.id, {
        include: [
          { model: Role, as: 'role' },
          { model: Outlet, as: 'outlet' }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
          outlet: user.outlet,
          created_at: user.created_at
        }
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

  // Update profile
  async updateProfile(req, res) {
    try {
      const { full_name, phone } = req.body;
      const sequelize = req.db;
      const User = sequelize.models.User;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (full_name) user.full_name = full_name;
      if (phone) user.phone = phone;

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          phone: user.phone
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const bcrypt = require('bcryptjs');
      const sequelize = req.db;
      const User = sequelize.models.User;

      const user = await User.scope('all').findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      user.password = hashedPassword;
      await user.save();

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

  // Logout
  async logout(req, res) {
    // In a real app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Helper: Generate JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role_id: user.role_id,
      tenant_id: user.tenant_id,
      outlet_id: user.outlet_id
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expire,
      issuer: config.jwt.issuer
    });
  }
}

module.exports = new AuthController();
