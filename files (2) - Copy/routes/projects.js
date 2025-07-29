const Project = require('../models/Project');
const Script = require('../models/Script');
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

async function projectRoutes(fastify, options) {
  // Get all projects for user
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const projects = await Project.find({
        $or: [
          { owner: request.user._id },
          { 'collaborators.user': request.user._id }
        ]
      }).populate('owner', 'username email');

      reply.send({ projects });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create new project
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { name, description } = request.body;

      if (!name) {
        return reply.status(400).send({ error: 'Project name is required' });
      }

      const project = new Project({
        name,
        description,
        owner: request.user._id
      });

      await project.save();
      await project.populate('owner', 'username email');

      reply.send({ project, message: 'Project created successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get project by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const project = await Project.findById(request.params.id)
        .populate('owner', 'username email')
        .populate('collaborators.user', 'username email');

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Check if user has access
      const hasAccess = project.owner._id.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user._id.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get scripts for this project
      const scripts = await Script.find({ project: project._id });

      reply.send({ project, scripts });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Delete project
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const project = await Project.findById(request.params.id);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      if (project.owner.toString() !== request.user._id.toString()) {
        return reply.status(403).send({ error: 'Only project owner can delete' });
      }

      // Delete all scripts in project
      await Script.deleteMany({ project: project._id });
      await Project.findByIdAndDelete(request.params.id);

      reply.send({ message: 'Project deleted successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = projectRoutes;