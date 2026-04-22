const dbManager = require('./index');
const { sequelize } = require('../models');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Initialize database connections
    await dbManager.initializeAll();
    
    // Sync all models (creates tables)
    await dbManager.syncModels({ force: false });
    
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
