const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Enhanced subscription system
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'pro'],
      default: 'basic'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Invite code used for this subscription
    inviteCode: {
      type: String
    }
  },
  // Usage tracking based on subscription limits
  usage: {
    obfuscations: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 100 }
    },
    projects: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 5 }
    },
    scripts: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 25 }
    },
    users: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 100 }
    },
    storage: {
      used: { type: Number, default: 0 }, // in bytes
      limit: { type: Number, default: 5 * 1024 * 1024 * 1024 } // 5GB
    }
  },
  // Reset tracking for monthly limits
  lastReset: {
    type: Date,
    default: Date.now
  },
  // IP whitelist
  ipWhitelist: [{
    ip: String,
    description: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
      confetti: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if subscription is active and not expired
userSchema.methods.hasActiveSubscription = function() {
  return this.subscription.isActive && new Date() <= this.subscription.endDate;
};

// Method to get current plan limits
userSchema.methods.getPlanLimits = function() {
  const plans = require('../config/plans.json');
  const currentPlan = plans[this.subscription.plan];
  return currentPlan ? currentPlan.limits : plans.basic.limits;
};

module.exports = mongoose.model('User', userSchema);