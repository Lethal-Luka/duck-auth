const Script = require('../models/Script');
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

async function scriptRoutes(fastify, options) {
  // Get all scripts for user
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      // Get user's projects
      const projects = await Project.find({
        $or: [
          { owner: request.user._id },
          { 'collaborators.user': request.user._id }
        ]
      });

      const projectIds = projects.map(p => p._id);
      
      // Get scripts from user's projects
      const scripts = await Script.find({
        project: { $in: projectIds }
      }).populate('project', 'name');

      reply.send({ scripts });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create new script
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { name, content, projectId, settings } = request.body;

      if (!name || !content || !projectId) {
        return reply.status(400).send({ error: 'Name, content, and project ID are required' });
      }

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Generate loader script
      const loader = `-- Duck Auth Loader v1.0
-- Project: ${project.name}
-- Script: ${name}
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function authenticate()
    local player = Players.LocalPlayer
    if not player then return false end
    
    -- Authentication check
    local success, result = pcall(function()
        return HttpService:GetAsync("https://your-domain.com/api/scripts/${projectId}/verify?user=" .. player.UserId)
    end)
    
    if success and result == "authorized" then
        return true
    end
    
    return false
end

if authenticate() then
    -- Execute protected script
    ${content}
else
    player:Kick("Duck Auth: Access denied")
end`;

      const script = new Script({
        name,
        content,
        loader,
        project: projectId,
        owner: request.user._id,
        settings: settings || {
          loaderType: 'basic',
          options: {
            owo: false,
            obfuscated: true,
            minified: true
          }
        }
      });

      await script.save();
      await script.populate('project', 'name');

      reply.send({ script, message: 'Script created successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get script by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const script = await Script.findById(request.params.id).populate('project');

      if (!script) {
        return reply.status(404).send({ error: 'Script not found' });
      }

      // Check access through project
      const project = await Project.findById(script.project._id);
      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      reply.send({ script });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update script
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { name, content, settings, status } = request.body;

      const script = await Script.findById(request.params.id).populate('project');
      if (!script) {
        return reply.status(404).send({ error: 'Script not found' });
      }

      // Check access
      const project = await Project.findById(script.project._id);
      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Update fields
      if (name) script.name = name;
      if (content) {
        script.content = content;
        // Regenerate loader with new content
        script.loader = `-- Duck Auth Loader v1.0
-- Project: ${script.project.name}
-- Script: ${script.name}
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function authenticate()
    local player = Players.LocalPlayer
    if not player then return false end
    
    return true -- Simplified for demo
end

if authenticate() then
    ${content}
else
    game.Players.LocalPlayer:Kick("Duck Auth: Access denied")
end`;
      }
      if (settings) script.settings = { ...script.settings, ...settings };
      if (status) script.status = status;

      await script.save();

      reply.send({ script, message: 'Script updated successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Delete script
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const script = await Script.findById(request.params.id).populate('project');
      if (!script) {
        return reply.status(404).send({ error: 'Script not found' });
      }

      // Check access
      const project = await Project.findById(script.project._id);
      const hasAccess = project.owner.toString() === request.user._id.toString() ||
        project.collaborators.some(c => c.user.toString() === request.user._id.toString());

      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await Script.findByIdAndDelete(request.params.id);

      reply.send({ message: 'Script deleted successfully' });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get loader for script (public endpoint)
  fastify.get('/:projectId/loader', async (request, reply) => {
    try {
      const project = await Project.findById(request.params.projectId);
      if (!project || !project.isActive) {
        return reply.status(404).send('-- Project not found or inactive');
      }

      const loader = `-- Duck Auth Loader v1.0
-- Project: ${project.name}
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function authenticate()
    local player = Players.LocalPlayer
    if not player then return false end
    
    -- Add your authentication logic here
    return true
end

if authenticate() then
    print("Duck Auth: Authentication successful")
    return true
else
    game.Players.LocalPlayer:Kick("Duck Auth: Authentication failed")
    return false
end`;

      reply.type('text/plain').send(loader);
    } catch (error) {
      reply.status(500).send('-- Error loading script');
    }
  });
}

module.exports = scriptRoutes;