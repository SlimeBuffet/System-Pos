const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Role Model with granular permissions
module.exports = (sequelize) => {
  const Role = createBaseModel(sequelize, 'Role', {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Module-level permissions
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Permission structure: { module: { create: bool, read: bool, update: bool, delete: bool } }'
    },
    // Field-level restrictions
    field_restrictions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Fields that this role cannot access: { model: [field1, field2] }'
    },
    // Data scope rules
    data_scope: {
      type: DataTypes.JSONB,
      defaultValue: { type: 'own_outlet' },
      comment: 'Data access scope: all, own_outlet, own_records, custom'
    },
    // Special capabilities
    capabilities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Special capabilities: [approve_transactions, override_prices, view_all_data, manage_users]'
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'System roles cannot be deleted'
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'For role hierarchy (higher can manage lower)'
    }
  });

  return Role;
};

// Default system roles - defined as a separate export to avoid ReferenceError
const defaultRoles = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Full system access across all tenants',
    permissions: { '*': { create: true, read: true, update: true, delete: true } },
    field_restrictions: {},
    data_scope: { type: 'all' },
    capabilities: ['all'],
    is_system_role: true,
    hierarchy_level: 100
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Full access within tenant',
    permissions: { '*': { create: true, read: true, update: true, delete: true } },
    field_restrictions: {},
    data_scope: { type: 'all' },
    capabilities: ['manage_users', 'manage_settings', 'view_reports'],
    is_system_role: true,
    hierarchy_level: 90
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Manage outlet operations',
    permissions: {
      work_orders: { create: true, read: true, update: true, delete: false },
      transactions: { create: true, read: true, update: true, delete: false },
      products: { create: true, read: true, update: true, delete: false },
      employees: { create: true, read: true, update: true, delete: false },
      reports: { read: true },
      customers: { create: true, read: true, update: true, delete: false }
    },
    field_restrictions: {
      transactions: ['profit_margin', 'cost_price'],
      reports: ['detailed_profit']
    },
    data_scope: { type: 'own_outlet' },
    capabilities: ['approve_refunds', 'override_discounts'],
    is_system_role: true,
    hierarchy_level: 80
  },
  {
    name: 'Kasir',
    slug: 'cashier',
    description: 'Point of sale operations',
    permissions: {
      transactions: { create: true, read: true, update: true, delete: false },
      work_orders: { create: true, read: true, update: false, delete: false },
      customers: { create: true, read: true, update: true, delete: false },
      products: { read: true },
      invoices: { create: true, read: true, print: true }
    },
    field_restrictions: {
      products: ['cost_price', 'profit_margin'],
      transactions: ['profit_margin', 'cost_price']
    },
    data_scope: { type: 'own_records' },
    capabilities: ['process_payments', 'issue_invoices'],
    is_system_role: true,
    hierarchy_level: 70
  },
  {
    name: 'Mekanik',
    slug: 'mechanic',
    description: 'Work order execution',
    permissions: {
      work_orders: { create: false, read: true, update: true, delete: false },
      vehicles: { read: true, update: true },
      customers: { read: true },
      products: { read: true }
    },
    field_restrictions: {
      work_orders: ['payment_status', 'discount'],
      transactions: ['*'] // No access to transactions
    },
    data_scope: { type: 'assigned_records' },
    capabilities: ['update_wo_status', 'add_wo_notes'],
    is_system_role: true,
    hierarchy_level: 60
  },
  {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access',
    permissions: {
      work_orders: { read: true },
      transactions: { read: true },
      products: { read: true },
      customers: { read: true },
      reports: { read: true }
    },
    field_restrictions: {
      products: ['cost_price', 'profit_margin'],
      transactions: ['profit_margin', 'cost_price', 'payment_details']
    },
    data_scope: { type: 'own_outlet' },
    capabilities: [],
    is_system_role: true,
    hierarchy_level: 50
  }
];

module.exports.defaultRoles = defaultRoles;
