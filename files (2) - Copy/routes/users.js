const User = require('../models/User');
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'duck-auth-secret-key-2024';

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

async function userRoutes(fastify, options) {
  // Get all users for all user's projects
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      // Get all projects where user is owner or collaborator
      const projects = await Project.find({
        $or: [
          { owner: request.user._id },
          { 'collaborators.user': request.user._id }
        ]
      }).populate('owner', 'username email createdAt')
        .populate('collaborators.user', 'username email createdAt');

      let allUsers = [];
      
      projects.forEach(project => {
        // Add owner
        allUsers.push({
          ...project.owner.toObject(),
          role: 'owner',
          projectName: project.name,
          projectId: project._id
        });

        // Add collaborators
        project.collaborators.forEach(collab => {
          allUsers.push({
            ...collab.user.toObject(),
            role: collab.role,
            projectName: project.name,
            projectId: project._id
          });
        });
      });

      // Remove duplicates based on user ID
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex(u => u._id.toString() === user._id.toString())
      );

      reply.send({ users: uniqueUsers });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get users for a specific project
  fastify.get('/project/:projectId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const project = await Project.findById(request.params.projectId)
        .populate('owner', 'username email createdAt')
        .populate('collaborators.user', 'username email createdAt');

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Check access
      const hasAccess = project.owner._id.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user._id.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const users = [
        { ...project.owner.toObject(), role: 'owner' },
        ...project.collaborators.map(c => ({
          ...c.user.toObject(),
          role: c.role
        }))
      ];

      reply.send({ users, project: { name: project.name, _id: project._id } });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Add user to project
  fastify.post('/project/:projectId/add', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { email, role = 'viewer' } = request.body;

      if (!email) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      const project = await Project.findById(request.params.projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Only owner or admin can add users
      const isOwner = project.owner.toString() === request.user._id.toString();
      const isAdmin = project.collaborators.some(c => 
        c.user.toString() === request.user._id.toString() && c.role === 'admin'
      );

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({ error: 'Only project owner or admin can add users' });
      }

      const userToAdd = await User.findOne({ email });
      if (!userToAdd) {
        return reply.status(404).send({ error: 'User not found with this email' });
      }

      // Check if user is already in project
      const isAlreadyAdded = project.collaborators.some(
        c => c.user.toString() === userToAdd._id.toString()
      );

      if (isAlreadyAdded || project.owner.toString() === userToAdd._id.toString()) {
        return reply.status(400).send({ error: 'User is already in this project' });
      }

      project.collaborators.push({
        user: userToAdd._id,
        role
      });

      await project.save();

      reply.send({ message: 'User added to project successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Remove user from project
  fastify.delete('/project/:projectId/remove/:userId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const project = await Project.findById(request.params.projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Only owner can remove users
      if (project.owner.toString() !== request.user._id.toString()) {
        return reply.status(403).send({ error: 'Only project owner can remove users' });
      }

      project.collaborators = project.collaborators.filter(
        c => c.user.toString() !== request.params.userId
      );

      await project.save();

      reply.send({ message: 'User removed from project successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update user role in project
  fastify.put('/project/:projectId/role/:userId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { role } = request.body;
      
      if (!['viewer', 'editor', 'admin'].includes(role)) {
        return reply.status(400).send({ error: 'Invalid role' });
      }

      const project = await Project.findById(request.params.projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Only owner can change roles
      if (project.owner.toString() !== request.user._id.toString()) {
        return reply.status(403).send({ error: 'Only project owner can change user roles' });
      }

      const collaborator = project.collaborators.find(
        c => c.user.toString() === request.params.userId
      );

      if (!collaborator) {
        return reply.status(404).send({ error: 'User not found in project' });
      }

      collaborator.role = role;
      await project.save();

      reply.send({ message: 'User role updated successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = userRoutes;