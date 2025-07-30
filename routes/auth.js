const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'duck-auth-secret-key-2024';

async function authRoutes(fastify, options) {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password } = request.body;

      if (!username || !email || !password) {
        return reply.status(400).send({ error: 'All fields are required' });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const apiKey = `duck_${uuidv4().replace(/-/g, '')}`;

      const user = new User({
        username,
        email,
        password,
        apiKey
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      reply.send({
        message: 'User registered successfully',
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
}

module.exports = authRoutes;