const { DataTypes } = require('sequelize');
const createBaseModel = require('./base');

// Product/Sparepart Model with stock valuation
module.exports = (sequelize) => {
  const Product = createBaseModel(sequelize, 'Product', {
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Stock Keeping Unit'
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'Barcode/QR code for scanning'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      field: 'category_id'
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('sparepart', 'consumable', 'tool', 'service_package'),
      defaultValue: 'sparepart'
    },
    // Pricing - Field-level security applied
    cost_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Harga beli - HIDDEN from cashier/mechanic'
    },
    selling_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Harga jual'
    },
    wholesale_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Harga grosir (optional)'
    },
    min_stock_level: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: 'Minimum stock threshold for alerts'
    },
    max_stock_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum stock level (optional)'
    },
    reorder_point: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'When to reorder'
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      field: 'supplier_id',
      comment: 'Primary supplier'
    },
    unit_of_measure: {
      type: DataTypes.STRING(20),
      defaultValue: 'pcs',
      comment: 'Unit: pcs, box, liter, kg, etc'
    },
    weight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Weight in kg'
    },
    dimensions: {
      type: DataTypes.JSONB,
      defaultValue: { length: null, width: null, height: null },
      comment: 'Dimensions in cm: {length, width, height}'
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of image URLs'
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Override default tax rate if needed'
    },
    // Stock tracking
    current_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current stock quantity'
    },
    reserved_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Stock reserved for pending orders'
    },
    available_stock: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.current_stock - this.reserved_stock;
      }
    },
    // Valuation
    valuation_method: {
      type: DataTypes.ENUM('fifo', 'lifo', 'average'),
      defaultValue: 'average',
      comment: 'Inventory valuation method'
    },
    average_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Average cost for valuation'
    },
    total_value: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.current_stock * this.average_cost;
      },
      comment: 'Total inventory value'
    },
    // Status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
      defaultValue: 'active'
    },
    is_trackable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether to track stock movements'
    },
    allow_backorder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional custom fields'
    }
  });

  return Product;
};
