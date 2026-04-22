const { DataTypes } = require('sequelize');
const dbManager = require('../database');
const { v4: uuidv4 } = require('uuid');

// Base model factory with multi-tenant support and common fields
function createBaseModel(sequelize, modelName, attributes) {
  const model = sequelize.define(modelName, {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      // Don't auto-generate, will be set by application logic
      field: 'tenant_id'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by'
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted'
    },
    ...attributes
  }, {
    tableName: modelName.toLowerCase() + 's',
    indexes: [
      {
        fields: ['tenant_id'],
        name: `idx_${modelName.toLowerCase()}_tenant_${Date.now()}`,
        unique: false
      },
      {
        fields: ['is_deleted'],
        name: `idx_${modelName.toLowerCase()}_deleted_${Date.now()}`,
        unique: false
      }
    ],
    defaultScope: {
      where: {
        is_deleted: false
      }
    },
    scopes: {
      deleted: {
        where: {
          is_deleted: true
        }
      },
      all: {
        where: {}
      }
    }
  });

  return model;
}

module.exports = createBaseModel;
