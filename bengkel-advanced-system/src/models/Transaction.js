const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Transaction Model - POS system with full accounting integration
module.exports = (sequelize) => {
  const Transaction = createBaseModel(sequelize, 'Transaction', {
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'INV-YYYYMMDD-XXXX'
    },
    wo_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'work_orders',
        key: 'id'
      },
      field: 'wo_id',
      comment: 'Linked work order if applicable'
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
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      },
      field: 'customer_id'
    },
    cashier_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'cashier_id'
    },
    // Transaction type
    type: {
      type: DataTypes.ENUM('sale', 'refund', 'void'),
      defaultValue: 'sale'
    },
    status: {
      type: DataTypes.ENUM('draft', 'completed', 'cancelled', 'refunded'),
      defaultValue: 'draft'
    },
    // Items summary
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    discount_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 11
    },
    tax_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // Cost tracking for profit calculation
    total_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Total cost of goods sold - HIDDEN from cashier'
    },
    profit_margin: {
      type: DataTypes.VIRTUAL,
      get() {
        const total = parseFloat(this.total_amount) || 0;
        const cost = parseFloat(this.total_cost) || 0;
        return ((total - cost) / total * 100).toFixed(2);
      },
      comment: 'Profit margin percentage - HIDDEN from cashier'
    },
    profit_amount: {
      type: DataTypes.VIRTUAL,
      get() {
        const total = parseFloat(this.total_amount) || 0;
        const cost = parseFloat(this.total_cost) || 0;
        return (total - cost).toFixed(2);
      },
      comment: 'Profit amount - HIDDEN from cashier'
    },
    // Payment details
    payment_method: {
      type: DataTypes.ENUM('cash', 'transfer', 'qris', 'credit_card', 'debit_card', 'split'),
      defaultValue: 'cash'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
      defaultValue: 'pending'
    },
    amount_paid: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    change_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // Split payment details
    split_payments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of {method, amount} for split payments'
    },
    // Credit/DP
    is_credit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    credit_due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dp_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Down payment'
    },
    balance_due: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // References
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Transfer reference, card number last 4 digits, etc'
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Shift tracking
    shift_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'shifts',
        key: 'id'
      },
      field: 'shift_id'
    },
    // Notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Receipt
    receipt_printed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    receipt_sent_via: {
      type: DataTypes.ENUM('none', 'whatsapp', 'email', 'both'),
      defaultValue: 'none'
    },
    // Metadata
    source: {
      type: DataTypes.ENUM('pos', 'online', 'mobile'),
      defaultValue: 'pos'
    },
    device_info: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Device/browser info for audit'
    }
  });

  return Transaction;
};
