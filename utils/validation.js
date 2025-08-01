const validateProjectData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Project name is required');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Project name must be less than 100 characters');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return errors;
};

const validateScriptData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Script name is required');
  }
  
  if (!data.content || data.content.trim().length === 0) {
    errors.push('Script content is required');
  }
  
  if (!data.projectId) {
    errors.push('Project ID is required');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Script name must be less than 100 characters');
  }
  
  return errors;
};

const validateUserData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.username) {
    if (!data.username || data.username.trim().length === 0) {
      errors.push('Username is required');
    }
    
    if (data.username && (data.username.length < 3 || data.username.length > 30)) {
      errors.push('Username must be between 3 and 30 characters');
    }
    
    if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
  }
  
  if (!isUpdate || data.email) {
    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email is required');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
  }
  
  if (!isUpdate || data.password) {
    if (!data.password || data.password.length === 0) {
      errors.push('Password is required');
    }
    
    if (data.password && data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
  }
  
  return errors;
};

module.exports = {
  validateProjectData,
  validateScriptData,
  validateUserData
};