const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Accounting Journal Entry - Core of financial system
module.exports = (sequelize) => {
  const JournalEntry = createBaseModel(sequelize, 'JournalEntry', {
    entry_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'JE-YYYYMMDD-XXXX'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    outlet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'outlets',
        key: 'id'
      },
      field: 'outlet_id'
    },
    // Reference to source document
    reference_type: {
      type: DataTypes.ENUM(
        'transaction',
        'payment',
        'expense',
        'payroll',
        'adjustment',
        'opening_balance',
        'closing_entry'
      ),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the source document'
    },
    reference_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Human-readable reference (invoice number, etc)'
    },
    // Entry details
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    entry_type: {
      type: DataTypes.ENUM('manual', 'auto'),
      defaultValue: 'auto',
      comment: 'Whether created manually or automatically'
    },
    is_posted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether entry has been posted to ledger'
    },
    posted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    posted_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'posted_by'
    },
    // Balance verification
    total_debit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_credit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    is_balanced: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Debit must equal credit'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'IDR'
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(15, 6),
      defaultValue: 1
    },
    // Additional info
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachment_urls: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Receipts, invoices, etc'
    },
    fiscal_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'For financial reporting'
    },
    fiscal_period: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Month 1-12'
    }
  });

  return JournalEntry;
};

// Journal Entry Lines (separate table for multiple debits/credits)
module.exports.createJournalLineModel = (sequelize) => {
  const JournalLine = createBaseModel(sequelize, 'JournalLine', {
    journal_entry_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'journal_entries',
        key: 'id'
      },
      field: 'journal_entry_id'
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      },
      field: 'account_id',
      comment: 'Chart of accounts'
    },
    account_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Account code for quick reference'
    },
    account_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Account name snapshot'
    },
    debit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    credit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cost_center_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'For departmental accounting'
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'For project-based tracking'
    },
    tax_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Tax classification if applicable'
    },
    tax_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    }
  });

  return JournalLine;
};
