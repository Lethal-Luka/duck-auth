const User = require('../models/User');
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
    const user = await User.findById(decoded.userId);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

async function dashboardRoutes(fastify, options) {
  // Get dashboard stats
  fastify.get('/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user._id;

      // Get counts
      const projectsCount = await Project.countDocuments({
        $or: [
          { owner: userId },
          { 'collaborators.user': userId }
        ]
      });

      const scriptsCount = await Script.countDocuments({ owner: userId });

      // Get user's projects for execution stats
      const userProjects = await Project.find({ owner: userId }).select('_id');
      const projectIds = userProjects.map(p => p._id);

      // Get execution count from analytics
      let executionsCount = 0;
      try {
        const Execution = require('../models/Execution');
        executionsCount = await Execution.countDocuments({ 
          project: { $in: projectIds } 
        });
      } catch (error) {
        console.log('Execution model not available, using script analytics');
        const scripts = await Script.find({ owner: userId });
        executionsCount = scripts.reduce((total, script) => total + (script.analytics.executions || 0), 0);
      }

      // Count unique users from projects
      const projects = await Project.find({
        $or: [
          { owner: userId },
          { 'collaborators.user': userId }
        ]
      });

      let totalUsers = 0;
      projects.forEach(project => {
        totalUsers += project.collaborators.length + 1; // +1 for owner
      });

      // Get user limits from enhanced model
      const user = await User.findById(userId);
      const monthlyStats = {
        obfuscations: {
          used: user.limits?.obfuscations?.used || 0,
          limit: user.limits?.obfuscations?.limit || 500,
          percentage: Math.round(((user.limits?.obfuscations?.used || 0) / (user.limits?.obfuscations?.limit || 500)) * 100)
        },
        users: {
          used: user.limits?.users?.used || 0,
          limit: user.limits?.users?.limit || 100,
          percentage: Math.round(((user.limits?.users?.used || 0) / (user.limits?.users?.limit || 100)) * 100)
        }
      };

      // Recent activity (mock data for now)
      const recentActivity = [
        { action: 'Script created', target: 'Auth Script v1.2', time: new Date() },
        { action: 'Project updated', target: 'Main Project', time: new Date(Date.now() - 3600000) },
        { action: 'User added', target: 'john.doe@email.com', time: new Date(Date.now() - 7200000) }
      ];

      reply.send({
        stats: {
          projects: projectsCount,
          scripts: scriptsCount,
          users: totalUsers,
          executions: executionsCount
        },
        monthlyStats,
        recentActivity
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update user settings
  fastify.put('/settings', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { username, email } = request.body;

      const user = await User.findById(request.user._id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return reply.status(400).send({ error: 'Username already taken' });
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return reply.status(400).send({ error: 'Email already taken' });
        }
        user.email = email;
      }

      await user.save();

      reply.send({
        message: 'Settings updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = dashboardRoutes;