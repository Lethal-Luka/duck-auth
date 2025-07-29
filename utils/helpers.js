const crypto = require('crypto');

const generateApiKey = () => {
  return `duck_${crypto.randomBytes(32).toString('hex')}`;
};

const generateLoader = (projectId, scriptContent) => {
  return `-- Duck Auth Loader v1.0
-- Project ID: ${projectId}
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local function authenticate()
    local player = Players.LocalPlayer
    if not player then return false end
    
    -- Authentication logic here
    local success, result = pcall(function()
        return HttpService:GetAsync("https://your-domain.com/api/scripts/${projectId}/verify?user=" .. player.UserId)
    end)
    
    if success and result == "authorized" then
        return true
    end
    
    return false
end

if authenticate() then
    -- Execute the protected script
    ${scriptContent}
else
    game.Players.LocalPlayer:Kick("Duck Auth: Access denied")
end`;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

module.exports = {
  generateApiKey,
  generateLoader,
  sanitizeInput,
  validateEmail,
  validateUsername
};