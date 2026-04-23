const { User, Tenant } = require('../models');
const { Op } = require('sequelize');

class HRPayrollController {
  // Get payroll summary
  static async getPayrollSummary(req, res) {
    try {
      const { month, year } = req.query;
      const targetDate = new Date(year || new Date().getFullYear(), month - 1 || new Date().getMonth(), 1);

      const employees = await User.findAll({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          active: true,
          salary: { [Op.gt]: 0 }
        }
      });

      const payrollData = employees.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name,
        position: emp.position,
        base_salary: emp.salary || 0,
        allowances: 0,
        deductions: 0,
        net_salary: emp.salary || 0
      }));

      const totalGross = payrollData.reduce((sum, emp) => sum + emp.base_salary, 0);
      const totalNet = payrollData.reduce((sum, emp) => sum + emp.net_salary, 0);

      res.json({
        success: true,
        data: {
          period: {
            month: month || new Date().getMonth() + 1,
            year: year || new Date().getFullYear()
          },
          employees: payrollData,
          summary: {
            total_employees: payrollData.length,
            total_gross_salary: totalGross,
            total_allowances: 0,
            total_deductions: 0,
            total_net_salary: totalNet
          }
        }
      });
    } catch (error) {
      console.error('Get payroll summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payroll summary',
        error: error.message
      });
    }
  }

  // Calculate payroll for a specific employee
  static async calculatePayroll(req, res) {
    try {
      const { id } = req.params;
      const { month, year, allowances = [], deductions = [] } = req.body;

      const employee = await User.findOne({
        where: { id, tenant_id: req.user.tenant_id, is_deleted: false }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      const baseSalary = employee.salary || 0;
      const totalAllowances = allowances.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const totalDeductions = deductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const grossSalary = baseSalary + totalAllowances;
      const netSalary = grossSalary - totalDeductions;

      res.json({
        success: true,
        data: {
          employee: {
            id: employee.id,
            name: employee.name,
            position: employee.position
          },
          period: { month, year },
          breakdown: {
            base_salary: baseSalary,
            allowances: allowances,
            total_allowances: totalAllowances,
            gross_salary: grossSalary,
            deductions: deductions,
            total_deductions: totalDeductions,
            net_salary: netSalary
          }
        }
      });
    } catch (error) {
      console.error('Calculate payroll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate payroll',
        error: error.message
      });
    }
  }

  // Get payroll statistics
  static async getStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const employees = await User.findAll({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          active: true,
          salary: { [Op.gt]: 0 }
        }
      });

      const totalMonthlyPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
      const averageSalary = employees.length > 0 ? totalMonthlyPayroll / employees.length : 0;
      const highestSalary = Math.max(...employees.map(emp => emp.salary || 0), 0);
      const lowestSalary = Math.min(...employees.map(emp => emp.salary || 0), 0);

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          total_employees: employees.length,
          total_monthly_payroll: totalMonthlyPayroll,
          average_salary: averageSalary,
          highest_salary: highestSalary,
          lowest_salary: lowestSalary,
          annual_payroll_estimate: totalMonthlyPayroll * 12
        }
      });
    } catch (error) {
      console.error('Get payroll stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payroll statistics',
        error: error.message
      });
    }
  }
}

module.exports = HRPayrollController;
