const { Tenant, User, Role } = require('../models');
const { Op } = require('sequelize');

class TenantController {
  // Get all tenants (Super Admin only)
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search, active } = req.query;
      const offset = (page - 1) * limit;

      const where = { is_deleted: false };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { business_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const { count, rows } = await Tenant.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email'],
          limit: 5
        }]
      });

      res.json({
        success: true,
        data: {
          tenants: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all tenants error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenants',
        error: error.message
      });
    }
  }

  // Get tenant by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const tenant = await Tenant.findByPk(id, {
        include: [{
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role_id']
        }],
        attributes: { exclude: [] }
      });

      if (!tenant || tenant.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      console.error('Get tenant by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenant',
        error: error.message
      });
    }
  }

  // Create new tenant
  static async create(req, res) {
    try {
      const {
        name,
        business_name,
        business_type,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        country,
        tax_id,
        subscription_plan = 'standard',
        max_users = 10,
        max_outlets = 3,
        features
      } = req.body;

      // Validation
      if (!name || !business_name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name, business name, and email are required'
        });
      }

      // Check if email already exists
      const existingTenant = await Tenant.findOne({
        where: { email, is_deleted: false }
      });

      if (existingTenant) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      const tenant = await Tenant.create({
        name,
        business_name,
        business_type,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        country,
        tax_id,
        subscription_plan,
        subscription_status: 'active',
        subscription_start_date: new Date(),
        max_users,
        max_outlets,
        features: features || {},
        settings: {},
        active: true,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: tenant
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create tenant',
        error: error.message
      });
    }
  }

  // Update tenant
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const tenant = await Tenant.findByPk(id);

      if (!tenant || tenant.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Remove protected fields from update
      delete updateData.id;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await tenant.update(updateData);

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tenant',
        error: error.message
      });
    }
  }

  // Delete tenant (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const tenant = await Tenant.findByPk(id);

      if (!tenant || tenant.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      await tenant.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error) {
      console.error('Delete tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tenant',
        error: error.message
      });
    }
  }

  // Get tenant statistics
  static async getStats(req, res) {
    try {
      const { id } = req.params;

      const tenant = await Tenant.findByPk(id);

      if (!tenant || tenant.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const userCount = await User.count({
        where: { tenant_id: id, is_deleted: false }
      });

      res.json({
        success: true,
        data: {
          tenant_id: id,
          total_users: userCount,
          max_users: tenant.max_users,
          subscription_plan: tenant.subscription_plan,
          subscription_status: tenant.subscription_status,
          active: tenant.active
        }
      });
    } catch (error) {
      console.error('Get tenant stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenant statistics',
        error: error.message
      });
    }
  }
}

module.exports = TenantController;
