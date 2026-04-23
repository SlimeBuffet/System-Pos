const { Product, Category, Unit, Tenant } = require('../models');
const { Op } = require('sequelize');

class ProductController {
  // Get all products
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, search, category_id, low_stock, active } = req.query;
      const offset = (page - 1) * limit;

      const where = { 
        is_deleted: false,
        tenant_id: req.user.tenant_id
      };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { barcode: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (category_id) {
        where.category_id = category_id;
      }

      if (low_stock === 'true') {
        const minStockThreshold = 10;
        where.stock_qty = { [Op.lte]: minStockThreshold };
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const { count, rows } = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Unit,
            as: 'unit',
            attributes: ['id', 'name', 'symbol']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          products: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get products',
        error: error.message
      });
    }
  }

  // Get product by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
        where: { tenant_id: req.user.tenant_id },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Unit,
            as: 'unit',
            attributes: ['id', 'name', 'symbol']
          }
        ]
      });

      if (!product || product.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get product',
        error: error.message
      });
    }
  }

  // Create new product
  static async create(req, res) {
    try {
      const {
        name,
        sku,
        barcode,
        category_id,
        unit_id,
        purchase_price,
        selling_price,
        min_stock,
        description,
        images,
        tax_rate
      } = req.body;

      if (!name || !selling_price) {
        return res.status(400).json({
          success: false,
          message: 'Name and selling price are required'
        });
      }

      const existingProduct = await Product.findOne({
        where: { 
          sku, 
          tenant_id: req.user.tenant_id,
          is_deleted: false 
        }
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: 'SKU already exists'
        });
      }

      const product = await Product.create({
        name,
        sku,
        barcode,
        category_id,
        unit_id,
        purchase_price: parseFloat(purchase_price) || 0,
        selling_price: parseFloat(selling_price),
        stock_qty: 0,
        min_stock: parseInt(min_stock) || 10,
        description,
        images: images || [],
        tax_rate: tax_rate || 0,
        active: true,
        tenant_id: req.user.tenant_id,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    }
  }

  // Update product
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await Product.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!product || product.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      delete updateData.id;
      delete updateData.tenant_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      await product.update(updateData);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    }
  }

  // Delete product
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!product || product.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      await product.update({
        is_deleted: true,
        deleted_by: req.user.id,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message
      });
    }
  }

  // Update stock
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, type, reason } = req.body;

      if (!quantity || !type) {
        return res.status(400).json({
          success: false,
          message: 'Quantity and type are required'
        });
      }

      const product = await Product.findOne({
        where: { id, tenant_id: req.user.tenant_id }
      });

      if (!product || product.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      let newStock = product.stock_qty;
      if (type === 'in') {
        newStock += parseInt(quantity);
      } else if (type === 'out') {
        if (product.stock_qty < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock'
          });
        }
        newStock -= parseInt(quantity);
      } else if (type === 'set') {
        newStock = parseInt(quantity);
      }

      await product.update({ stock_qty: newStock });

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          product_id: id,
          old_stock: product.stock_qty,
          new_stock: newStock,
          adjustment: type === 'in' ? quantity : type === 'out' ? -quantity : 0
        }
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message
      });
    }
  }

  // Get low stock products
  static async getLowStock(req, res) {
    try {
      const products = await Product.findAll({
        where: {
          tenant_id: req.user.tenant_id,
          is_deleted: false,
          active: true,
          stock_qty: { [Op.lte]: require('sequelize').col('min_stock') }
        },
        order: [['stock_qty', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          products,
          count: products.length
        }
      });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get low stock products',
        error: error.message
      });
    }
  }
}

module.exports = ProductController;
