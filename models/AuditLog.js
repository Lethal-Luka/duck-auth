const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN',
            'LOGOUT',
            'REGISTER',
            'EMAIL_VERIFIED',
            'USERNAME_CHANGED',
            'EMAIL_CHANGED',
            'PASSWORD_CHANGED',
            'API_KEY_REGENERATED',
            'PROJECT_CREATED',
            'PROJECT_UPDATED',
            'PROJECT_DELETED',
            'SCRIPT_UPLOADED',
            'SCRIPT_UPDATED',
            'SCRIPT_DELETED',
            'USER_KEY_GENERATED',
            'USER_KEY_DELETED'
        ]
    },
    details: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: 'Unknown'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient user-specific queries
auditLogSchema.index({ userId: 1, timestamp: -1 });

// TTL index to automatically delete old logs after 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);