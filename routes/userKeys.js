const UserKey = require('../models/UserKey');
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

async function userKeyRoutes(fastify, options) {
  // Get all user keys for a project
  fastify.get('/project/:projectId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { projectId } = request.params;

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const userKeys = await UserKey.find({ project: projectId })
        .populate('owner', 'username email')
        .sort({ createdAt: -1 });

      reply.send({ userKeys });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create new user key
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { username, projectId, customKey } = request.body;

      if (!username || !projectId) {
        return reply.status(400).send({ error: 'Username and project ID are required' });
      }

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check if username already exists in this project
      const existingKey = await UserKey.findOne({ username, project: projectId });
      if (existingKey) {
        return reply.status(400).send({ error: 'Username already exists in this project' });
      }

      // Generate key
      const key = customKey || `${projectId}_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      // Check if custom key already exists
      if (customKey) {
        const existingCustomKey = await UserKey.findOne({ key: customKey });
        if (existingCustomKey) {
          return reply.status(400).send({ error: 'Custom key already exists' });
        }
      }

      const userKey = new UserKey({
        username,
        key,
        project: projectId,
        owner: request.user._id
      });

      await userKey.save();
      await userKey.populate('owner', 'username email');

      reply.send({ userKey, message: 'User key created successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update user key
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { username, isActive } = request.body;

      const userKey = await UserKey.findById(request.params.id).populate('project');
      if (!userKey) {
        return reply.status(404).send({ error: 'User key not found' });
      }

      // Check access through project
      const project = await Project.findById(userKey.project._id);
      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Update fields
      if (username && username !== userKey.username) {
        // Check if new username already exists in this project
        const existingKey = await UserKey.findOne({ 
          username, 
          project: userKey.project._id,
          _id: { $ne: userKey._id }
        });
        if (existingKey) {
          return reply.status(400).send({ error: 'Username already exists in this project' });
        }
        userKey.username = username;
      }
      
      if (typeof isActive === 'boolean') {
        userKey.isActive = isActive;
      }

      await userKey.save();

      reply.send({ userKey, message: 'User key updated successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Delete user key
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userKey = await UserKey.findById(request.params.id).populate('project');
      if (!userKey) {
        return reply.status(404).send({ error: 'User key not found' });
      }

      // Check access
      const project = await Project.findById(userKey.project._id);
      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await UserKey.findByIdAndDelete(request.params.id);

      reply.send({ message: 'User key deleted successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Verify user key (public endpoint for script authentication)
  fastify.get('/verify/:projectId/:key', async (request, reply) => {
    try {
      const { projectId, key } = request.params;

      const project = await Project.findById(projectId);
      if (!project || !project.isActive) {
        return reply.status(404).send({ error: 'Project not found or inactive' });
      }

      const userKey = await UserKey.findOne({ 
        key, 
        project: projectId, 
        isActive: true 
      });

      if (!userKey) {
        return reply.status(401).send({ error: 'Invalid or inactive key' });
      }

      // Update usage stats
      userKey.lastUsed = new Date();
      userKey.usageCount += 1;
      await userKey.save();

      reply.send({ 
        valid: true, 
        username: userKey.username,
        message: 'Key verified successfully' 
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = userKeyRoutes;