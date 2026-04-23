const { WorkOrder, Customer, Vehicle, User, Outlet, Product, Transaction } = require('../models');
const { Op } = require('sequelize');
const eventSystem = require('../events');

class WorkOrderController {
  // Get all work orders
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, status, customer_id, vehicle_id, mechanic_id, outlet_id, search } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id
      };

      if (status) {
        where.status = status;
      }

      if (customer_id) {
        where.customer_id = customer_id;
      }

      if (vehicle_id) {
        where.vehicle_id = vehicle_id;
      }

      if (mechanic_id) {
        where.mechanic_id = mechanic_id;
      }

      if (outlet_id) {
        where.outlet_id = outlet_id;
      } else if (req.user.outlet_id && req.user.role?.name !== 'Super Admin') {
        where.outlet_id = req.user.outlet_id;
      }

      if (search) {
        where[Op.or] = [
          { wo_number: { [Op.iLike]: `%${search}%` } },
          { complaint: { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await WorkOrder.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
          { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate_number', 'model'] },
          { model: User, as: 'mechanic', attributes: ['id', 'name'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name', 'code'] }
        ]
      });

      res.json({
        success: true,
        data: {
          workOrders: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all work orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get work orders',
        error: error.message
      });
    }
  }

  // Get work order by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const wo = await WorkOrder.findByPk(id, {
        where: { tenant_id: req.user.tenant_id },
        include: [
          { model: Customer, as: 'customer' },
          { model: Vehicle, as: 'vehicle' },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] }
        ]
      });

      if (!wo || wo.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      res.json({
        success: true,
        data: wo
      });
    } catch (error) {
      console.error('Get work order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get work order',
        error: error.message
      });
    }
  }

  // Create new work order
  static async create(req, res) {
    try {
      const {
        customer_id,
        vehicle_id,
        outlet_id,
        mechanic_id,
        complaint,
        notes,
        estimated_cost,
        estimated_time
      } = req.body;

      if (!customer_id || !vehicle_id || !complaint) {
        return res.status(400).json({
          success: false,
          message: 'Customer, vehicle, and complaint are required'
        });
      }

      const lastWO = await WorkOrder.findOne({
        where: { tenant_id: req.user.tenant_id },
        order: [['created_at', 'DESC']]
      });

      const seqNum = lastWO ? parseInt(lastWO.wo_number.split('-').pop()) + 1 : 1;
      const woNumber = `WO-${new Date().getFullYear()}${String(seqNum).padStart(5, '0')}`;

      const wo = await WorkOrder.create({
        wo_number: woNumber,
        customer_id,
        vehicle_id,
        outlet_id: outlet_id || req.user.outlet_id,
        mechanic_id,
        complaint,
        notes,
        estimated_cost: parseFloat(estimated_cost) || 0,
        estimated_time: estimated_time ? new Date(estimated_time) : null,
        status: 'pending',
        tenant_id: req.user.tenant_id,
        created_by: req.user.id
      });

      // Emit event
      eventSystem.emit('wo.created', {
        tenant_id: req.user.tenant_id,
        data: wo.toJSON(),
        context: { timestamp: new Date().toISOString() }
      });

      res.status(201).json({
        success: true,
        message: 'Work order created successfully',
        data: wo
      });
    } catch (error) {
      console.error('Create work order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create work order',
        error: error.message
      });
    }
  }

  // Update work order
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const wo = await WorkOrder.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!wo || wo.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      delete updateData.id;
      delete updateData.wo_number;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await wo.update(updateData);

      res.json({
        success: true,
        message: 'Work order updated successfully',
        data: wo
      });
    } catch (error) {
      console.error('Update work order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update work order',
        error: error.message
      });
    }
  }

  // Update work order status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const wo = await WorkOrder.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!wo || wo.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      const oldStatus = wo.status;
      await wo.update({ status, notes: notes || wo.notes });

      // Emit event based on status change
      if (status === 'in_progress') {
        eventSystem.emit('wo.started', {
          tenant_id: req.user.tenant_id,
          data: wo.toJSON(),
          context: { timestamp: new Date().toISOString(), old_status: oldStatus }
        });
      } else if (status === 'completed') {
        eventSystem.emit('wo.completed', {
          tenant_id: req.user.tenant_id,
          data: wo.toJSON(),
          context: { timestamp: new Date().toISOString(), old_status: oldStatus }
        });
      }

      res.json({
        success: true,
        message: 'Work order status updated successfully',
        data: wo
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status',
        error: error.message
      });
    }
  }

  // Delete work order
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const wo = await WorkOrder.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!wo || wo.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      if (wo.status !== 'pending' && wo.status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete work order with active status'
        });
      }

      await wo.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Work order deleted successfully'
      });
    } catch (error) {
      console.error('Delete work order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete work order',
        error: error.message
      });
    }
  }

  // Get work order statistics
  static async getStats(req, res) {
    try {
      const { outlet_id, mechanic_id, start_date, end_date } = req.query;

      const where = {
        tenant_id: req.user.tenant_id,
        is_deleted: false
      };

      if (outlet_id) where.outlet_id = outlet_id;
      if (mechanic_id) where.mechanic_id = mechanic_id;
      if (start_date && end_date) {
        where.created_at = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      const total = await WorkOrder.count({ where });
      const byStatus = await WorkOrder.findAll({
        where,
        attributes: ['status', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
        group: ['status']
      });

      res.json({
        success: true,
        data: {
          total,
          by_status: byStatus.reduce((acc, item) => {
            acc[item.status] = item.dataValues.count;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      });
    }
  }
}

module.exports = WorkOrderController;
