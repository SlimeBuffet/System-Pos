const EventEmitter = require('events');
const config = require('../config');

// Event system for automation backbone
class EventSystem extends EventEmitter {
  constructor() {
    super();
    this.eventHandlers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    
    // Register default event handlers
    this.registerDefaultHandlers();
  }

  // Emit event with metadata
  async emit(eventName, data, context = {}) {
    const event = {
      id: this.generateEventId(),
      name: eventName,
      data,
      context: {
        userId: context.userId || null,
        tenantId: context.tenantId || 'default',
        outletId: context.outletId || null,
        timestamp: new Date().toISOString(),
        ...context
      },
      processed: false,
      error: null
    };

    try {
      // Store in history
      this.addToHistory(event);

      // Emit to listeners
      super.emit(eventName, event);

      // Also emit generic event for logging
      super.emit('*.event', event);

      console.log(`📡 Event emitted: ${eventName}`, { 
        eventId: event.id, 
        tenantId: event.context.tenantId 
      });

      return event;
    } catch (error) {
      event.error = error.message;
      console.error(`❌ Error emitting event ${eventName}:`, error);
      throw error;
    }
  }

  // Register event handler
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    return super.on(event, handler);
  }

  // Add event to history
  addToHistory(event) {
    this.eventHistory.push(event);
    
    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  // Get event history
  getHistory(filters = {}) {
    let history = this.eventHistory;

    if (filters.eventName) {
      history = history.filter(e => e.name === filters.eventName);
    }
    if (filters.tenantId) {
      history = history.filter(e => e.context.tenantId === filters.tenantId);
    }
    if (filters.startDate) {
      history = history.filter(e => new Date(e.context.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      history = history.filter(e => new Date(e.context.timestamp) <= new Date(filters.endDate));
    }

    return history;
  }

  // Generate unique event ID
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Register default event handlers
  registerDefaultHandlers() {
    // Stock management events
    this.on('stock.low', async (event) => {
      console.log(`⚠️ Low stock alert: ${event.data.productName} (${event.data.currentStock} remaining)`);
      // Auto-create purchase order if enabled
      // Send notification to manager
    });

    this.on('stock.critical', async (event) => {
      console.log(`🚨 CRITICAL stock alert: ${event.data.productName} (${event.data.currentStock} remaining)`);
      // Urgent notification
      // Auto-generate PO with expedited shipping
    });

    this.on('stock.updated', async (event) => {
      // Update stock valuation
      // Recalculate average cost if needed
    });

    // Work Order events
    this.on('wo.created', async (event) => {
      // Notify assigned mechanic
      // Send confirmation to customer
    });

    this.on('wo.status_changed', async (event) => {
      const { woId, oldStatus, newStatus } = event.data;
      console.log(`WO ${woId} status changed: ${oldStatus} → ${newStatus}`);
      
      // Auto-invoice when completed
      if (newStatus === 'completed') {
        await this.emit('wo.completed', { woId });
      }
      
      // Alert if WO is taking too long
      if (newStatus === 'in_progress') {
        // Start timer for SLA monitoring
      }
    });

    this.on('wo.completed', async (event) => {
      console.log(`✅ WO completed: ${event.data.woId}`);
      // Generate invoice
      // Notify customer for pickup
      // Calculate mechanic performance metrics
    });

    this.on('wo.overdue', async (event) => {
      console.log(`⏰ WO overdue warning: ${event.data.woId}`);
      // Notify manager
      // Escalate priority
    });

    // Payment events
    this.on('payment.received', async (event) => {
      console.log(`💰 Payment received: ${event.data.amount} for ${event.data.referenceType} ${event.data.referenceId}`);
      // Create journal entry
      // Update customer balance if credit
      // Send receipt
    });

    this.on('payment.failed', async (event) => {
      console.log(`❌ Payment failed: ${event.data.reason}`);
      // Notify customer
      // Retry logic if applicable
    });

    // Transaction events
    this.on('transaction.completed', async (event) => {
      // Update inventory
      // Create accounting entries
      // Calculate KPIs
      // Trigger loyalty points
    });

    this.on('transaction.refunded', async (event) => {
      // Reverse inventory
      // Create refund journal entry
      // Update analytics
    });

    // Payroll events
    this.on('salary.generated', async (event) => {
      console.log(`💵 Salary generated for period: ${event.data.period}`);
      // Create payroll journal entries
      // Notify employees
      // Update expense tracking
    });

    // Customer events
    this.on('customer.created', async (event) => {
      // Send welcome message
      // Create loyalty account
    });

    this.on('customer.service_reminder', async (event) => {
      console.log(`🔔 Service reminder for customer: ${event.data.customerId}`);
      // Send WhatsApp/SMS reminder
      // Schedule follow-up
    });

    // System events
    this.on('shift.opened', async (event) => {
      // Log shift start
      // Set opening balance
    });

    this.on('shift.closed', async (event) => {
      console.log(`📋 Shift closed: ${event.data.shiftId}`);
      // Reconcile cash
      // Generate shift report
      // Create summary journal entry
    });

    this.on('backup.completed', async (event) => {
      console.log(`💾 Backup completed: ${event.data.backupPath}`);
      // Notify admin
      // Clean up old backups
    });

    // AI/ML events
    this.on('prediction.stock_reorder', async (event) => {
      console.log(`🤖 AI prediction: Reorder ${event.data.productName} soon`);
      // Generate recommended PO
    });

    this.on('prediction.cashflow', async (event) => {
      // Update cashflow forecast dashboard
    });
  }

  // Trigger business rules based on events
  async triggerBusinessRules(event) {
    const rules = await this.loadBusinessRules();
    
    for (const rule of rules) {
      if (rule.triggerEvent === event.name) {
        const shouldExecute = this.evaluateCondition(rule.condition, event.data);
        
        if (shouldExecute) {
          await this.executeAction(rule.action, event.data);
        }
      }
    }
  }

  // Load configurable business rules
  async loadBusinessRules() {
    // This would load from database in production
    return [
      {
        id: 'rule_1',
        name: 'Low Stock Auto-Alert',
        triggerEvent: 'stock.low',
        condition: { field: 'currentStock', operator: '<', value: 5 },
        action: { type: 'notify', recipients: ['manager'] }
      },
      {
        id: 'rule_2',
        name: 'WO Overdue Warning',
        triggerEvent: 'wo.status_changed',
        condition: { field: 'daysInStatus', operator: '>', value: 3 },
        action: { type: 'escalate', priority: 'high' }
      }
    ];
  }

  // Evaluate rule condition
  evaluateCondition(condition, data) {
    const { field, operator, value } = condition;
    const dataValue = data[field];

    switch (operator) {
      case '<': return dataValue < value;
      case '>': return dataValue > value;
      case '=': return dataValue === value;
      case '<=': return dataValue <= value;
      case '>=': return dataValue >= value;
      case '!=': return dataValue !== value;
      default: return false;
    }
  }

  // Execute rule action
  async executeAction(action, data) {
    switch (action.type) {
      case 'notify':
        // Send notification
        break;
      case 'escalate':
        // Escalate priority
        break;
      case 'auto_create':
        // Auto-create document (PO, WO, etc)
        break;
    }
  }
}

// Singleton instance
const eventSystem = new EventSystem();

module.exports = eventSystem;
