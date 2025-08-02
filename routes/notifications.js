const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'duck-auth-secret-key-2024';

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

async function notificationRoutes(fastify, options) {
  // Get user notifications
  fastify.get('/user', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({
        user: request.user._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

      const total = await Notification.countDocuments({
        user: request.user._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      reply.send({
        success: true,
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get global notifications
  fastify.get('/global', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({
        isGlobal: true,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

      // Mark which notifications the user has read
      const notificationsWithReadStatus = notifications.map(notification => ({
        ...notification,
        isRead: notification.readBy.some(read => read.user.toString() === request.user._id.toString())
      }));

      const total = await Notification.countDocuments({
        isGlobal: true,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      reply.send({
        success: true,
        notifications: notificationsWithReadStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Mark notification as read
  fastify.post('/:id/read', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const notification = await Notification.findById(id);
      if (!notification) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      if (notification.isGlobal) {
        // For global notifications, add to readBy array
        const alreadyRead = notification.readBy.some(
          read => read.user.toString() === request.user._id.toString()
        );

        if (!alreadyRead) {
          notification.readBy.push({
            user: request.user._id,
            readAt: new Date()
          });
          await notification.save();
        }
      } else if (notification.user.toString() !== request.user._id.toString()) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      reply.send({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get unread count
  fastify.get('/unread-count', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userNotifications = await Notification.countDocuments({
        user: request.user._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      const globalNotifications = await Notification.countDocuments({
        isGlobal: true,
        isActive: true,
        'readBy.user': { $ne: request.user._id },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      reply.send({
        success: true,
        unreadCount: {
          user: userNotifications,
          global: globalNotifications,
          total: userNotifications + globalNotifications
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create notification (admin only - simplified for now)
  fastify.post('/create', { preHandler: authenticate }, async (request, reply) => {
    try {
      const {
        title,
        message,
        type = 'info',
        isGlobal = false,
        targetUser,
        displaySettings = {},
        priority = 1,
        expiresAt
      } = request.body;

      if (!title || !message) {
        return reply.status(400).send({ error: 'Title and message are required' });
      }

      const notification = new Notification({
        title,
        message,
        type,
        isGlobal,
        user: isGlobal ? undefined : (targetUser || request.user._id),
        displaySettings: {
          showOkButton: displaySettings.showOkButton ?? true,
          showCloseButton: displaySettings.showCloseButton ?? true,
          autoHide: displaySettings.autoHide ?? true,
          hideAfter: displaySettings.hideAfter ?? 5000,
          showConfetti: displaySettings.showConfetti ?? false
        },
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      await notification.save();

      reply.send({
        success: true,
        message: 'Notification created successfully',
        notification
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = notificationRoutes;