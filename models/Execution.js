const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  // Script and project references
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
  userId: {
    type: String, // The user ID who executed the script (from game)
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  // Request information
  ip: {
    type: String,
    required: true
  },
  userAgent: String,
  // Game information (Roblox specific)
  gameInfo: {
    placeId: String,
    gameId: String,
    jobId: String
  },
  // Execution result
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String,
  // Performance metrics
  responseTime: {
    type: Number, // milliseconds
    default: 0
  },
  // Security events
  threats: [{
    type: {
      type: String,
      enum: ['unauthorized', 'rate_limit', 'suspicious_activity', 'blacklisted_ip']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    blocked: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for analytics and performance
executionSchema.index({ script: 1, createdAt: -1 });
executionSchema.index({ project: 1, createdAt: -1 });
executionSchema.index({ user: 1, createdAt: -1 });
executionSchema.index({ ip: 1, createdAt: -1 });
executionSchema.index({ success: 1, createdAt: -1 });
executionSchema.index({ createdAt: -1 }); // For time-based queries

module.exports = mongoose.model('Execution', executionSchema);