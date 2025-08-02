const fs = require('fs').promises;
const path = require('path');

async function configRoutes(fastify, options) {
  // Get subscription plans
  fastify.get('/plans', async (request, reply) => {
    try {
      const plansPath = path.join(__dirname, '../config/plans.json');
      const data = await fs.readFile(plansPath, 'utf8');
      const plans = JSON.parse(data);
      
      reply.send({ success: true, plans: plans.plans });
    } catch (error) {
      reply.status(500).send({ error: 'Failed to load plans configuration' });
    }
  });

  // Get external links
  fastify.get('/links', async (request, reply) => {
    try {
      const linksPath = path.join(__dirname, '../config/links.json');
      const data = await fs.readFile(linksPath, 'utf8');
      const links = JSON.parse(data);
      
      reply.send({ success: true, links });
    } catch (error) {
      reply.status(500).send({ error: 'Failed to load links configuration' });
    }
  });

  // Get app configuration
  fastify.get('/app', async (request, reply) => {
    try {
      const appPath = path.join(__dirname, '../config/app.json');
      const data = await fs.readFile(appPath, 'utf8');
      const app = JSON.parse(data);
      
      reply.send({ success: true, app });
    } catch (error) {
      reply.status(500).send({ error: 'Failed to load app configuration' });
    }
  });

  // Get all configurations (combined endpoint)
  fastify.get('/all', async (request, reply) => {
    try {
      const [plansData, linksData, appData] = await Promise.all([
        fs.readFile(path.join(__dirname, '../config/plans.json'), 'utf8'),
        fs.readFile(path.join(__dirname, '../config/links.json'), 'utf8'),
        fs.readFile(path.join(__dirname, '../config/app.json'), 'utf8')
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
}

module.exports = configRoutes;