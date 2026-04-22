const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Work Order Model - Core operational system
module.exports = (sequelize) => {
  const WorkOrder = createBaseModel(sequelize, 'WorkOrder', {
    wo_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'WO-YYYYMMDD-XXXX'
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      },
      field: 'customer_id'
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'vehicles',
        key: 'id'
      },
      field: 'vehicle_id'
    },
    outlet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'outlets',
        key: 'id'
      },
      field: 'outlet_id'
    },
    // Assignment
    mechanic_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Assigned mechanics (can be multiple)'
    },
    advisor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'advisor_id',
      comment: 'Service advisor who created the WO'
    },
    // Status tracking
    status: {
      type: DataTypes.ENUM(
        'draft',
        'checked_in',
        'waiting_approval',
        'in_progress',
        'waiting_parts',
        'quality_check',
        'completed',
        'ready_for_pickup',
        'delivered',
        'cancelled'
      ),
      defaultValue: 'draft'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    // Service details
    complaint: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Customer complaint/description of problem'
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mechanic diagnosis'
    },
    actions_taken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Work performed'
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional recommendations for customer'
    },
    // Time tracking
    estimated_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estimated_completion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actual_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actual_completion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    service_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Actual service time in minutes'
    },
    // Vehicle condition
    odometer_reading: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'KM reading at check-in'
    },
    fuel_level: {
      type: DataTypes.ENUM('empty', 'quarter', 'half', 'three_quarters', 'full'),
      allowNull: true
    },
    vehicle_condition: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Photos and notes of vehicle condition'
    },
    // Financials
    subtotal_parts: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    subtotal_labor: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    subtotal_other: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    discount_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    tax_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // Payment
    payment_status: {
      type: DataTypes.ENUM('unpaid', 'partial', 'paid', 'refunded'),
      defaultValue: 'unpaid'
    },
    paid_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // Additional info
    notes_internal: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes (not visible to customer)'
    },
    notes_customer: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes visible to customer'
    },
    warranty_claim: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    insurance_claim: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    next_service_reminder: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Auto-calculated next service date'
    },
    next_service_km: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'KM for next service reminder'
    },
    // Metadata
    source: {
      type: DataTypes.ENUM('walk_in', 'phone', 'whatsapp', 'web', 'app'),
      defaultValue: 'walk_in'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Customer rating 1-5'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  return WorkOrder;
};
