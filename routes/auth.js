const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'duck-auth-secret-key-2024';

async function authRoutes(fastify, options) {
  // Register with invite code
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password, inviteCode } = request.body;

      if (!username || !email || !password) {
        return reply.status(400).send({ error: 'All fields are required' });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Validate invite code if provided
      let planType = 'basic';
      let invitedBy = null;

      if (inviteCode) {
        const inviter = await User.findOne({
          'generatedInvites.code': inviteCode,
          'generatedInvites.usedBy': { $exists: false },
          'generatedInvites.expiresAt': { $gt: new Date() }
        });

        if (!inviter) {
          return reply.status(400).send({ error: 'Invalid or expired invite code' });
        }

        const invite = inviter.generatedInvites.find(inv => inv.code === inviteCode);
        planType = invite.plan;
        invitedBy = inviter._id;

        // Mark invite as used
        await User.updateOne(
          { _id: inviter._id, 'generatedInvites.code': inviteCode },
          {
            $set: {
              'generatedInvites.$.usedAt': new Date(),
              'generatedInvites.$.usedBy': null // Will be set after user creation
            }
          }
        );
      }

      const apiKey = `duck_${uuidv4().replace(/-/g, '')}`;

      // Get plan limits from config
      const plansConfig = require('../config/plans.json');
      const selectedPlan = plansConfig.plans[planType];

      const user = new User({
        username,
        email,
        password,
        apiKey,
        subscription: {
          plan: planType,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        inviteCode: inviteCode ? {
          code: inviteCode,
          usedAt: new Date(),
          invitedBy
        } : undefined,
        limits: {
          obfuscations: {
            used: 0,
            limit: selectedPlan.limits.obfuscations
          },
          projects: {
            used: 0,
            limit: selectedPlan.limits.projects
          },
          scripts: {
            used: 0,
            limit: selectedPlan.limits.scripts
          },
          users: {
            used: 0,
            limit: selectedPlan.limits.users
          }
        }
      });

      await user.save();

      // Update invite with new user ID
      if (inviteCode && invitedBy) {
        await User.updateOne(
          { _id: invitedBy, 'generatedInvites.code': inviteCode },
          {
            $set: {
              'generatedInvites.$.usedBy': user._id
            }
          }
        );
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      reply.send({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
          subscription: user.subscription,
          limits: user.limits
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return reply.status(400).send({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return reply.status(400).send({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      reply.send({
        message: 'Login successful',
        token,
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

  // Login with API key
  fastify.post('/login-api', async (request, reply) => {
    try {
      const { apiKey } = request.body;

      if (!apiKey) {
        return reply.status(400).send({ error: 'API key is required' });
      }

      const user = await User.findOne({ apiKey });
      if (!user) {
        return reply.status(400).send({ error: 'Invalid API key' });
      }

      if (user.status !== 'active') {
        return reply.status(400).send({ error: 'Account is suspended or banned' });
      }

      // Update last activity
      user.lastActivity = new Date();
      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      reply.send({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
          subscription: user.subscription,
          limits: user.limits
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
  fastify.get('/profile', {
    preHandler: async (request, reply) => {
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
    }
  }, async (request, reply) => {
    reply.send({ user: request.user });
  });

  // Validate invite code
  fastify.post('/validate-invite', async (request, reply) => {
    try {
      const { inviteCode } = request.body;

      if (!inviteCode) {
        return reply.status(400).send({ error: 'Invite code is required' });
      }

      const inviter = await User.findOne({
        'generatedInvites.code': inviteCode,
        'generatedInvites.usedBy': { $exists: false },
        'generatedInvites.expiresAt': { $gt: new Date() }
      }).select('username generatedInvites');

      if (!inviter) {
        return reply.status(400).send({ error: 'Invalid or expired invite code' });
      }

      const invite = inviter.generatedInvites.find(inv => inv.code === inviteCode);
      const plansConfig = require('../config/plans.json');
      const plan = plansConfig.plans[invite.plan];

      reply.send({
        success: true,
        valid: true,
        plan: {
          name: plan.name,
          price: plan.price,
          features: plan.features
        },
        inviter: inviter.username
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = authRoutes;