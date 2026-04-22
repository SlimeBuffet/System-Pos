const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Outlet/Branch Model for multi-outlet support
module.exports = (sequelize) => {
  const Outlet = createBaseModel(sequelize, 'Outlet', {
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('headquarters', 'branch', 'warehouse'),
      defaultValue: 'branch'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    province: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    postal_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Indonesia'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    manager_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'manager_id'
    },
    operating_hours: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { open: '08:00', close: '17:00', is_open: true },
        tuesday: { open: '08:00', close: '17:00', is_open: true },
        wednesday: { open: '08:00', close: '17:00', is_open: true },
        thursday: { open: '08:00', close: '17:00', is_open: true },
        friday: { open: '08:00', close: '17:00', is_open: true },
        saturday: { open: '08:00', close: '15:00', is_open: true },
        sunday: { open: null, close: null, is_open: false }
      }
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Outlet-specific settings'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    opened_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  return Outlet;
};
