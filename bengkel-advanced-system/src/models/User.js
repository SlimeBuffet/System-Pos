const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// User Model with field-level permissions
module.exports = (sequelize) => {
  const User = createBaseModel(sequelize, 'User', {
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password'
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      field: 'role_id'
    },
    outlet_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'outlets',
        key: 'id'
      },
      field: 'outlet_id',
      comment: 'Branch/outlet assignment for multi-outlet support'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      },
      field: 'employee_id',
      comment: 'Link to employee record if applicable'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      defaultValue: 'pending'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Account lockout time after too many failed attempts'
    },
    // Field-level permissions override
    field_permissions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Field-level access control overrides (e.g., can_view_profit, can_edit_price)'
    },
    data_scope: {
      type: DataTypes.JSONB,
      defaultValue: { type: 'own_outlet' },
      comment: 'Data isolation rules: all, own_outlet, own_records, custom'
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    two_factor_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  });

  return User;
};
