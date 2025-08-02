const Execution = require('../models/Execution');
const Script = require('../models/Script');
const Project = require('../models/Project');
const User = require('../models/User');
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

async function analyticsRoutes(fastify, options) {
  // Get dashboard statistics
  fastify.get('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user._id;
      
      // Get user's projects
      const userProjects = await Project.find({ owner: userId }).select('_id');
      const projectIds = userProjects.map(p => p._id);

      // Get basic counts
      const [
        totalExecutions,
        totalUsers,
        totalObfuscations,
        totalThreats,
        totalScripts
      ] = await Promise.all([
        Execution.countDocuments({ project: { $in: projectIds } }),
        Execution.distinct('robloxData.userId', { project: { $in: projectIds } }).then(users => users.length),
        request.user.limits.obfuscations.used || 0,
        Execution.countDocuments({ 
          project: { $in: projectIds },
          status: 'blocked'
        }),
        Script.countDocuments({ owner: userId })
      ]);

      reply.send({
        success: true,
        stats: {
          executions: totalExecutions,
          users: totalUsers,
          obfuscations: totalObfuscations,
          threats: totalThreats,
          scripts: totalScripts
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get execution data for charts (last 10 days)
  fastify.get('/executions', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { 
        days = 10, 
        scriptId, 
        projectId 
      } = request.query;
      
      const userId = request.user._id;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Build query
      let query = {
        createdAt: { $gte: startDate },
        user: userId
      };

      if (scriptId) {
        query.script = scriptId;
      } else if (projectId) {
        query.project = projectId;
      } else {
        // Get all user's projects
        const userProjects = await Project.find({ owner: userId }).select('_id');
        query.project = { $in: userProjects.map(p => p._id) };
      }

      // Aggregate executions by day
      const executionData = await Execution.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
              }
            },
            failed: {
              $sum: {
                $cond: [{ $ne: ['$status', 'success'] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);

      // Fill missing days with zero values
      const chartData = [];
      for (let i = parseInt(days) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayData = executionData.find(d => 
          d._id.year === date.getFullYear() &&
          d._id.month === date.getMonth() + 1 &&
          d._id.day === date.getDate()
        );

        chartData.push({
          date: date.toISOString().split('T')[0],
          executions: dayData ? dayData.count : 0,
          successful: dayData ? dayData.successful : 0,
          failed: dayData ? dayData.failed : 0
        });
      }

      reply.send({
        success: true,
        data: chartData
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get top scripts by executions
  fastify.get('/top-scripts', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { limit = 5 } = request.query;
      const userId = request.user._id;

      const topScripts = await Script.find({ owner: userId })
        .sort({ 'analytics.executions': -1 })
        .limit(parseInt(limit))
        .select('name analytics.executions project')
        .populate('project', 'name');

      reply.send({
        success: true,
        scripts: topScripts
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get recent executions
  fastify.get('/recent-executions', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { limit = 10 } = request.query;
      const userId = request.user._id;

      // Get user's projects
      const userProjects = await Project.find({ owner: userId }).select('_id');
      const projectIds = userProjects.map(p => p._id);

      const recentExecutions = await Execution.find({
        project: { $in: projectIds }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('script', 'name')
      .populate('project', 'name')
      .select('script project status ipAddress createdAt robloxData.username');

      reply.send({
        success: true,
        executions: recentExecutions
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get geographic distribution
  fastify.get('/geographic', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user._id;

      // Get user's projects
      const userProjects = await Project.find({ owner: userId }).select('_id');
      const projectIds = userProjects.map(p => p._id);

      const geoData = await Execution.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: '$location.country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      reply.send({
        success: true,
        data: geoData.map(item => ({
          country: item._id || 'Unknown',
          executions: item.count
        }))
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Record execution (for external API calls)
  fastify.post('/record', async (request, reply) => {
    try {
      const {
        scriptId,
        projectId,
        userId,
        executionId,
        userAgent,
        ipAddress,
        status = 'success',
        robloxData = {},
        metrics = {},
        location = {}
      } = request.body;

      if (!scriptId || !projectId || !userId || !executionId) {
        return reply.status(400).send({ 
          error: 'Missing required fields: scriptId, projectId, userId, executionId' 
        });
      }

      // Verify script and project exist and belong to user
      const [script, project] = await Promise.all([
        Script.findById(scriptId),
        Project.findById(projectId)
      ]);

      if (!script || !project) {
        return reply.status(404).send({ error: 'Script or project not found' });
      }

      // Create execution record
      const execution = new Execution({
        script: scriptId,
        project: projectId,
        user: userId,
        executionId,
        userAgent,
        ipAddress,
        status,
        robloxData,
        metrics,
        location
      });

      await execution.save();

      // Update script analytics
      await Script.findByIdAndUpdate(scriptId, {
        $inc: { 'analytics.executions': 1 },
        $set: { 'analytics.lastExecution': new Date() }
      });

      reply.send({
        success: true,
        message: 'Execution recorded successfully'
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = analyticsRoutes;