const dbManager = require('./index');
const { getModels } = require('../models');
const bcrypt = require('bcryptjs');

async function runSeed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Initialize database connections
    await dbManager.initializeAll();

    const models = getModels('default');
    const { Tenant, Role, User, Outlet, Account } = models;

    // Create default tenant if not exists
    console.log('📋 Creating default tenant...');
    const [tenant, created] = await Tenant.findOrCreate({
      where: { id: 'default' },
      defaults: {
        name: 'Default Bengkel',
        code: 'DEFAULT',
        active: true,
        config: {
          currency: 'IDR',
          timezone: 'Asia/Jakarta',
          taxRate: 11
        }
      }
    });
    console.log(created ? '✅ Created default tenant' : '✓ Default tenant exists');

    // Create roles
    console.log('\n👥 Creating roles...');
    const roles = [
      { name: 'Super Admin', code: 'SUPER_ADMIN', level: 100 },
      { name: 'Admin', code: 'ADMIN', level: 90 },
      { name: 'Manager', code: 'MANAGER', level: 80 },
      { name: 'Kasir', code: 'CASHIER', level: 50 },
      { name: 'Mekanik', code: 'MECHANIC', level: 30 },
      { name: 'Viewer', code: 'VIEWER', level: 10 }
    ];

    for (const roleData of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { tenant_id: tenant.id, code: roleData.code },
        defaults: {
          ...roleData,
          tenant_id: tenant.id,
          permissions: getDefaultPermissions(roleData.code)
        }
      });
      console.log(created ? `✅ Created role: ${role.name}` : `✓ Role exists: ${role.name}`);
    }

    // Create default admin user
    console.log('\n👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@bengkel.com' },
      defaults: {
        tenant_id: tenant.id,
        name: 'Administrator',
        email: 'admin@bengkel.com',
        password: hashedPassword,
        role_id: (await Role.findOne({ where: { code: 'SUPER_ADMIN', tenant_id: tenant.id } })).id,
        active: true
      }
    });
    console.log(adminCreated ? '✅ Created admin user' : '✓ Admin user exists');
    console.log('   Email: admin@bengkel.com');
    console.log('   Password: admin123');

    // Create default outlet
    console.log('\n🏪 Creating default outlet...');
    const [outlet, outletCreated] = await Outlet.findOrCreate({
      where: { tenant_id: tenant.id, code: 'MAIN' },
      defaults: {
        tenant_id: tenant.id,
        name: 'Main Workshop',
        code: 'MAIN',
        address: 'Jl. Raya Utama No. 1',
        phone: '021-1234567',
        active: true
      }
    });
    console.log(outletCreated ? '✅ Created default outlet' : '✓ Default outlet exists');

    // Create chart of accounts
    console.log('\n📊 Creating chart of accounts...');
    await createChartOfAccounts(tenant.id);
    console.log('✅ Chart of accounts created');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@bengkel.com');
    console.log('   Password: admin123\n');

    // Close connections
    await dbManager.closeAll();

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

function getDefaultPermissions(roleCode) {
  const permissions = {
    SUPER_ADMIN: {
      dashboard: 'full',
      work_orders: 'full',
      transactions: 'full',
      inventory: 'full',
      customers: 'full',
      suppliers: 'full',
      reports: 'full',
      settings: 'full',
      users: 'full',
      accounting: 'full',
      can_approve: true,
      can_delete: true,
      can_export: true
    },
    ADMIN: {
      dashboard: 'full',
      work_orders: 'full',
      transactions: 'full',
      inventory: 'full',
      customers: 'full',
      suppliers: 'full',
      reports: 'full',
      settings: 'edit',
      users: 'edit',
      accounting: 'full',
      can_approve: true,
      can_delete: true,
      can_export: true
    },
    MANAGER: {
      dashboard: 'view',
      work_orders: 'full',
      transactions: 'full',
      inventory: 'full',
      customers: 'full',
      suppliers: 'full',
      reports: 'full',
      settings: 'view',
      users: 'view',
      accounting: 'view',
      can_approve: true,
      can_delete: false,
      can_export: true
    },
    CASHIER: {
      dashboard: 'view',
      work_orders: 'view',
      transactions: 'full',
      inventory: 'view',
      customers: 'edit',
      suppliers: 'none',
      reports: 'view',
      settings: 'none',
      users: 'none',
      accounting: 'none',
      can_approve: false,
      can_delete: false,
      can_export: false
    },
    MECHANIC: {
      dashboard: 'view',
      work_orders: 'full',
      transactions: 'none',
      inventory: 'view',
      customers: 'view',
      suppliers: 'none',
      reports: 'none',
      settings: 'none',
      users: 'none',
      accounting: 'none',
      can_approve: false,
      can_delete: false,
      can_export: false
    },
    VIEWER: {
      dashboard: 'view',
      work_orders: 'view',
      transactions: 'view',
      inventory: 'view',
      customers: 'view',
      suppliers: 'view',
      reports: 'view',
      settings: 'none',
      users: 'none',
      accounting: 'none',
      can_approve: false,
      can_delete: false,
      can_export: false
    }
  };

  return permissions[roleCode] || permissions.VIEWER;
}

async function createChartOfAccounts(tenantId) {
  const accounts = [
    // Assets (1-)
    { code: '1000', name: 'Assets', type: 'ASSET', category: 'ASSET' },
    { code: '1100', name: 'Current Assets', type: 'ASSET', category: 'ASSET', parent_code: '1000' },
    { code: '1101', name: 'Cash', type: 'ASSET', category: 'ASSET', parent_code: '1100' },
    { code: '1102', name: 'Bank', type: 'ASSET', category: 'ASSET', parent_code: '1100' },
    { code: '1103', name: 'Petty Cash', type: 'ASSET', category: 'ASSET', parent_code: '1100' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', category: 'ASSET', parent_code: '1100' },
    { code: '1300', name: 'Inventory', type: 'ASSET', category: 'ASSET', parent_code: '1100' },
    { code: '1500', name: 'Fixed Assets', type: 'ASSET', category: 'ASSET', parent_code: '1000' },
    { code: '1501', name: 'Equipment', type: 'ASSET', category: 'ASSET', parent_code: '1500' },
    { code: '1502', name: 'Vehicles', type: 'ASSET', category: 'ASSET', parent_code: '1500' },
    
    // Liabilities (2-)
    { code: '2000', name: 'Liabilities', type: 'LIABILITY', category: 'LIABILITY' },
    { code: '2100', name: 'Current Liabilities', type: 'LIABILITY', category: 'LIABILITY', parent_code: '2000' },
    { code: '2101', name: 'Accounts Payable', type: 'LIABILITY', category: 'LIABILITY', parent_code: '2100' },
    { code: '2102', name: 'Accrued Expenses', type: 'LIABILITY', category: 'LIABILITY', parent_code: '2100' },
    { code: '2200', name: 'Long-term Liabilities', type: 'LIABILITY', category: 'LIABILITY', parent_code: '2000' },
    
    // Equity (3-)
    { code: '3000', name: 'Equity', type: 'EQUITY', category: 'EQUITY' },
    { code: '3100', name: 'Owner\'s Equity', type: 'EQUITY', category: 'EQUITY', parent_code: '3000' },
    { code: '3200', name: 'Retained Earnings', type: 'EQUITY', category: 'EQUITY', parent_code: '3000' },
    
    // Revenue (4-)
    { code: '4000', name: 'Revenue', type: 'REVENUE', category: 'REVENUE' },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE', category: 'REVENUE', parent_code: '4000' },
    { code: '4101', name: 'Labor Income', type: 'REVENUE', category: 'REVENUE', parent_code: '4100' },
    { code: '4102', name: 'Parts Sales', type: 'REVENUE', category: 'REVENUE', parent_code: '4100' },
    { code: '4200', name: 'Other Income', type: 'REVENUE', category: 'REVENUE', parent_code: '4000' },
    
    // Expenses (5-)
    { code: '5000', name: 'Expenses', type: 'EXPENSE', category: 'EXPENSE' },
    { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5000' },
    { code: '5101', name: 'Parts Cost', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5100' },
    { code: '5200', name: 'Operating Expenses', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5000' },
    { code: '5201', name: 'Salaries & Wages', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5200' },
    { code: '5202', name: 'Rent Expense', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5200' },
    { code: '5203', name: 'Utilities', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5200' },
    { code: '5204', name: 'Office Supplies', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5200' },
    { code: '5205', name: 'Marketing', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5200' },
    { code: '5300', name: 'Depreciation', type: 'EXPENSE', category: 'EXPENSE', parent_code: '5000' }
  ];

  for (const accountData of accounts) {
    await Account.findOrCreate({
      where: { tenant_id: tenantId, code: accountData.code },
      defaults: {
        ...accountData,
        tenant_id: tenantId,
        balance: 0,
        active: true
      }
    });
  }
}

runSeed();
