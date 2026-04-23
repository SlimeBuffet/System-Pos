const { Tenant, Role } = require('../models');

class ConfigController {
  // Get tenant settings
  static async getTenantSettings(req, res) {
    try {
      const tenant = await Tenant.findByPk(req.user.tenant_id, {
        attributes: [
          'id', 'name', 'business_name', 'email', 'phone',
          'address', 'city', 'province', 'postal_code', 'country',
          'tax_id', 'currency', 'timezone', 'language',
          'subscription_plan', 'features', 'settings'
        ]
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        data: {
          company_info: {
            name: tenant.name,
            business_name: tenant.business_name,
            email: tenant.email,
            phone: tenant.phone,
            address: tenant.address,
            city: tenant.city,
            province: tenant.province,
            postal_code: tenant.postal_code,
            country: tenant.country,
            tax_id: tenant.tax_id
          },
          preferences: {
            currency: tenant.settings?.currency || 'IDR',
            timezone: tenant.settings?.timezone || 'Asia/Jakarta',
            language: tenant.settings?.language || 'id',
            date_format: tenant.settings?.date_format || 'DD/MM/YYYY',
            invoice_prefix: tenant.settings?.invoice_prefix || 'INV',
            wo_prefix: tenant.settings?.wo_prefix || 'WO'
          },
          features: tenant.features || {},
          subscription: {
            plan: tenant.subscription_plan,
            status: tenant.subscription_status,
            max_users: tenant.max_users,
            max_outlets: tenant.max_outlets
          }
        }
      });
    } catch (error) {
      console.error('Get tenant settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenant settings',
        error: error.message
      });
    }
  }

  // Update tenant settings
  static async updateTenantSettings(req, res) {
    try {
      const { company_info, preferences, features } = req.body;

      const tenant = await Tenant.findByPk(req.user.tenant_id);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const updateData = {};

      if (company_info) {
        Object.assign(updateData, company_info);
      }

      if (preferences) {
        const currentSettings = tenant.settings || {};
        updateData.settings = { ...currentSettings, ...preferences };
      }

      if (features && req.user.role?.name === 'Super Admin') {
        updateData.features = features;
      }

      await tenant.update(updateData);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: {
          company_info: {
            name: tenant.name,
            business_name: tenant.business_name,
            email: tenant.email,
            phone: tenant.phone
          },
          preferences: tenant.settings
        }
      });
    } catch (error) {
      console.error('Update tenant settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tenant settings',
        error: error.message
      });
    }
  }

  // Get system configuration (Super Admin only)
  static async getSystemConfig(req, res) {
    try {
      if (req.user.role?.name !== 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Super Admin only.'
        });
      }

      const config = {
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
          multi_tenant: true,
          multi_outlet: true,
          accounting: true,
          hr_payroll: true,
          reporting: true,
          api_access: true
        },
        limits: {
          max_file_size: '10MB',
          api_rate_limit: '1000/hour',
          session_timeout: '24h'
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Get system config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system configuration',
        error: error.message
      });
    }
  }

  // Get available roles
  static async getAvailableRoles(req, res) {
    try {
      const roles = await Role.findAll({
        where: { is_deleted: false },
        attributes: ['id', 'name', 'description', 'is_system']
      });

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get available roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available roles',
        error: error.message
      });
    }
  }

  // Get app metadata
  static async getAppMetadata(req, res) {
    try {
      const metadata = {
        app_name: 'Bengkel Advanced System',
        version: '1.0.0',
        build_date: new Date().toISOString(),
        api_version: 'v1',
        documentation_url: '/api/docs',
        support_email: 'support@bengkel.com'
      };

      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Get app metadata error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get app metadata',
        error: error.message
      });
    }
  }
}

module.exports = ConfigController;
