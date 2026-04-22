const { Sequelize } = require('sequelize');
const config = require('../config');

// Multi-tenant connection manager
class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.defaultConnection = null;
  }

  // Create database connection
  createConnection(dbConfig, tenantId = 'default') {
    const sequelize = new Sequelize(
      dbConfig.name,
      dbConfig.user,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        pool: dbConfig.pool,
        logging: dbConfig.logging,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
          // Add tenant_id to all models for multi-tenant support
          indexes: [
            {
              fields: ['tenant_id'],
              name: `idx_${tenantId}_tenant`
            }
          ]
        }
      }
    );

    this.connections.set(tenantId, sequelize);
    
    if (tenantId === 'default') {
      this.defaultConnection = sequelize;
    }

    return sequelize;
  }

  // Get connection for tenant
  getConnection(tenantId = 'default') {
    return this.connections.get(tenantId) || this.defaultConnection;
  }

  // Initialize all connections
  async initializeAll() {
    const dbConfig = config.database;
    
    // Create default connection
    this.createConnection(dbConfig, 'default');
    
    // If multi-tenant mode, load all tenants and create connections
    if (config.tenant.mode === 'multi') {
      await this.loadTenantConnections();
    }
    
    // Test connections
    await this.testConnections();
    
    console.log('✅ Database connections initialized');
  }

  // Load tenant connections from database
  async loadTenantConnections() {
    try {
      // This will be called after Tenant model is defined
      const Tenant = require('../models/Tenant');
      const tenants = await Tenant.findAll({ where: { active: true } });
      
      for (const tenant of tenants) {
        const tenantDbConfig = {
          ...config.database,
          name: `${config.database.name}_${tenant.id}`
        };
        this.createConnection(tenantDbConfig, tenant.id);
      }
      
      console.log(`✅ Loaded ${tenants.length} tenant connections`);
    } catch (error) {
      console.log('⚠️  Could not load tenant connections (may not exist yet)');
    }
  }

  // Test all connections
  async testConnections() {
    for (const [tenantId, sequelize] of this.connections.entries()) {
      try {
        await sequelize.authenticate();
        console.log(`✅ Database connection established for tenant: ${tenantId}`);
      } catch (error) {
        console.error(`❌ Unable to connect to database for tenant ${tenantId}:`, error.message);
      }
    }
  }

  // Sync all models
  async syncModels(options = {}) {
    for (const [tenantId, sequelize] of this.connections.entries()) {
      await sequelize.sync(options);
      console.log(`✅ Models synced for tenant: ${tenantId}`);
    }
  }

  // Close all connections
  async closeAll() {
    for (const [tenantId, sequelize] of this.connections.entries()) {
      await sequelize.close();
      console.log(`🔒 Database connection closed for tenant: ${tenantId}`);
    }
    this.connections.clear();
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
