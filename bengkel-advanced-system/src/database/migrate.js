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

    console.log('\n📋 Syncing ALL models (force: true)...');
    
    // Sync ALL models at once with force to avoid order issues
    await sequelize.sync({ force: true });
    console.log('✅ All tables synced successfully!');

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
