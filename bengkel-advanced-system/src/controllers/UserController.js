const { User, Role, Outlet, Tenant } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class UserController {
  // Get all users
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search, role_id, outlet_id, active } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id // Data isolation per tenant
      };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (role_id) {
        where.role_id = role_id;
      }

      if (outlet_id) {
        where.outlet_id = outlet_id;
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'permissions']
          },
          {
            model: Outlet,
            as: 'outlet',
            attributes: ['id', 'name', 'code']
          }
        ],
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        data: {
          users: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: error.message
      });
    }
  }

  // Get user by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'permissions']
          },
          {
            model: Outlet,
            as: 'outlet',
            attributes: ['id', 'name', 'code']
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!user || user.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permission (users can only view users in their tenant)
      if (user.tenant_id !== req.user.tenant_id && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
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
        message: 'Failed to get user',
        error: error.message
      });
    }
  }

  // Create new user
  static async create(req, res) {
    try {
      const { 
        name, 
        email, 
        password, 
        role_id, 
        outlet_id,
        phone,
        position,
        active = true
      } = req.body;

      // Validation
      if (!name || !email || !password || !role_id) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, password, and role are required'
        });
      }

      // Check if email already exists in this tenant
      const existingUser = await User.findOne({
        where: { 
          email, 
          tenant_id: req.user.tenant_id,
          is_deleted: false 
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered in this tenant'
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
        tenant_id: req.user.tenant_id,
        outlet_id,
        phone,
        position,
        active,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }

  // Update user
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await User.findByPk(id);

      if (!user || user.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permission
      if (user.tenant_id !== req.user.tenant_id && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Remove protected fields
      delete updateData.id;
      delete updateData.password;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await user.update(updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  // Delete user (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);

      if (!user || user.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permission
      if (user.tenant_id !== req.user.tenant_id && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Prevent deleting yourself
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      await user.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  // Update user password (admin action)
  static async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { new_password } = req.body;

      if (!new_password) {
        return res.status(400).json({
          success: false,
          message: 'New password is required'
        });
      }

      const user = await User.findByPk(id);

      if (!user || user.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permission
      if (user.tenant_id !== req.user.tenant_id && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }

  // Get user statistics
  static async getStats(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const totalUsers = await User.count({
        where: { tenant_id: tenantId, is_deleted: false }
      });

      const activeUsers = await User.count({
        where: { tenant_id: tenantId, is_deleted: false, active: true }
      });

      const usersByRole = await User.findAll({
        where: { tenant_id: tenantId, is_deleted: false },
        attributes: [
          'role_id',
          [require('sequelize').fn('COUNT', require('sequelize').col('User.id')), 'count']
        ],
        group: ['role_id'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['name']
        }]
      });

      res.json({
        success: true,
        data: {
          total_users: totalUsers,
          active_users: activeUsers,
          inactive_users: totalUsers - activeUsers,
          users_by_role: usersByRole
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }
}

module.exports = UserController;
