// utils/auditLogger.js
const mongoose = require('mongoose');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  },
  userName: String,
  userEmail: String,
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_STATUS_CHANGED',
      // Product actions
      'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 
      'PRODUCT_STATUS_CHANGED', 'STOCK_UPDATED', 'BULK_UPDATE',
      // Order actions
      'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'REFUND_ISSUED',
      // Category actions
      'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED',
      // Security actions
      'LOGIN_ATTEMPT', 'PERMISSION_CHANGED', 'PASSWORD_RESET',
      // Review 
      'REVIEW_CREATED', 'REVIEW_UPDATED', 'REVIEW_DELETED', 'REVIEW_MODERATED', 'REVIEW_FLAGGED', 'REVIEW_HELPFUL_VOTED',
      // Add these contact form actions:
      'CONTACT_FORM_SUBMITTED', 'CONTACT_FORM_ERROR',
      // Inventory alerts - ADD THIS
      'INVENTORY_ALERT', 'STOCK_WARNING', 'STOCKOUT_PREDICTED',
      // Other
      'DATA_EXPORT', 'SETTINGS_CHANGED', 'EMAIL_VERIFIED'
    ]
  },
  resource: {
    type: String, // 'user', 'product', 'order', 'category', etc.
    required: true
  },
  resourceId: mongoose.Schema.ObjectId,
  details: mongoose.Schema.Types.Mixed, // Additional details about the action
  oldValue: mongoose.Schema.Types.Mixed, // Previous state (for updates)
  newValue: mongoose.Schema.Types.Mixed, // New state (for updates)
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Audit logging functions
const auditLogger = {
  // Log any audit event
  log: async (data) => {
    try {
      await AuditLog.create(data);
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  },

  // User actions
  logUserAction: async (action, user, resourceId, details = {}, oldValue = null, newValue = null) => {
    await auditLogger.log({
      userId: user._id || user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action,
      resource: 'user',
      resourceId,
      details,
      oldValue,
      newValue,
      ipAddress: details.ip,
      userAgent: details.userAgent
    });
  },

  // Product actions
  logProductAction: async (action, user, productId, details = {}, oldValue = null, newValue = null) => {
    await auditLogger.log({
      userId: user._id || user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action,
      resource: 'product',
      resourceId: productId,
      details,
      oldValue,
      newValue
    });
  },

  // Order actions
  logOrderAction: async (action, user, orderId, details = {}, oldValue = null, newValue = null) => {
    await auditLogger.log({
      userId: user._id || user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action,
      resource: 'order',
      resourceId: orderId,
      details,
      oldValue,
      newValue
    });
  },

  // Get audit logs with filters
  getAuditLogs: async (filters = {}, options = {}) => {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = { ...filters, ...options };

    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName email');

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
};

module.exports = { auditLogger, AuditLog };