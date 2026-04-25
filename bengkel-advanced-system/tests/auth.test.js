/**
 * Test file untuk auth middleware
 */

// Mock config before requiring auth module
jest.mock('../src/config', () => ({
  port: 3000,
  nodeEnv: 'test',
  jwt: {
    secret: 'test-secret-key',
    expiresIn: '7d',
    issuer: 'bengkel-pos-system'
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'bengkel_test',
    user: 'postgres',
    password: '',
    dialect: 'postgres'
  },
  tenant: {
    mode: 'single',
    defaultTenant: 'default'
  }
}));

// Mock database
jest.mock('../src/database', () => ({
  getConnection: jest.fn(() => null)
}));

const { 
  applyDataScope,
  authorize 
} = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  
  describe('applyDataScope function', () => {
    
    test('harus mengembalikan object kosong jika user tidak ada', () => {
      const req = { currentUser: null };
      const result = applyDataScope(req, 'User');
      expect(result).toEqual({});
    });

    test('harus mengembalikan tenant_id jika user ada tapi bukan super_admin', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          role: { slug: 'admin' }
        }
      };
      const result = applyDataScope(req, 'User');
      expect(result).toHaveProperty('tenant_id', 'tenant-1');
    });

    test('tidak boleh mengembalikan tenant_id jika role adalah super_admin dengan type all', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          outlet_id: 'outlet-1',
          role: { 
            slug: 'super_admin',
            data_scope: { type: 'all' }
          }
        }
      };
      const result = applyDataScope(req, 'User');
      expect(result).not.toHaveProperty('tenant_id');
    });

    test('harus mengembalikan outlet_id untuk type own_outlet', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          outlet_id: 'outlet-1',
          role: { 
            slug: 'manager',
            data_scope: { type: 'own_outlet' }
          }
        }
      };
      const result = applyDataScope(req, 'WorkOrder');
      expect(result).toHaveProperty('outlet_id', 'outlet-1');
      expect(result).toHaveProperty('tenant_id', 'tenant-1');
    });

    test('harus mengembalikan created_by untuk type own_records', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          role: { 
            slug: 'mechanic',
            data_scope: { type: 'own_records' }
          }
        }
      };
      const result = applyDataScope(req, 'WorkOrder');
      expect(result).toHaveProperty('created_by', 'user-1');
      expect(result).toHaveProperty('tenant_id', 'tenant-1');
    });

    test('harus menggunakan default data_scope jika tidak ada', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          role: {}
        }
      };
      const result = applyDataScope(req, 'User');
      expect(result).toHaveProperty('tenant_id');
    });

    test('harus menerapkan custom scope rules untuk type custom', () => {
      const req = {
        currentUser: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          role: { 
            slug: 'manager',
            data_scope: { 
              type: 'custom',
              rules: {
                WorkOrder: { status: 'pending' }
              }
            }
          }
        }
      };
      const result = applyDataScope(req, 'WorkOrder');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('tenant_id', 'tenant-1');
    });
  });

  describe('authorize function', () => {
    
    test('harus mengembalikan 401 jika user tidak ada', async () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = authorize('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});