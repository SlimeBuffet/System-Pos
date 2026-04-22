const dbManager = require('../database');
const config = require('../config');
const { Sequelize } = require('sequelize');

// Import model factories
const TenantModel = require('./Tenant');
const UserModel = require('./User');
const RoleModel = require('./Role');
const OutletModel = require('./Outlet');
const ProductModel = require('./Product');
const WorkOrderModel = require('./WorkOrder');
const TransactionModel = require('./Transaction');
const JournalEntryModel = require('./JournalEntry');
const AccountModel = require('./Account');

// Model registry
const models = {};

// Initialize all models for a given sequelize instance
function initializeModels(sequelize) {
  // Check if already initialized
  if (sequelize && sequelize.models && sequelize.models.Tenant) {
    return sequelize.models;
  }
  
  const models = {
    Tenant: TenantModel(sequelize),
    User: UserModel(sequelize),
    Role: RoleModel(sequelize),
    Outlet: OutletModel(sequelize),
    Product: ProductModel(sequelize),
    WorkOrder: WorkOrderModel(sequelize),
    Transaction: TransactionModel(sequelize),
    JournalEntry: JournalEntryModel(sequelize),
    Account: AccountModel(sequelize),
    JournalLine: JournalEntryModel.createJournalLineModel(sequelize)
  };

  // Define associations
  defineAssociations(models);

  return models;
}

// Define model relationships
function defineAssociations(models) {
  // Tenant associations
  models.Tenant.hasMany(models.User, { foreignKey: 'tenant_id', as: 'users' });
  models.Tenant.hasMany(models.Outlet, { foreignKey: 'tenant_id', as: 'outlets' });
  models.Tenant.hasMany(models.Role, { foreignKey: 'tenant_id', as: 'roles' });

  // User associations
  models.User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
  models.User.belongsTo(models.Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
  models.User.hasMany(models.WorkOrder, { foreignKey: 'advisor_id', as: 'advisedWorkOrders' });
  models.User.hasMany(models.Transaction, { foreignKey: 'cashier_id', as: 'transactions' });

  // Role associations
  models.Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });

  // Outlet associations
  models.Outlet.belongsTo(models.User, { foreignKey: 'manager_id', as: 'manager' });
  models.Outlet.hasMany(models.WorkOrder, { foreignKey: 'outlet_id', as: 'workOrders' });
  models.Outlet.hasMany(models.Transaction, { foreignKey: 'outlet_id', as: 'transactions' });
  models.Outlet.hasMany(models.JournalEntry, { foreignKey: 'outlet_id', as: 'journalEntries' });

  // Product associations
  models.Product.belongsTo(models.Outlet, { foreignKey: 'outlet_id', as: 'outlet' });

  // Work Order associations
  models.WorkOrder.belongsTo(models.Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
  models.WorkOrder.hasMany(models.Transaction, { foreignKey: 'wo_id', as: 'transactions' });

  // Transaction associations
  models.Transaction.belongsTo(models.WorkOrder, { foreignKey: 'wo_id', as: 'workOrder' });
  models.Transaction.belongsTo(models.Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
  models.Transaction.hasMany(models.JournalEntry, { 
    foreignKey: 'reference_id', 
    as: 'journalEntries',
    constraints: false,
    scope: { reference_type: 'transaction' }
  });

  // Accounting associations
  models.JournalEntry.belongsTo(models.Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
  models.JournalEntry.hasMany(models.JournalLine, { foreignKey: 'journal_entry_id', as: 'lines' });
  models.JournalLine.belongsTo(models.JournalEntry, { foreignKey: 'journal_entry_id', as: 'journalEntry' });
  models.JournalLine.belongsTo(models.Account, { foreignKey: 'account_id', as: 'account' });
  models.Account.hasMany(models.JournalLine, { foreignKey: 'account_id', as: 'journalLines' });
  models.Account.belongsTo(models.Account, { foreignKey: 'parent_id', as: 'parentAccount' });
  models.Account.hasMany(models.Account, { foreignKey: 'parent_id', as: 'childAccounts' });
}

// Get models for current tenant
function getModels(tenantId = 'default') {
  const sequelize = dbManager.getConnection(tenantId);
  
  if (!sequelize) {
    throw new Error(`No database connection found for tenant: ${tenantId}`);
  }

  // Check if models already initialized for this connection
  if (!sequelize.models || !sequelize.models.Tenant) {
    return initializeModels(sequelize);
  }

  return sequelize.models;
}

// Create default sequelize instance if not exists
let defaultModels;
try {
  const defaultConnection = dbManager.getConnection('default');
  if (defaultConnection) {
    defaultModels = initializeModels(defaultConnection);
  }
} catch (error) {
  console.log('⚠️  Could not initialize default models (database may not be connected yet)');
  defaultModels = {};
}

module.exports = {
  ...defaultModels,
  initializeModels,
  getModels,
  defineAssociations
};
