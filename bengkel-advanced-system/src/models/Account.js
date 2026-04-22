const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Chart of Accounts - Standard accounting structure
module.exports = (sequelize) => {
  const Account = createBaseModel(sequelize, 'Account', {
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Account code (e.g., 1-1000)'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name_en: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'English name for international reporting'
    },
    // Account classification
    account_type: {
      type: DataTypes.ENUM(
        'asset',
        'liability',
        'equity',
        'revenue',
        'expense'
      ),
      allowNull: false
    },
    account_subtype: {
      type: DataTypes.ENUM(
        // Assets
        'current_asset',
        'fixed_asset',
        'non_current_asset',
        'cash_and_equivalents',
        'accounts_receivable',
        'inventory',
        // Liabilities
        'current_liability',
        'long_term_liability',
        'accounts_payable',
        // Equity
        'owner_equity',
        'retained_earnings',
        // Revenue
        'operating_revenue',
        'other_income',
        // Expenses
        'cost_of_goods_sold',
        'operating_expense',
        'selling_expense',
        'administrative_expense',
        'other_expense'
      ),
      allowNull: false
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'accounts',
        key: 'id'
      },
      field: 'parent_id',
      comment: 'For hierarchical chart of accounts'
    },
    // Normal balance
    normal_balance: {
      type: DataTypes.ENUM('debit', 'credit'),
      allowNull: false,
      defaultValue: 'debit',
      comment: 'Debit for assets/expenses, Credit for liabilities/equity/revenue'
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_system_account: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'System accounts cannot be deleted'
    },
    allow_manual_entry: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether users can create manual journal entries'
    },
    // Tax
    is_taxable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    tax_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // Reporting
    report_category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Category for financial statements'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Description
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  return Account;
};

// Default Chart of Accounts for Indonesian bengkel - defined as separate export
const defaultAccounts = [
  // ASSETS (1-)
  { code: '1-1000', name: 'Kas dan Setara Kas', account_type: 'asset', account_subtype: 'cash_and_equivalents', normal_balance: 'debit', is_system_account: true },
  { code: '1-1001', name: 'Kas Kecil', account_type: 'asset', account_subtype: 'cash_and_equivalents', parent_code: '1-1000', normal_balance: 'debit', is_system_account: true },
  { code: '1-1002', name: 'Kas di Tangan', account_type: 'asset', account_subtype: 'cash_and_equivalents', parent_code: '1-1000', normal_balance: 'debit', is_system_account: true },
  { code: '1-1100', name: 'Bank', account_type: 'asset', account_subtype: 'cash_and_equivalents', normal_balance: 'debit', is_system_account: true },
  { code: '1-1101', name: 'Bank BCA', account_type: 'asset', account_subtype: 'cash_and_equivalents', parent_code: '1-1100', normal_balance: 'debit' },
  { code: '1-1102', name: 'Bank Mandiri', account_type: 'asset', account_subtype: 'cash_and_equivalents', parent_code: '1-1100', normal_balance: 'debit' },
  { code: '1-1200', name: 'Piutang Usaha', account_type: 'asset', account_subtype: 'accounts_receivable', normal_balance: 'debit', is_system_account: true },
  { code: '1-1300', name: 'Persediaan Suku Cadang', account_type: 'asset', account_subtype: 'inventory', normal_balance: 'debit', is_system_account: true },
  { code: '1-2000', name: 'Aset Tetap', account_type: 'asset', account_subtype: 'fixed_asset', normal_balance: 'debit', is_system_account: true },
  { code: '1-2001', name: 'Peralatan Bengkel', account_type: 'asset', account_subtype: 'fixed_asset', parent_code: '1-2000', normal_balance: 'debit' },
  { code: '1-2002', name: 'Kendaraan Operasional', account_type: 'asset', account_subtype: 'fixed_asset', parent_code: '1-2000', normal_balance: 'debit' },
  { code: '1-2003', name: 'Akumulasi Penyusutan', account_type: 'asset', account_subtype: 'fixed_asset', parent_code: '1-2000', normal_balance: 'credit' },
  
  // LIABILITIES (2-)
  { code: '2-1000', name: 'Utang Usaha', account_type: 'liability', account_subtype: 'accounts_payable', normal_balance: 'credit', is_system_account: true },
  { code: '2-1001', name: 'Utang Supplier', account_type: 'liability', account_subtype: 'accounts_payable', parent_code: '2-1000', normal_balance: 'credit' },
  { code: '2-1100', name: 'Biaya yang Masih Harus Dibayar', account_type: 'liability', account_subtype: 'current_liability', normal_balance: 'credit' },
  { code: '2-1200', name: 'Pendapatan Diterima Dimuka', account_type: 'liability', account_subtype: 'current_liability', normal_balance: 'credit' },
  { code: '2-2000', name: 'Utang Jangka Panjang', account_type: 'liability', account_subtype: 'long_term_liability', normal_balance: 'credit' },
  
  // EQUITY (3-)
  { code: '3-1000', name: 'Modal Disetor', account_type: 'equity', account_subtype: 'owner_equity', normal_balance: 'credit', is_system_account: true },
  { code: '3-1100', name: 'Laba Ditahan', account_type: 'equity', account_subtype: 'retained_earnings', normal_balance: 'credit', is_system_account: true },
  { code: '3-1200', name: 'Laba Berjalan', account_type: 'equity', account_subtype: 'retained_earnings', normal_balance: 'credit', is_system_account: true },
  { code: '3-1300', name: 'Prive', account_type: 'equity', account_subtype: 'owner_equity', normal_balance: 'debit' },
  
  // REVENUE (4-)
  { code: '4-1000', name: 'Penjualan Suku Cadang', account_type: 'revenue', account_subtype: 'operating_revenue', normal_balance: 'credit', is_system_account: true },
  { code: '4-1100', name: 'Pendapatan Jasa Servis', account_type: 'revenue', account_subtype: 'operating_revenue', normal_balance: 'credit', is_system_account: true },
  { code: '4-1200', name: 'Pendapatan Lain-lain', account_type: 'revenue', account_subtype: 'other_income', normal_balance: 'credit' },
  
  // COST OF GOODS SOLD (5-)
  { code: '5-1000', name: 'Harga Pokok Penjualan', account_type: 'expense', account_subtype: 'cost_of_goods_sold', normal_balance: 'debit', is_system_account: true },
  { code: '5-1001', name: 'HPP Suku Cadang', account_type: 'expense', account_subtype: 'cost_of_goods_sold', parent_code: '5-1000', normal_balance: 'debit', is_system_account: true },
  
  // OPERATING EXPENSES (6-)
  { code: '6-1000', name: 'Beban Gaji Karyawan', account_type: 'expense', account_subtype: 'operating_expense', normal_balance: 'debit', is_system_account: true },
  { code: '6-1001', name: 'Beban Bonus Karyawan', account_type: 'expense', account_subtype: 'operating_expense', parent_code: '6-1000', normal_balance: 'debit' },
  { code: '6-1100', name: 'Beban Listrik dan Air', account_type: 'expense', account_subtype: 'operating_expense', normal_balance: 'debit' },
  { code: '6-1200', name: 'Beban Sewa', account_type: 'expense', account_subtype: 'operating_expense', normal_balance: 'debit' },
  { code: '6-1300', name: 'Beban Pemeliharaan', account_type: 'expense', account_subtype: 'operating_expense', normal_balance: 'debit' },
  { code: '6-1400', name: 'Beban Pemasaran', account_type: 'expense', account_subtype: 'selling_expense', normal_balance: 'debit' },
  { code: '6-1500', name: 'Beban Administrasi', account_type: 'expense', account_subtype: 'administrative_expense', normal_balance: 'debit' },
  { code: '6-1600', name: 'Beban Penyusutan', account_type: 'expense', account_subtype: 'operating_expense', normal_balance: 'debit' },
  { code: '6-1900', name: 'Beban Lain-lain', account_type: 'expense', account_subtype: 'other_expense', normal_balance: 'debit' }
];

module.exports.defaultAccounts = defaultAccounts;
