const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const dbManager = require('./database');
const eventSystem = require('./events');

// Import middleware
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth.routes');
// const tenantRoutes = require('./routes/tenants');
// const woRoutes = require('./routes/workOrders');
// const transactionRoutes = require('./routes/transactions');
// const productRoutes = require('./routes/products');
// const accountingRoutes = require('./routes/accounting');
// const hrRoutes = require('./routes/hr');
// const reportRoutes = require('./routes/reports');

class App {
  constructor() {
    this.app = express();
    this.port = config.port;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeEventListeners();
  }

  initializeMiddleware() {
    // Security headers
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors(config.cors));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests, please try again later'
      }
    });
    this.app.use('/api/', limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: config.upload.maxSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.upload.maxSize }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API versioning
    const apiV1 = express.Router();
    this.app.use('/api/v1', apiV1);

    // Public routes
    apiV1.use('/auth', authRoutes);

    // Protected routes
    // apiV1.use(authenticate);
    // apiV1.use('/tenants', tenantRoutes);
    // apiV1.use('/work-orders', woRoutes);
    // apiV1.use('/transactions', transactionRoutes);
    // apiV1.use('/products', productRoutes);
    // apiV1.use('/accounting', accountingRoutes);
    // apiV1.use('/hr', hrRoutes);
    // apiV1.use('/reports', reportRoutes);

    // API documentation
    apiV1.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Bengkel Advanced POS API v1',
        endpoints: {
          auth: '/api/v1/auth',
          tenants: '/api/v1/tenants',
          workOrders: '/api/v1/work-orders',
          transactions: '/api/v1/transactions',
          products: '/api/v1/products',
          accounting: '/api/v1/accounting',
          hr: '/api/v1/hr',
          reports: '/api/v1/reports'
        },
        documentation: '/api/docs'
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
  }

  initializeErrorHandling() {
    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Error:', err);

      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';

      res.status(statusCode).json({
        success: false,
        message,
        ...(config.nodeEnv === 'development' && { stack: err.stack })
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  initializeEventListeners() {
    // Global event listeners
    eventSystem.on('*.event', async (event) => {
      // Log all events to database for audit trail
      // This would be implemented with an EventLog model
      console.log(`📝 Event logged: ${event.name} at ${event.context.timestamp}`);
    });

    eventSystem.on('error', async (event) => {
      console.error('❌ Event system error:', event.error);
      // Alert admin
    });
  }

  async initializeDatabase() {
    try {
      await dbManager.initializeAll();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async start() {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 BENGKEL ADVANCED POS SYSTEM                       ║
║   Version: 2.0.0                                       ║
║   Environment: ${config.nodeEnv.padEnd(38)}║
║   Port: ${String(this.port).padEnd(45)}║
║   Tenant Mode: ${config.tenant.mode.padEnd(37)}║
╚════════════════════════════════════════════════════════╝
        `);
        console.log(`📡 Server running at http://localhost:${this.port}`);
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
        console.log(`📚 API docs: http://localhost:${this.port}/api/docs`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown() {
    console.log('\n🛑 Shutting down gracefully...');
    
    if (this.server) {
      this.server.close(async () => {
        console.log('🔒 HTTP server closed');
        
        // Close database connections
        await dbManager.closeAll();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// 🚀 START THE APPLICATION
const app = new App();
app.start().catch(err => {
  console.error('❌ Fatal error starting application:', err);
  process.exit(1);
});

module.exports = App;
