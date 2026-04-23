const { Transaction, WorkOrder, Customer, User, Outlet, Product, JournalEntry, Account } = require('../models');
const { Op } = require('sequelize');
const eventSystem = require('../events');

class TransactionController {
  // Get all transactions
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, status, payment_method, outlet_id, start_date, end_date, search } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id
      };

      if (status) where.status = status;
      if (payment_method) where.payment_method = payment_method;
      if (outlet_id) where.outlet_id = outlet_id;
      else if (req.user.outlet_id && req.user.role?.name !== 'Super Admin') {
        where.outlet_id = req.user.outlet_id;
      }

      if (start_date && end_date) {
        where.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
      }

      if (search) {
        where[Op.or] = [
          { invoice_number: { [Op.iLike]: `%${search}%` } },
          { customer_name: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          { model: WorkOrder, as: 'work_order', attributes: ['id', 'wo_number'] },
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
          { model: User, as: 'cashier', attributes: ['id', 'name'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] }
        ]
      });

      res.json({
        success: true,
        data: {
          transactions: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transactions',
        error: error.message
      });
    }
  }

  // Get transaction by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const trx = await Transaction.findByPk(id, {
        where: { tenant_id: req.user.tenant_id },
        include: [
          { model: WorkOrder, as: 'work_order' },
          { model: Customer, as: 'customer' },
          { model: User, as: 'cashier' },
          { model: Outlet, as: 'outlet' }
        ]
      });

      if (!trx || trx.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: trx
      });
    } catch (error) {
      console.error('Get transaction by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction',
        error: error.message
      });
    }
  }

  // Create new transaction
  static async create(req, res) {
    try {
      const {
        work_order_id,
        customer_id,
        outlet_id,
        items,
        subtotal,
        discount,
        tax_rate,
        total,
        payment_method,
        payment_amount,
        notes
      } = req.body;

      if (!items || !total || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Items, total, and payment method are required'
        });
      }

      const lastTrx = await Transaction.findOne({
        where: { tenant_id: req.user.tenant_id },
        order: [['created_at', 'DESC']]
      });

      const seqNum = lastTrx ? parseInt(lastTrx.invoice_number.split('-').pop()) + 1 : 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}${String(seqNum).padStart(6, '0')}`;

      const change = parseFloat(payment_amount) - parseFloat(total);

      const trx = await Transaction.create({
        invoice_number: invoiceNumber,
        work_order_id,
        customer_id,
        outlet_id: outlet_id || req.user.outlet_id,
        items: items || [],
        subtotal: parseFloat(subtotal) || 0,
        discount: parseFloat(discount) || 0,
        tax_rate: parseFloat(tax_rate) || 0,
        tax_amount: parseFloat(tax_rate) > 0 ? (parseFloat(subtotal) * parseFloat(tax_rate)) / 100 : 0,
        total: parseFloat(total),
        payment_method,
        payment_amount: parseFloat(payment_amount),
        change: change >= 0 ? change : 0,
        status: change >= 0 ? 'paid' : 'partial',
        notes,
        tenant_id: req.user.tenant_id,
        cashier_id: req.user.id,
        created_by: req.user.id
      });

      // Emit event
      eventSystem.emit('transaction.created', {
        tenant_id: req.user.tenant_id,
        data: trx.toJSON(),
        context: { timestamp: new Date().toISOString() }
      });

      // Create journal entry for accounting
      await this.createJournalEntry(trx);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: trx
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create transaction',
        error: error.message
      });
    }
  }

  // Create journal entry for transaction
  static async createJournalEntry(transaction) {
    try {
      const { Tenant } = require('../models');
      const tenant = await Tenant.findByPk(transaction.tenant_id);
      
      if (!tenant) return;

      const cashAccount = await Account.findOne({
        where: { tenant_id: transaction.tenant_id, code: '101' }
      });

      const revenueAccount = await Account.findOne({
        where: { tenant_id: transaction.tenant_id, code: '401' }
      });

      if (!cashAccount || !revenueAccount) return;

      const journal = await JournalEntry.create({
        entry_number: `JE-${Date.now()}`,
        tenant_id: transaction.tenant_id,
        reference_type: 'transaction',
        reference_id: transaction.id,
        transaction_date: new Date(),
        description: `Payment for Invoice ${transaction.invoice_number}`,
        status: 'posted',
        created_by: transaction.cashier_id
      });

      // Debit Cash
      await journal.addLine({
        account_id: cashAccount.id,
        description: 'Cash received',
        debit: transaction.payment_amount,
        credit: 0
      });

      // Credit Revenue
      await journal.addLine({
        account_id: revenueAccount.id,
        description: 'Sales revenue',
        debit: 0,
        credit: transaction.total
      });

      return journal;
    } catch (error) {
      console.error('Create journal entry error:', error);
    }
  }

  // Update transaction
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const trx = await Transaction.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!trx || trx.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      delete updateData.id;
      delete updateData.invoice_number;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await trx.update(updateData);

      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: trx
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction',
        error: error.message
      });
    }
  }

  // Process refund/return
  static async refund(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason, refund_method } = req.body;

      if (!amount || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Amount and reason are required'
        });
      }

      const trx = await Transaction.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!trx || trx.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      if (trx.status === 'refunded') {
        return res.status(400).json({
          success: false,
          message: 'Transaction already refunded'
        });
      }

      await trx.update({
        status: 'refunded',
        refund_amount: parseFloat(amount),
        refund_reason: reason,
        refund_method: refund_method || trx.payment_method,
        refunded_at: new Date(),
        refunded_by: req.user.id
      });

      eventSystem.emit('transaction.refunded', {
        tenant_id: req.user.tenant_id,
        data: trx.toJSON(),
        context: { timestamp: new Date().toISOString() }
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: trx
      });
    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  }

  // Get transaction statistics
  static async getStats(req, res) {
    try {
      const { start_date, end_date, outlet_id } = req.query;

      const where = {
        tenant_id: req.user.tenant_id,
        is_deleted: false
      };

      if (outlet_id) where.outlet_id = outlet_id;
      if (start_date && end_date) {
        where.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
      }

      const totalTransactions = await Transaction.count({ where });
      const totalRevenue = await Transaction.sum('total', { where });
      const byStatus = await Transaction.findAll({
        where,
        attributes: ['status', [require('sequelize').fn('SUM', require('sequelize').col('total')), 'total']],
        group: ['status']
      });

      res.json({
        success: true,
        data: {
          total_transactions: totalTransactions,
          total_revenue: totalRevenue || 0,
          by_status: byStatus.reduce((acc, item) => {
            acc[item.status] = parseFloat(item.dataValues.total) || 0;
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

module.exports = TransactionController;
