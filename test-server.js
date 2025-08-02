const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register plugins
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Mock configuration routes
fastify.get('/api/config/all', async (request, reply) => {
  try {
    const [plansData, linksData, appData] = await Promise.all([
      require('fs').promises.readFile(path.join(__dirname, 'config/plans.json'), 'utf8'),
      require('fs').promises.readFile(path.join(__dirname, 'config/links.json'), 'utf8'),
      require('fs').promises.readFile(path.join(__dirname, 'config/app.json'), 'utf8')
    ]);

    const plans = JSON.parse(plansData);
    const links = JSON.parse(linksData);
    const app = JSON.parse(appData);

    reply.send({
      success: true,
      config: {
        plans: plans.plans,
        links,
        app
      }
    });
  } catch (error) {
    reply.status(500).send({ error: 'Failed to load configuration' });
  }
});

fastify.get('/api/config/plans', async (request, reply) => {
  try {
    const data = await require('fs').promises.readFile(path.join(__dirname, 'config/plans.json'), 'utf8');
    const plans = JSON.parse(data);
    reply.send({ success: true, plans: plans.plans });
  } catch (error) {
    reply.status(500).send({ error: 'Failed to load plans configuration' });
  }
});

fastify.get('/api/config/links', async (request, reply) => {
  try {
    const data = await require('fs').promises.readFile(path.join(__dirname, 'config/links.json'), 'utf8');
    const links = JSON.parse(data);
    reply.send({ success: true, links });
  } catch (error) {
    reply.status(500).send({ error: 'Failed to load links configuration' });
  }
});

// Mock invite validation
fastify.post('/api/auth/validate-invite', async (request, reply) => {
  const { inviteCode } = request.body;
  
  if (!inviteCode) {
    return reply.status(400).send({ error: 'Invite code is required' });
  }

  // Mock validation - you can customize this
  if (inviteCode === 'DUCK-PREMIUM-2024' || inviteCode === 'TEST-INVITE') {
    const plansData = require('./config/plans.json');
    const plan = plansData.plans.premium;
    
    reply.send({
      success: true,
      valid: true,
      plan: {
        name: plan.name,
        price: plan.price,
        features: plan.features
      },
      inviter: 'TestUser'
    });
  } else {
    reply.status(400).send({ error: 'Invalid or expired invite code' });
  }
});

// Mock dashboard stats (for testing)
fastify.get('/api/dashboard/stats', async (request, reply) => {
  reply.send({
    stats: {
      projects: 3,
      scripts: 12,
      users: 45,
      executions: 1234
    },
    monthlyStats: {
      obfuscations: {
        used: 150,
        limit: 500,
        percentage: 30
      },
      users: {
        used: 45,
        limit: 100,
        percentage: 45
      }
    }
  });
});

// Mock analytics
fastify.get('/api/analytics/executions', async (request, reply) => {
  const days = parseInt(request.query.days) || 10;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const executions = Math.floor(Math.random() * 100) + 20;
    const successful = Math.floor(executions * (0.8 + Math.random() * 0.15));
    const failed = executions - successful;
    
    data.push({
      date: date.toISOString().split('T')[0],
      executions,
      successful,
      failed
    });
  }
  
  reply.send({
    success: true,
    data
  });
});

// Mock notifications
fastify.get('/api/notifications/unread-count', async (request, reply) => {
  reply.send({
    success: true,
    unreadCount: {
      user: 2,
      global: 1,
      total: 3
    }
  });
});

fastify.get('/api/notifications/user', async (request, reply) => {
  reply.send({
    success: true,
    notifications: [
      {
        _id: '1',
        title: 'Welcome to Duck Auth!',
        message: 'Thank you for joining our platform. Get started by creating your first project.',
        type: 'info',
        createdAt: new Date().toISOString(),
        displaySettings: { showConfetti: true }
      }
    ]
  });
});

fastify.get('/api/notifications/global', async (request, reply) => {
  reply.send({
    success: true,
    notifications: [
      {
        _id: '2',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2-4 AM EST.',
        type: 'warning',
        createdAt: new Date().toISOString(),
        isRead: false
      }
    ]
  });
});

fastify.post('/api/notifications/:id/read', async (request, reply) => {
  reply.send({ success: true, message: 'Notification marked as read' });
});

// Serve frontend
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

fastify.get('/dashboard', async (request, reply) => {
  return reply.sendFile('dashboard/index.html');
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Test server running on http://localhost:3000');
    console.log('Landing page: http://localhost:3000');
    console.log('Dashboard: http://localhost:3000/dashboard');
    console.log('Use invite code: DUCK-PREMIUM-2024 or TEST-INVITE for testing');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();