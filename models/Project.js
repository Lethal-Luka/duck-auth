const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'viewer'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    maxScripts: { type: Number, default: 10 },
    maxUsers: { type: Number, default: 100 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);