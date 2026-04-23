const { Transaction, WorkOrder, Product, User, Customer, Tenant } = require('../models');
const { Op } = require('sequelize');

class ReportController {
  // Sales report
  static async getSalesReport(req, res) {
    try {
      const { start_date, end_date, outlet_id, group_by = 'day' } = req.query;

      const where = {
        tenant_id: req.user.tenant_id,
        is_deleted: false,
        status: { [Op.in]: ['paid', 'partial'] }
      };

      if (start_date && end_date) {
        where.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
      }

      if (outlet_id) where.outlet_id = outlet_id;

      const transactions = await Transaction.findAll({
        where,
        attributes: [
          'id',
          'total',
          'payment_method',
          'status',
          'created_at'
        ],
        order: [['created_at', 'ASC']]
      });

      const groupedData = {};
      transactions.forEach(trx => {
        let key;
        const date = new Date(trx.created_at);
        if (group_by === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (group_by === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (group_by === 'payment_method') {
          key = trx.payment_method;
        }

        if (!groupedData[key]) {
          groupedData[key] = { count: 0, total: 0 };
        }
        groupedData[key].count += 1;
        groupedData[key].total += parseFloat(trx.total);
      });

      const totalRevenue = transactions.reduce((sum, trx) => sum + parseFloat(trx.total), 0);

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          group_by,
          summary: {
            total_transactions: transactions.length,
            total_revenue: totalRevenue,
            average_transaction: transactions.length > 0 ? totalRevenue / transactions.length : 0
          },
          data: Object.entries(groupedData).map(([key, value]) => ({
            period: key,
            count: value.count,
            total: value.total
          }))
        }
      });
    } catch (error) {
      console.error('Get sales report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sales report',
        error: error.message
      });
    }
  }

  // Work order report
  static async getWorkOrderReport(req, res) {
    try {
      const { start_date, end_date, mechanic_id, outlet_id } = req.query;

      const where = {
        tenant_id: req.user.tenant_id,
        is_deleted: false
      };

      if (start_date && end_date) {
        where.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
      }

      if (mechanic_id) where.mechanic_id = mechanic_id;
      if (outlet_id) where.outlet_id = outlet_id;

      const workOrders = await WorkOrder.findAll({
        where,
        include: [
          { model: User, as: 'mechanic', attributes: ['id', 'name'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name'] }
        ]
      });

      const byStatus = {};
      const byMechanic = {};
      let totalEstimatedCost = 0;

      workOrders.forEach(wo => {
        byStatus[wo.status] = (byStatus[wo.status] || 0) + 1;
        
        const mechanicName = wo.mechanic?.name || 'Unassigned';
        if (!byMechanic[mechanicName]) {
          byMechanic[mechanicName] = { count: 0, completed: 0 };
        }
        byMechanic[mechanicName].count += 1;
        if (wo.status === 'completed') {
          byMechanic[mechanicName].completed += 1;
        }

        totalEstimatedCost += parseFloat(wo.estimated_cost) || 0;
      });

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          summary: {
            total_work_orders: workOrders.length,
            by_status: byStatus,
            by_mechanic: byMechanic,
            total_estimated_cost: totalEstimatedCost
          },
          work_orders: workOrders
        }
      });
    } catch (error) {
      console.error('Get work order report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get work order report',
        error: error.message
      });
    }
  }

  // Inventory report
  static async getInventoryReport(req, res) {
    try {
      const { category_id, low_stock_only } = req.query;

      const where = {
        tenant_id: req.user.tenant_id,
        is_deleted: false,
        active: true
      };

      if (category_id) where.category_id = category_id;
      if (low_stock_only === 'true') {
        where.stock_qty = { [Op.lte]: require('sequelize').col('min_stock') };
      }

      const products = await Product.findAll({
        where,
        order: [['stock_qty', 'ASC']],
        include: [{ model: require('../models').Category, as: 'category', attributes: ['name'] }]
      });

      const totalValue = products.reduce((sum, p) => {
        return sum + ((p.purchase_price || 0) * (p.stock_qty || 0));
      }, 0);

      const lowStockItems = products.filter(p => p.stock_qty <= p.min_stock);

      res.json({
        success: true,
        data: {
          summary: {
            total_products: products.length,
            total_inventory_value: totalValue,
            low_stock_count: lowStockItems.length
          },
          low_stock_items: lowStockItems,
          all_products: products
        }
      });
    } catch (error) {
      console.error('Get inventory report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get inventory report',
        error: error.message
      });
    }
  }

  // Dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's transactions
      const todayTransactions = await Transaction.count({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          created_at: { [Op.gte]: today }
        }
      });

      const todayRevenue = await Transaction.sum('total', {
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          created_at: { [Op.gte]: today }
        }
      });

      // This month's transactions
      const monthTransactions = await Transaction.count({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          created_at: { [Op.gte]: thisMonthStart }
        }
      });

      const monthRevenue = await Transaction.sum('total', {
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          created_at: { [Op.gte]: thisMonthStart }
        }
      });

      // Work orders
      const pendingWO = await WorkOrder.count({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          status: 'pending'
        }
      });

      const inProgressWO = await WorkOrder.count({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          status: 'in_progress'
        }
      });

      // Low stock products
      const lowStockCount = await Product.count({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          active: true,
          stock_qty: { [Op.lte]: require('sequelize').col('min_stock') }
        }
      });

      res.json({
        success: true,
        data: {
          today: {
            transactions: todayTransactions,
            revenue: todayRevenue || 0
          },
          this_month: {
            transactions: monthTransactions,
            revenue: monthRevenue || 0
          },
          work_orders: {
            pending: pendingWO,
            in_progress: inProgressWO
          },
          inventory: {
            low_stock_alerts: lowStockCount
          }
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics',
        error: error.message
      });
    }
  }
}

module.exports = ReportController;
