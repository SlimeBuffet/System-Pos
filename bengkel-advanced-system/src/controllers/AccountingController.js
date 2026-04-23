const { JournalEntry, Account, Tenant } = require('../models');
const { Op } = require('sequelize');

class AccountingController {
  // Get all journal entries
  static async getJournalEntries(req, res) {
    try {
      const { page = 1, limit = 20, start_date, end_date, status } = req.query;
      const offset = (page - 1) * limit;

      const where = { tenant_id: req.user.tenant_id };

      if (start_date && end_date) {
        where.transaction_date = { [Op.between]: [new Date(start_date), new Date(end_date)] };
      }

      if (status) where.status = status;

      const { count, rows } = await JournalEntry.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['transaction_date', 'DESC']],
        include: ['lines']
      });

      res.json({
        success: true,
        data: {
          entries: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get journal entries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get journal entries',
        error: error.message
      });
    }
  }

  // Get chart of accounts
  static async getChartOfAccounts(req, res) {
    try {
      const accounts = await Account.findAll({
        where: { 
          tenant_id: req.user.tenant_id,
          is_deleted: false
        },
        order: [['code', 'ASC']]
      });

      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('Get chart of accounts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chart of accounts',
        error: error.message
      });
    }
  }

  // Create manual journal entry
  static async createJournalEntry(req, res) {
    try {
      const { entry_number, transaction_date, description, lines } = req.body;

      if (!lines || lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 lines are required for a journal entry'
        });
      }

      const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Debit and credit must be equal'
        });
      }

      const journal = await JournalEntry.create({
        entry_number: entry_number || `JE-${Date.now()}`,
        tenant_id: req.user.tenant_id,
        reference_type: 'manual',
        transaction_date: new Date(transaction_date),
        description,
        status: 'draft',
        created_by: req.user.id
      });

      for (const line of lines) {
        await journal.addLine({
          account_id: line.account_id,
          description: line.description,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0
        });
      }

      res.status(201).json({
        success: true,
        message: 'Journal entry created successfully',
        data: journal
      });
    } catch (error) {
      console.error('Create journal entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create journal entry',
        error: error.message
      });
    }
  }

  // Post journal entry
  static async postJournalEntry(req, res) {
    try {
      const { id } = req.params;

      const journal = await JournalEntry.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!journal) {
        return res.status(404).json({
          success: false,
          message: 'Journal entry not found'
        });
      }

      if (journal.status === 'posted') {
        return res.status(400).json({
          success: false,
          message: 'Journal entry already posted'
        });
      }

      await journal.update({ status: 'posted', posted_at: new Date(), posted_by: req.user.id });

      res.json({
        success: true,
        message: 'Journal entry posted successfully',
        data: journal
      });
    } catch (error) {
      console.error('Post journal entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post journal entry',
        error: error.message
      });
    }
  }

  // Get trial balance
  static async getTrialBalance(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const accounts = await Account.findAll({
        where: { 
          tenant_id: req.user.tenant_id,
          is_deleted: false
        },
        include: [{
          model: JournalEntry,
          as: 'journal_lines',
          attributes: [],
          required: false,
          where: start_date && end_date ? {
            transaction_date: { [Op.between]: [new Date(start_date), new Date(end_date)] },
            status: 'posted'
          } : { status: 'posted' }
        }],
        attributes: [
          'id',
          'code',
          'name',
          'type',
          [require('sequelize').fn('SUM', require('sequelize').col('journal_lines.debit')), 'total_debit'],
          [require('sequelize').fn('SUM', require('sequelize').col('journal_lines.credit')), 'total_credit']
        ],
        group: ['Account.id']
      });

      const trialBalance = accounts.map(acc => ({
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        debit: parseFloat(acc.dataValues.total_debit) || 0,
        credit: parseFloat(acc.dataValues.total_credit) || 0,
        balance: (parseFloat(acc.dataValues.total_debit) || 0) - (parseFloat(acc.dataValues.total_credit) || 0)
      }));

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          accounts: trialBalance,
          total_debit: trialBalance.reduce((sum, acc) => sum + acc.debit, 0),
          total_credit: trialBalance.reduce((sum, acc) => sum + acc.credit, 0)
        }
      });
    } catch (error) {
      console.error('Get trial balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trial balance',
        error: error.message
      });
    }
  }

  // Get profit and loss report
  static async getProfitAndLoss(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const revenueAccounts = await Account.findAll({
        where: { 
          tenant_id: req.user.tenant_id,
          type: 'revenue',
          is_deleted: false
        }
      });

      const expenseAccounts = await Account.findAll({
        where: { 
          tenant_id: req.user.tenant_id,
          type: 'expense',
          is_deleted: false
        }
      });

      const calculateBalance = async (accounts) => {
        let total = 0;
        for (const acc of accounts) {
          const entries = await JournalEntry.findAll({
            where: {
              tenant_id: req.user.tenant_id,
              transaction_date: { [Op.between]: [new Date(start_date), new Date(end_date)] },
              status: 'posted'
            },
            include: [{
              model: require('../models').JournalLine,
              as: 'lines',
              where: { account_id: acc.id }
            }]
          });

          const balance = entries.reduce((sum, entry) => {
            const line = entry.lines[0];
            return sum + (line.credit - line.debit);
          }, 0);

          total += balance;
        }
        return total;
      };

      const totalRevenue = await calculateBalance(revenueAccounts);
      const totalExpense = await calculateBalance(expenseAccounts);

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          revenue: {
            accounts: revenueAccounts,
            total: totalRevenue
          },
          expenses: {
            accounts: expenseAccounts,
            total: totalExpense
          },
          net_profit: totalRevenue - totalExpense
        }
      });
    } catch (error) {
      console.error('Get P&L error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profit and loss',
        error: error.message
      });
    }
  }
}

module.exports = AccountingController;
