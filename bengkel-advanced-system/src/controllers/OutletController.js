const { Outlet, Tenant } = require('../models');
const { Op } = require('sequelize');

class OutletController {
  // Get all outlets
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search, active } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id // Data isolation per tenant
      };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } },
          { city: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const { count, rows } = await Outlet.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          outlets: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all outlets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get outlets',
        error: error.message
      });
    }
  }

  // Get outlet by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const outlet = await Outlet.findByPk(id, {
        where: { tenant_id: req.user.tenant_id }
      });

      if (!outlet || outlet.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      }

      res.json({
        success: true,
        data: outlet
      });
    } catch (error) {
      console.error('Get outlet by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get outlet',
        error: error.message
      });
    }
  }

  // Create new outlet
  static async create(req, res) {
    try {
      const {
        name,
        code,
        address,
        city,
        province,
        postal_code,
        country,
        phone,
        email,
        manager_name,
        operating_hours,
        settings
      } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Name and code are required'
        });
      }

      // Check if code already exists in this tenant
      const existingOutlet = await Outlet.findOne({
        where: { 
          code, 
          tenant_id: req.user.tenant_id,
          is_deleted: false 
        }
      });

      if (existingOutlet) {
        return res.status(409).json({
          success: false,
          message: 'Outlet code already exists in this tenant'
        });
      }

      const outlet = await Outlet.create({
        name,
        code,
        tenant_id: req.user.tenant_id,
        address,
        city,
        province,
        postal_code,
        country,
        phone,
        email,
        manager_name,
        operating_hours: operating_hours || {},
        settings: settings || {},
        active: true,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Outlet created successfully',
        data: outlet
      });
    } catch (error) {
      console.error('Create outlet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create outlet',
        error: error.message
      });
    }
  }

  // Update outlet
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const outlet = await Outlet.findOne({
        where: { 
          id, 
          tenant_id: req.user.tenant_id 
        }
      });

      if (!outlet || outlet.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      }

      // Remove protected fields
      delete updateData.id;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await outlet.update(updateData);

      res.json({
        success: true,
        message: 'Outlet updated successfully',
        data: outlet
      });
    } catch (error) {
      console.error('Update outlet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update outlet',
        error: error.message
      });
    }
  }

  // Delete outlet (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const outlet = await Outlet.findOne({
        where: { 
          id, 
          tenant_id: req.user.tenant_id 
        }
      });

      if (!outlet || outlet.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      }

      await outlet.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Outlet deleted successfully'
      });
    } catch (error) {
      console.error('Delete outlet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete outlet',
        error: error.message
      });
    }
  }

  // Get outlet statistics
  static async getStats(req, res) {
    try {
      const { id } = req.params;

      const outlet = await Outlet.findOne({
        where: { 
          id, 
          tenant_id: req.user.tenant_id 
        }
      });

      if (!outlet || outlet.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      }

      const { User, WorkOrder, Transaction } = require('../models');

      const userCount = await User.count({
        where: { outlet_id: id, is_deleted: false }
      });

      const activeWOCount = await WorkOrder.count({
        where: { 
          outlet_id: id,
          status: { [Op.in]: ['in_progress', 'pending'] }
        }
      });

      const todayTransactionCount = await Transaction.count({
        where: {
          outlet_id: id,
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      res.json({
        success: true,
        data: {
          outlet_id: id,
          outlet_name: outlet.name,
          total_users: userCount,
          active_work_orders: activeWOCount,
          today_transactions: todayTransactionCount
        }
      });
    } catch (error) {
      console.error('Get outlet stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get outlet statistics',
        error: error.message
      });
    }
  }
}

module.exports = OutletController;
