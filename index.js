const fastify = require('fastify')({ logger: true });
const path = require('path');
const connectDB = require('./config/database');

// Register plugins
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Database connection
connectDB();

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/projects'), { prefix: '/api/projects' });
fastify.register(require('./routes/scripts'), { prefix: '/api/scripts' });
fastify.register(require('./routes/users'), { prefix: '/api/users' });
fastify.register(require('./routes/dashboard'), { prefix: '/api/dashboard' });

// Serve frontend
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

fastify.get('/dashboard', async (request, reply) => {
  return reply.sendFile(path.join(__dirname, 'public') + "/dashboard/index.html");
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();