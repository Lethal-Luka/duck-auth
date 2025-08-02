const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  // Global notification or user-specific
  isGlobal: {
    type: Boolean,
    default: false
  },
  // For user-specific notifications
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.isGlobal; }
  },
  // Display options
  displayOptions: {
    showOkButton: { type: Boolean, default: true },
    showCloseButton: { type: Boolean, default: true },
    autoClose: { type: Boolean, default: false },
    duration: { type: Number, default: 5000 }, // milliseconds
    showConfetti: { type: Boolean, default: false }
  },
  // Read tracking for users
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);