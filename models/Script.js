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
  settings: {
    loaderType: {
      type: String,
      enum: ['basic', 'advanced', 'custom'],
      default: 'basic'
    },
    options: {
      owo: { type: Boolean, default: false },
      obfuscated: { type: Boolean, default: true },
      minified: { type: Boolean, default: true }
    }
  },
  analytics: {
    executions: { type: Number, default: 0 },
    lastExecution: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Script', scriptSchema);