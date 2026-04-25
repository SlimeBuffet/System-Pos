const path = require('path');
require('dotenv').config();

module.exports = {
  // Server Configuration
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'bengkel_pos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    issuer: 'bengkel-pos-system'
  },
  
  // Multi-Tenant Configuration
  tenant: {
    mode: process.env.TENANT_MODE || 'single', // 'single' or 'multi'
    defaultTenant: 'default'
  },
  
  // AI Configuration
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || null,
    enabled: !!process.env.OPENAI_API_KEY
  },
  
  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: process.env.BACKUP_INTERVAL || 'daily',
    path: process.env.BACKUP_PATH || './backups'
  },
  
  // File Upload Configuration
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    path: './uploads'
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret'
  },
  
  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@bengkelpos.com'
  },
  
  // WhatsApp Configuration
  whatsapp: {
    apiKey: process.env.WHATSAPP_API_KEY || null,
    enabled: !!process.env.WHATSAPP_API_KEY
  },
  
  // Tax Configuration
  tax: {
    enabled: process.env.TAX_ENABLED === 'true',
    defaultRate: parseFloat(process.env.DEFAULT_TAX_RATE) || 11
  },
  
  // Currency Configuration
  currency: {
    code: process.env.CURRENCY_CODE || 'IDR',
    symbol: process.env.CURRENCY_SYMBOL || 'Rp',
    locale: 'id-ID'
  },
  
  // Business Rules Configuration
  businessRules: {
    stock: {
      lowThreshold: 5,
      criticalThreshold: 2
    },
    workOrder: {
      maxDaysBeforeWarning: 3,
      autoCloseAfterDays: 30
    },
    customer: {
      creditLimit: 5000000,
      paymentTermsDays: 30
    }
  },
  
  // KPI Configuration
  kpi: {
    metrics: [
      'revenue_per_mechanic',
      'average_service_time',
      'customer_return_rate',
      'gross_margin_percent',
      'inventory_turnover',
      'cash_conversion_cycle'
    ],
    updateInterval: 'hourly'
  },
  
  // API Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
  }
};
