const jwt = require('jsonwebtoken');
const config = require('../config');
const dbManager = require('../database');

// Authentication middleware
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get tenant from header or token
    const tenantId = req.headers['x-tenant-id'] || decoded.tenant_id || 'default';
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role_id: decoded.role_id,
      tenant_id: tenantId,
      outlet_id: decoded.outlet_id
    };
    
    // Get database connection for tenant
    req.db = dbManager.getConnection(tenantId);
    req.tenantId = tenantId;
    
    if (!req.db) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant'
      });
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    next(error);
  }
}

// Role-based authorization middleware
function authorize(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const sequelize = req.db;
      const User = sequelize.models.User;
      const Role = sequelize.models.Role;

      // Get user with role
      const user = await User.findByPk(req.user.id, {
        include: [{ model: Role, as: 'role' }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if role is in allowed roles
      const roleName = user.role.slug;
      
      // Super admin can access everything
      if (roleName === 'super_admin') {
        return next();
      }

      if (!allowedRoles.includes(roleName)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Attach full user object
      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Field-level permission checker
function checkFieldPermission(modelName, field, action = 'read') {
  return async (req, res, next) => {
    try {
      if (!req.currentUser) {
        return next(); // Skip if no user (public endpoint)
      }

      const role = req.currentUser.role;
      
      // Super admin has all access
      if (role.slug === 'super_admin') {
        return next();
      }

      // Check field restrictions
      const fieldRestrictions = role.field_restrictions || {};
      const restrictedFields = fieldRestrictions[modelName] || [];

      // Check if field is restricted
      if (restrictedFields.includes('*') || restrictedFields.includes(field)) {
        return res.status(403).json({
          success: false,
          message: `Access denied to field: ${field}`
        });
      }

      // Check module-level permissions
      const permissions = role.permissions || {};
      const modulePerm = permissions[modelName];
      
      if (modulePerm && modulePerm[action] === false) {
        return res.status(403).json({
          success: false,
          message: `No ${action} permission for ${modelName}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Data scope filter - applies data isolation
function applyDataScope(req, modelName) {
  const user = req.currentUser;
  if (!user) return {};

  const role = user.role;
  const dataScope = role?.data_scope || { type: 'own_outlet' };
  let query = { tenant_id: user.tenant_id };

  switch (dataScope.type) {
    case 'all':
      // No filter needed - remove tenant filter for super admin
      delete query.tenant_id;
      break;
    
    case 'own_outlet':
      query.outlet_id = user.outlet_id;
      break;
    
    case 'own_records':
      query.created_by = user.id;
      break;
    
    case 'assigned_records':
      // Custom logic for assigned records
      break;
    
    case 'custom':
      // Apply custom scope rules
      if (dataScope.rules && dataScope.rules[modelName]) {
        query = { ...query, ...dataScope.rules[modelName] };
      }
      break;
  }

  // Always filter by tenant (except for super admin)
  if (!role?.slug || role.slug !== 'super_admin') {
    query.tenant_id = user.tenant_id;
  }

  return query;
}

// Tenant isolation middleware
function isolateTenant(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const tenantId = req.headers['x-tenant-id'] || req.user.tenant_id;
    
    // Ensure tenant matches user's tenant (unless super admin)
    if (req.user.role_slug !== 'super_admin' && tenantId !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access other tenants'
      });
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    next(error);
  }
}

// Capability checker
function requireCapability(capability) {
  return async (req, res, next) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const role = req.currentUser.role;
      
      // Super admin has all capabilities
      if (role.slug === 'super_admin') {
        return next();
      }

      const capabilities = role.capabilities || [];
      
      if (!capabilities.includes(capability) && !capabilities.includes('all')) {
        return res.status(403).json({
          success: false,
          message: `Missing required capability: ${capability}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticate,
  authorize,
  checkFieldPermission,
  applyDataScope,
  isolateTenant,
  requireCapability
};
