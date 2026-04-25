const { DataTypes } = require('sequelize');
const dbManager = require('../database');
const createBaseModel = require('./base');

// Tenant Model - For multi-tenant architecture
module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Tenant tidak perlu tenant_id karena dia root entity
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    business_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    business_type: {
      type: DataTypes.ENUM('workshop', 'garage', 'service_center'),
      defaultValue: 'workshop'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    province: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Indonesia'
    },
    tax_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'NPWP for Indonesian businesses'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    subscription_plan: {
      type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free'
    },
    subscription_status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'cancelled'),
      defaultValue: 'active'
    },
    subscription_start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscription_end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    max_users: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    max_outlets: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Enabled features per tenant'
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Tenant-specific settings (tax, currency, etc)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    database_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Separate database name if using database-per-tenant'
    }
  });

  return Tenant;
};
