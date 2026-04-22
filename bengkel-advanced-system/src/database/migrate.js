const dbManager = require('./index');
const { initializeModels } = require('../models');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Initialize database connections
    await dbManager.initializeAll();

    // Get default connection and initialize models
    const sequelize = dbManager.getConnection('default');
    const models = initializeModels(sequelize);

    console.log('\n📋 Syncing models in correct order...');
    
    // Sync models in dependency order to avoid foreign key issues
    await sequelize.models.Tenant.sync({ alter: true });
    console.log('✅ Table tenants synced');
    
    await sequelize.models.Role.sync({ alter: true });
    console.log('✅ Table roles synced');
    
    await sequelize.models.Outlet.sync({ alter: true });
    console.log('✅ Table outlets synced');
    
    await sequelize.models.User.sync({ alter: true });
    console.log('✅ Table users synced');
    
    await sequelize.models.Product.sync({ alter: true });
    console.log('✅ Table products synced');
    
    await sequelize.models.WorkOrder.sync({ alter: true });
    console.log('✅ Table work_orders synced');
    
    await sequelize.models.Transaction.sync({ alter: true });
    console.log('✅ Table transactions synced');
    
    await sequelize.models.Account.sync({ alter: true });
    console.log('✅ Table accounts synced');
    
    await sequelize.models.JournalEntry.sync({ alter: true });
    console.log('✅ Table journal_entries synced');
    
    await sequelize.models.JournalLine.sync({ alter: true });
    console.log('✅ Table journal_lines synced');

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Database: bengkel_pos');
    console.log('📋 All tables have been created.\n');

    // Close connections
    await dbManager.closeAll();

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
