const { Role } = require('../models');

class RoleController {
  // Get all roles
  static async getAll(req, res) {
    try {
      const roles = await Role.findAll({
        where: { is_deleted: false },
        order: [['created_at', 'ASC']],
        attributes: ['id', 'name', 'description', 'permissions', 'is_system']
      });

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get roles',
        error: error.message
      });
    }
  }

  // Get role by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const role = await Role.findByPk(id, {
        attributes: { exclude: ['is_deleted'] }
      });

      if (!role || role.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Get role by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get role',
        error: error.message
      });
    }
  }

  // Create new role
  static async create(req, res) {
    try {
      const { name, description, permissions, is_system = false } = req.body;

      // Validation
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Role name is required'
        });
      }

      // Check if role name already exists
      const existingRole = await Role.findOne({
        where: { 
          name: { [require('sequelize').Op.iLike]: name },
          is_deleted: false 
        }
      });

      if (existingRole) {
        return res.status(409).json({
          success: false,
          message: 'Role name already exists'
        });
      }

      const role = await Role.create({
        name,
        description,
        permissions: permissions || {},
        is_system,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message
      });
    }
  }

  // Update role
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const role = await Role.findByPk(id);

      if (!role || role.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modifying system roles unless super admin
      if (role.is_system && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        });
      }

      // Remove protected fields
      delete updateData.id;
      delete updateData.is_system;
      delete updateData.created_at;
      delete updateData.updated_at;

      await role.update(updateData);

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: role
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: error.message
      });
    }
  }

  // Delete role (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const role = await Role.findByPk(id);

      if (!role || role.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent deleting system roles
      if (role.is_system) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete system roles'
        });
      }

      // Check if role is being used by any users
      const { User } = require('../models');
      const usersCount = await User.count({
        where: { role_id: id, is_deleted: false }
      });

      if (usersCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role. ${usersCount} user(s) are still using this role.`
        });
      }

      await role.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: error.message
      });
    }
  }

  // Update role permissions
  static async updatePermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Permissions object is required'
        });
      }

      const role = await Role.findByPk(id);

      if (!role || role.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modifying system role permissions unless super admin
      if (role.is_system && req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system role permissions'
        });
      }

      await role.update({ permissions });

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: role
      });
    } catch (error) {
      console.error('Update permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions',
        error: error.message
      });
    }
  }

  // Get available permissions list
  static async getAvailablePermissions(req, res) {
    try {
      const availablePermissions = {
        users: ['view', 'create', 'edit', 'delete'],
        roles: ['view', 'create', 'edit', 'delete'],
        tenants: ['view', 'create', 'edit', 'delete'],
        outlets: ['view', 'create', 'edit', 'delete'],
        products: ['view', 'create', 'edit', 'delete'],
        work_orders: ['view', 'create', 'edit', 'delete', 'complete'],
        transactions: ['view', 'create', 'edit', 'delete', 'refund'],
        accounting: ['view', 'create', 'edit'],
        reports: ['view', 'export'],
        hr: ['view', 'create', 'edit', 'delete'],
        settings: ['view', 'edit']
      };

      res.json({
        success: true,
        data: availablePermissions
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get permissions',
        error: error.message
      });
    }
  }
}

module.exports = RoleController;
