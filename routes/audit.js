const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get audit logs for the current user
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user.userId;

        const logs = await AuditLog.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await AuditLog.countDocuments({ userId });

        // Format logs for frontend
        const formattedLogs = logs.map(log => ({
            id: log._id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent
        }));

        res.json({
            logs: formattedLogs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalLogs: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Audit logs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;