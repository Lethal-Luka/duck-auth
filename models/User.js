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
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  // Invite code system
  inviteCode: {
    code: String,
    usedAt: Date,
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Generated invite codes for resellers
  generatedInvites: [{
    code: {
      type: String,
      unique: true
    },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'pro']
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: Date,
    expiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Usage limits based on plan
  limits: {
    obfuscations: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 500 }
    },
    projects: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 3 }
    },
    scripts: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 15 }
    },
    users: {
      used: { type: Number, default: 0 },
      limit: { type: Number, default: 100 }
    }
  },
  // IP Whitelist
  ipWhitelist: [{
    ip: {
      type: String,
      required: true
    },
    label: {
      type: String,
      maxlength: 50
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },
    confettiEnabled: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    dashboardLayout: {
      type: String,
      enum: ['grid', 'list'],
      default: 'grid'
    }
  },
  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  // Reseller information
  reseller: {
    isReseller: {
      type: Boolean,
      default: false
    },
    commission: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalSales: {
      type: Number,
      default: 0
    }
  },
  // Last activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  lastReset: {
    type: Date,
    default: Date.now
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

module.exports = mongoose.model('User', userSchema);