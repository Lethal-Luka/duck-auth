const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'duck-auth-secret-key-2024';

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

const checkProjectAccess = async (request, reply) => {
  try {
    const Project = require('../models/Project');
    const projectId = request.params.projectId || request.body.projectId;
    
    if (!projectId) {
      return reply.status(400).send({ error: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const hasAccess = project.owner.toString() === request.user._id.toString() ||
      project.collaborators.some(c => c.user.toString() === request.user._id.toString());

    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    request.project = project;
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
};

module.exports = {
  authenticate,
  checkProjectAccess
};