const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const appConfig = require('../config/app.json');

const JWT_SECRET = process.env.JWT_SECRET || appConfig.security.jwtSecret;

async function authRoutes(fastify, options) {
  // Register with invite code
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password, inviteCode } = request.body;

      if (!username || !email || !password) {
        return reply.status(400).send({ error: 'Username, email, and password are required' });
      }

      // Check if invite code is provided and valid
      let subscription = { plan: 'basic' }; // Default plan
      if (inviteCode) {
        const invite = await InviteCode.findOne({ 
          code: inviteCode.toUpperCase(), 
          isUsed: false,
          expiresAt: { $gt: new Date() }
        });

        if (!invite) {
          return reply.status(400).send({ error: 'Invalid or expired invite code' });
        }

        subscription = {
          plan: invite.plan,
          inviteCode: invite.code,
          startDate: new Date(),
          endDate: new Date(Date.now() + invite.duration * 24 * 60 * 60 * 1000)
        };
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const apiKey = `duck_${uuidv4().replace(/-/g, '')}`;

      // Get plan limits
      const plans = require('../config/plans.json');
      const planLimits = plans[subscription.plan]?.limits || plans.basic.limits;

      const user = new User({
        username,
        email,
        password,
        apiKey,
        subscription,
        usage: {
          obfuscations: { used: 0, limit: planLimits.obfuscationsPerMonth },
          projects: { used: 0, limit: planLimits.projectsTotal },
          scripts: { used: 0, limit: planLimits.scriptsPerProject * planLimits.projectsTotal },
          users: { used: 0, limit: planLimits.usersPerProject * planLimits.projectsTotal },
          storage: { used: 0, limit: planLimits.storageGB * 1024 * 1024 * 1024 }
        }
      });

      await user.save();

      // Mark invite code as used
      if (inviteCode) {
        await InviteCode.findOneAndUpdate(
          { code: inviteCode.toUpperCase() },
          { 
            isUsed: true, 
            usedBy: user._id, 
            usedAt: new Date() 
          }
        );
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: appConfig.security.sessionTimeout });

      reply.send({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
          subscription: user.subscription,
          usage: user.usage
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Login (supports both email/password and API key)
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password, apiKey } = request.body;

      let user;
      
      if (apiKey) {
        // API key authentication
        user = await User.findOne({ apiKey });
        if (!user) {
          return reply.status(400).send({ error: 'Invalid API key' });
        }
      } else {
        // Email/password authentication
        if (!email || !password) {
          return reply.status(400).send({ error: 'Email and password are required' });
        }

        user = await User.findOne({ email });
        if (!user) {
          return reply.status(400).send({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          return reply.status(400).send({ error: 'Invalid credentials' });
        }
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: appConfig.security.sessionTimeout });

      reply.send({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
          subscription: user.subscription,
          usage: user.usage
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Verify API key (for script authentication)
  fastify.post('/verify', async (request, reply) => {
    try {
      const { apiKey, userId, ip } = request.body;

      if (!apiKey) {
        return reply.status(400).send({ error: 'API key is required' });
      }

      const user = await User.findOne({ apiKey });
      if (!user) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }

      // Check if subscription is active
      if (!user.hasActiveSubscription()) {
        return reply.status(403).send({ error: 'Subscription expired' });
      }

      // Check IP whitelist if configured
      if (user.ipWhitelist.length > 0 && ip) {
        const isWhitelisted = user.ipWhitelist.some(entry => entry.ip === ip);
        if (!isWhitelisted) {
          return reply.status(403).send({ error: 'IP not whitelisted' });
        }
      }

      reply.send({
        valid: true,
        user: {
          id: user._id,
          username: user.username,
          subscription: user.subscription,
          usage: user.usage
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get user profile
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
      const { code } = request.body;

      if (!code) {
        return reply.status(400).send({ error: 'Invite code is required' });
      }

      const invite = await InviteCode.findOne({ 
        code: code.toUpperCase(), 
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!invite) {
        return reply.status(400).send({ error: 'Invalid or expired invite code' });
      }

      const plans = require('../config/plans.json');
      const plan = plans[invite.plan];

      reply.send({
        valid: true,
        plan: {
          name: plan.name,
          features: plan.features,
          duration: invite.duration
        }
      });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = authRoutes;