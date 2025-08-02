const mongoose = require('mongoose');

const scriptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  loader: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  // Enhanced settings
  settings: {
    loaderType: {
      type: String,
      enum: ['basic', 'advanced', 'custom'],
      default: 'basic'
    },
    obfuscation: {
      enabled: { type: Boolean, default: true },
      level: {
        type: String,
        enum: ['basic', 'advanced', 'premium'],
        default: 'basic'
      },
      antiTamper: { type: Boolean, default: true },
      antiDebug: { type: Boolean, default: true }
    },
    heartbeat: {
      enabled: { type: Boolean, default: true },
      interval: { type: Number, default: 30000 }, // milliseconds
      tolerance: { type: Number, default: 3 }, // missed beats before timeout
      action: {
        type: String,
        enum: ['none', 'shutdown', 'alert'],
        default: 'shutdown'
      }
    },
    lightningMode: {
      enabled: { type: Boolean, default: false },
      cacheTime: { type: Number, default: 300000 }, // 5 minutes
      preload: { type: Boolean, default: true }
    },
    sourceLocker: {
      enabled: { type: Boolean, default: false },
      encryptionKey: String,
      allowedIPs: [String],
      hwid: {
        required: { type: Boolean, default: false },
        allowedHWIDs: [String]
      }
    },
    roblox: {
      gameIds: [String], // Specific game IDs allowed
      placeIds: [String], // Specific place IDs allowed
      userIds: [String], // Specific user IDs allowed
      vipServers: { type: Boolean, default: true }
    },
    security: {
      vpnBlocking: { type: Boolean, default: true },
      proxyBlocking: { type: Boolean, default: true },
      botProtection: { type: Boolean, default: true },
      rateLimiting: {
        enabled: { type: Boolean, default: true },
        requests: { type: Number, default: 60 },
        window: { type: Number, default: 60000 } // 1 minute
      }
    },
    options: {
      owo: { type: Boolean, default: false },
      minified: { type: Boolean, default: true },
      compressed: { type: Boolean, default: true },
      logging: { type: Boolean, default: true }
    }
  },
  // Enhanced analytics
  analytics: {
    executions: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    blockedRequests: { type: Number, default: 0 },
    lastExecution: Date,
    peakUsage: {
      concurrent: { type: Number, default: 0 },
      daily: { type: Number, default: 0 },
      date: Date
    }
  },
  // Version control
  version: {
    current: { type: String, default: '1.0.0' },
    history: [{
      version: String,
      changes: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      size: Number
    }]
  },
  // File information
  file: {
    originalName: String,
    size: Number,
    hash: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
scriptSchema.index({ project: 1, status: 1 });
scriptSchema.index({ owner: 1, createdAt: -1 });
scriptSchema.index({ 'analytics.executions': -1 });

module.exports = mongoose.model('Script', scriptSchema);