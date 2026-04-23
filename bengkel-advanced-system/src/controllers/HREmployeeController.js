const { User, Role, Outlet, Tenant } = require('../models');
const { Op } = require('sequelize');

class HREmployeeController {
  // Get all employees
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, search, position, active } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id
      };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (position) {
        where.position = { [Op.iLike]: `%${position}%` };
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
          { model: Role, as: 'role', attributes: ['id', 'name'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] }
        ],
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        data: {
          employees: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get employees',
        error: error.message
      });
    }
  }

  // Get employee by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const employee = await User.findByPk(id, {
        where: { tenant_id: req.user.tenant_id },
        include: [
          { model: Role, as: 'role', attributes: ['id', 'name'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!employee || employee.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Get employee by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get employee',
        error: error.message
      });
    }
  }

  // Create new employee
  static async create(req, res) {
    try {
      const {
        name,
        email,
        password,
        position,
        phone,
        address,
        date_of_birth,
        hire_date,
        salary,
        outlet_id,
        role_id
      } = req.body;

      if (!name || !email || !position) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and position are required'
        });
      }

      const existingEmployee = await User.findOne({
        where: { email, tenant_id: req.user.tenant_id, is_deleted: false }
      });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password || 'default123', 10);

      const employee = await User.create({
        name,
        email,
        password: hashedPassword,
        position,
        phone,
        address,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        hire_date: hire_date ? new Date(hire_date) : new Date(),
        salary: parseFloat(salary) || 0,
        outlet_id,
        role_id: role_id || 6,
        tenant_id: req.user.tenant_id,
        active: true,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create employee',
        error: error.message
      });
    }
  }

  // Update employee
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const employee = await User.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!employee || employee.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      delete updateData.id;
      delete updateData.password;
      delete updateData.tenant_id;

      await employee.update(updateData);

      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: employee
      });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee',
        error: error.message
      });
    }
  }

  // Delete employee
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const employee = await User.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!employee || employee.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      await employee.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete employee',
        error: error.message
      });
    }
  }

  // Get employee statistics
  static async getStats(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const totalEmployees = await User.count({
        where: { tenant_id: tenantId, is_deleted: false }
      });

      const activeEmployees = await User.count({
        where: { tenant_id: tenantId, is_deleted: false, active: true }
      });

      const byPosition = await User.findAll({
        where: { tenant_id: tenantId, is_deleted: false },
        attributes: ['position', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
        group: ['position']
      });

      res.json({
        success: true,
        data: {
          total_employees: totalEmployees,
          active_employees: activeEmployees,
          inactive_employees: totalEmployees - activeEmployees,
          by_position: byPosition.reduce((acc, item) => {
            acc[item.position] = item.dataValues.count;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Get employee stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get employee statistics',
        error: error.message
      });
    }
  }
}

module.exports = HREmployeeController;
