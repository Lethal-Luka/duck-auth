const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  script: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Execution details
  executionId: {
    type: String,
    unique: true,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  // Geolocation data (optional)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Execution status
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked', 'unauthorized'],
    required: true
  },
  // Error details if execution failed
  error: {
    code: String,
    message: String
  },
  // Performance metrics
  metrics: {
    loadTime: Number, // milliseconds
    executionTime: Number, // milliseconds
    memoryUsage: Number, // bytes
    scriptSize: Number // bytes
  },
  // Roblox-specific data
  robloxData: {
    gameId: String,
    placeId: String,
    userId: String,
    username: String,
    gameVersion: String
  },
  // Security flags
  securityFlags: {
    isVpn: { type: Boolean, default: false },
    isTor: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    riskScore: { type: Number, min: 0, max: 100, default: 0 }
  },
  // Heartbeat data
  heartbeat: {
    isEnabled: { type: Boolean, default: true },
    interval: { type: Number, default: 30000 }, // milliseconds
    lastBeat: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'timeout'],
      default: 'active'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
executionSchema.index({ script: 1, createdAt: -1 });
executionSchema.index({ project: 1, createdAt: -1 });
executionSchema.index({ user: 1, createdAt: -1 });
executionSchema.index({ executionId: 1 });
executionSchema.index({ ipAddress: 1 });
executionSchema.index({ status: 1, createdAt: -1 });

// TTL index for old executions (keep for 90 days)
executionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Execution', executionSchema);