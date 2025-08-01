// Projects management for Duck Auth

let currentProjects = [];
let selectedProject = null;
let currentProjectScripts = [];
let currentUserKeys = [];

// Load all projects
async function loadProjects() {
    try {
        const data = await API.call('/api/projects');
        currentProjects = data.projects || [];
        
        displayProjects();
        
        // Update dashboard stats if dashboard is loaded
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsGrid').innerHTML = '<p style="color: var(--text-secondary);">Error loading projects</p>';
        showNotification('Error loading projects', 'error');
    }
}

// Display projects in the grid
function displayProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    if (!projectsGrid) return;
    
    if (currentProjects.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Projects Yet</h3>
                <p>Create your first project to get started with Duck Auth</p>
                <button class="btn btn-primary" onclick="openModal('createProject')">
                    <i class="fas fa-plus"></i> Create Project
                </button>
            </div>
        `;
        return;
    }
    
    const projectsHtml = currentProjects.map(project => {
        const createdDate = new Date(project.createdAt);
        const lastActivity = new Date(project.lastActivity || project.createdAt);
        const timeAgo = getTimeAgo(lastActivity);
        
        return `
            <div class="project-card ${selectedProject?._id === project._id ? 'selected' : ''}" 
                 onclick="selectProject('${project._id}')" data-project-id="${project._id}">
                <div class="project-header">
                    <div class="project-name">${project.name}</div>
                    <div class="project-actions">
                        <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); openProjectSettings('${project._id}')" title="Project Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); confirmDeleteProject('${project._id}')" title="Delete Project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="project-description">${project.description || 'No description'}</p>
                <div class="project-stats">
                    <div class="stat-item">
                        <i class="fas fa-code"></i>
                        <span>${project.scriptsCount || 0} Scripts</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-users"></i>
                        <span>${project.userKeysCount || 0} Keys</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <div class="project-footer">
                    <small>Created: ${createdDate.toLocaleDateString()}</small>
                </div>
            </div>
        `;
    }).join('');
    
    projectsGrid.innerHTML = projectsHtml;
}

// Select a project and show its details
function selectProject(projectId) {
    selectedProject = currentProjects.find(p => p._id === projectId);
    if (!selectedProject) return;

    // Update UI
    document.querySelectorAll('.project-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-project-id="${projectId}"]`).classList.add('selected');

    document.getElementById('selectedProjectName').textContent = selectedProject.name;
    document.getElementById('projectDetails').classList.add('active');
    document.getElementById('projectDetails').style.display = 'block';

    // Reset tabs to default (scripts)
    switchProjectTab('scripts');

    // Load project data
    loadProjectScripts();
    loadUserKeys();
    
    showNotification(`Selected project: ${selectedProject.name}`, 'info');
}

// Switch between project tabs
function switchProjectTab(tabName) {
    // Update tab navigation
    document.querySelectorAll('.section-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
}

// Close project details panel
function closeProjectDetails() {
    document.getElementById('projectDetails').style.display = 'none';
    document.getElementById('projectDetails').classList.remove('active');
    document.querySelectorAll('.project-card').forEach(card => {
        card.classList.remove('selected');
    });
    selectedProject = null;
    currentProjectScripts = [];
    currentUserKeys = [];
}

// Load scripts for the selected project
async function loadProjectScripts() {
    if (!selectedProject) return;

    try {
        const data = await API.call(`/api/projects/${selectedProject._id}`);
        currentProjectScripts = data.scripts || [];
        
        displayProjectScripts();
    } catch (error) {
        console.error('Error loading project scripts:', error);
        document.getElementById('projectScriptsContainer').innerHTML = '<p style="color: var(--text-secondary);">Error loading scripts</p>';
        showNotification('Error loading scripts', 'error');
    }
}

// Display project scripts
function displayProjectScripts() {
    const container = document.getElementById('projectScriptsContainer');
    if (!container) return;
    
    if (currentProjectScripts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-code"></i>
                <h3>No Scripts Yet</h3>
                <p>Upload your first script to get started</p>
                <button class="btn btn-primary" onclick="openModal('uploadScript')">
                    <i class="fas fa-upload"></i> Upload Script
                </button>
            </div>
        `;
        return;
    }
    
    const scriptsHtml = currentProjectScripts.map(script => {
        const createdDate = new Date(script.createdAt);
        const timeAgo = getTimeAgo(createdDate);
        
        return `
            <div class="script-item">
                <div class="script-info">
                    <div class="script-name">${script.name}</div>
                    <div class="script-id">ID: ${script._id}</div>
                    <div class="script-meta">
                        <span><i class="fas fa-calendar"></i> ${timeAgo}</span>
                        ${script.settings?.owo ? '<span class="feature-tag">OWO</span>' : ''}
                        ${script.settings?.obfuscated ? '<span class="feature-tag">Obfuscated</span>' : ''}
                        ${script.settings?.minified ? '<span class="feature-tag">Minified</span>' : ''}
                    </div>
                </div>
                <div class="script-status-container">
                    <span class="script-status status-${script.status || 'active'}">${script.status || 'active'}</span>
                </div>
                <div class="script-actions">
                    <button class="btn btn-small btn-secondary" onclick="getLoader('${script._id}')" title="Get Loader">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="openScriptSettings('${script._id}')" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteScript('${script._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = scriptsHtml;
}

// Load user keys for the selected project
async function loadUserKeys() {
    if (!selectedProject) return;

    try {
        const data = await API.call(`/api/projects/${selectedProject._id}/keys`);
        currentUserKeys = data.userKeys || [];
        
        displayUserKeys();
    } catch (error) {
        console.error('Error loading user keys:', error);
        document.getElementById('userKeysContainer').innerHTML = '<p style="color: var(--text-secondary);">Error loading user keys</p>';
        showNotification('Error loading user keys', 'error');
    }
}

// Display user keys
function displayUserKeys() {
    const container = document.getElementById('userKeysContainer');
    if (!container) return;
    
    if (currentUserKeys.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-key"></i>
                <h3>No User Keys Yet</h3>
                <p>Generate user keys to allow access to your scripts</p>
                <button class="btn btn-primary" onclick="openModal('addUserKey')">
                    <i class="fas fa-key"></i> Generate Keys
                </button>
            </div>
        `;
        return;
    }
    
    const keysHtml = currentUserKeys.map(userKey => {
        const createdDate = new Date(userKey.createdAt);
        const timeAgo = getTimeAgo(createdDate);
        const lastLogin = userKey.lastLogin ? getTimeAgo(new Date(userKey.lastLogin)) : 'Never';
        
        const expirationInfo = userKey.expirationDate 
            ? `<div class="meta-item">
                 <i class="fas fa-hourglass-half"></i>
                 <span>Expires: ${new Date(userKey.expirationDate).toLocaleDateString()}</span>
               </div>`
            : `<div class="meta-item">
                 <i class="fas fa-infinity"></i>
                 <span>Never expires</span>
               </div>`;
        
        return `
            <div class="user-key-item">
                <div class="user-key-info">
                    <div class="user-key-header">
                        <div class="user-key-title">${userKey.username || userKey.key}</div>
                        <span class="user-key-status status-${userKey.status || 'active'}">${userKey.status || 'active'}</span>
                    </div>
                    <div class="user-key-details">
                        <div class="meta-item">
                            <i class="fas fa-key"></i>
                            <span class="key-value">${userKey.key}</span>
                        </div>
                        ${userKey.note ? `
                            <div class="meta-item">
                                <i class="fas fa-sticky-note"></i>
                                <span>Note: ${userKey.note}</span>
                            </div>
                        ` : ''}
                        <div class="meta-item">
                            <i class="fas fa-desktop"></i>
                            <span>HWID: ${userKey.hwid || 'Not bound'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Last Login: ${lastLogin}</span>
                        </div>
                        ${expirationInfo}
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Created: ${timeAgo}</span>
                        </div>
                    </div>
                </div>
                <div class="user-key-actions">
                    <button class="btn btn-small btn-secondary" onclick="copyText('${userKey.key}')" title="Copy Key">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="removeUserKey('${userKey._id}')" title="Delete Key">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = keysHtml;
}

// Get loader for script
function getLoader(scriptId) {
    const script = currentProjectScripts.find(s => s._id === scriptId);
    if (!script) return;
    
    const loaderCode = `loadstring(game:HttpGet("https://api.duckauth.com/v1/scripts/${scriptId}/loader"))()`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(loaderCode).then(() => {
        showNotification('Loader copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = loaderCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Loader copied to clipboard!', 'success');
    });
}

// Open script settings
function openScriptSettings(scriptId) {
    const script = currentProjectScripts.find(s => s._id === scriptId);
    if (!script) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = 'Script Settings';
    body.innerHTML = `
        <form id="scriptSettingsForm">
            <div class="form-group">
                <label for="editScriptName">Script Name</label>
                <input type="text" id="editScriptName" name="name" value="${script.name}" required>
            </div>
            <div class="form-group">
                <label>Script Options</label>
                <div class="checkbox-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="owo" ${script.settings?.owo ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Enable OWO Protection
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" name="obfuscated" ${script.settings?.obfuscated ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Obfuscate Code
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" name="minified" ${script.settings?.minified ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Minify Code
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Script Statistics</label>
                <div style="background: var(--bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Status:</strong> ${script.status || 'active'}
                        </div>
                        <div>
                            <strong>ID:</strong> ${script._id}
                        </div>
                        <div>
                            <strong>Created:</strong> ${new Date(script.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                            <strong>Project:</strong> ${selectedProject.name}
                        </div>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    document.getElementById('scriptSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await API.call(`/api/scripts/${scriptId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: data.name,
                    settings: {
                        owo: data.owo === 'on',
                        obfuscated: data.obfuscated === 'on',
                        minified: data.minified === 'on'
                    }
                })
            });
            
            showNotification('Script settings updated successfully', 'success');
            closeModal();
            loadProjectScripts();
        } catch (error) {
            console.error('Error updating script:', error);
            showNotification('Error updating script settings', 'error');
        }
    });
}

// Delete script
async function deleteScript(scriptId) {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
        const result = await API.call(`/api/scripts/${scriptId}`, {
            method: 'DELETE'
        });
        
        if (result && result.message) {
            loadProjectScripts();
            showNotification('Script deleted successfully!', 'success');
            
            // Update dashboard stats
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('Error deleting script:', error);
        showNotification('Error deleting script', 'error');
    }
}

// Remove user key
function removeUserKey(keyId) {
    if (!confirm('Are you sure you want to remove this user key?')) return;
    
    try {
        API.call(`/api/user-keys/${keyId}`, {
            method: 'DELETE'
        }).then(() => {
            loadUserKeys();
            showNotification('User key removed successfully!', 'success');
            
            // Update dashboard stats
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        });
    } catch (error) {
        console.error('Error removing user key:', error);
        showNotification('Error removing user key', 'error');
    }
}

// Open project settings
function openProjectSettings(projectId) {
    const project = currentProjects.find(p => p._id === projectId);
    if (!project) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = 'Project Settings';
    body.innerHTML = `
        <form id="projectSettingsForm">
            <div class="form-group">
                <label for="editProjectName">Project Name</label>
                <input type="text" id="editProjectName" name="name" value="${project.name}" required>
            </div>
            <div class="form-group">
                <label for="editProjectDescription">Description</label>
                <textarea id="editProjectDescription" name="description" rows="3">${project.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Project Statistics</label>
                <div style="background: var(--bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Scripts:</strong> ${project.scriptsCount || 0}
                        </div>
                        <div>
                            <strong>User Keys:</strong> ${project.userKeysCount || 0}
                        </div>
                        <div>
                            <strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                            <strong>Last Activity:</strong> ${getTimeAgo(new Date(project.lastActivity || project.createdAt))}
                        </div>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    document.getElementById('projectSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await API.call(`/api/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            showNotification('Project updated successfully', 'success');
            closeModal();
            loadProjects();
            
            // Update selected project name if this is the one being viewed
            if (selectedProject && selectedProject._id === projectId) {
                selectedProject.name = data.name;
                selectedProject.description = data.description;
                document.getElementById('selectedProjectName').textContent = data.name;
            }
        } catch (error) {
            console.error('Error updating project:', error);
            showNotification('Error updating project', 'error');
        }
    });
}

// Confirm delete project
function confirmDeleteProject(projectId) {
    const project = currentProjects.find(p => p._id === projectId);
    if (!project) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = 'Delete Project';
    body.innerHTML = `
        <div class="form-group">
            <div style="color: var(--red); margin-bottom: 15px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; color: var(--red);"></i>
                <h3 style="color: var(--red);">Warning: This action cannot be undone!</h3>
            </div>
            <p style="margin-bottom: 15px;">
                You are about to delete the project "<strong>${project.name}</strong>".
                This will permanently delete:
            </p>
            <ul style="margin-bottom: 20px; padding-left: 20px;">
                <li>${project.scriptsCount || 0} scripts</li>
                <li>${project.userKeysCount || 0} user keys</li>
                <li>All project data and settings</li>
            </ul>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Type the project name "<strong>${project.name}</strong>" to confirm:
            </p>
        </div>
        <form id="deleteProjectForm">
            <div class="form-group">
                <input type="text" id="confirmProjectName" placeholder="Enter project name" required style="width: 100%;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn btn-danger">Delete Project</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    document.getElementById('deleteProjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const confirmName = document.getElementById('confirmProjectName').value;
        
        if (confirmName === project.name) {
            deleteProject(projectId);
            closeModal();
        } else {
            showNotification('Project name does not match', 'error');
        }
    });
}

// Delete project
async function deleteProject(projectId) {
    try {
        await API.call(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        showNotification('Project deleted successfully', 'success');
        
        // If this was the selected project, close details
        if (selectedProject && selectedProject._id === projectId) {
            closeProjectDetails();
        }
        
        // Refresh project list
        loadProjects();
        
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Error deleting project', 'error');
    }
}

// Create new project
async function createProject(projectData) {
    try {
        const result = await API.call('/api/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        
        showNotification('Project created successfully', 'success');
        loadProjects();
        
        // Update dashboard stats
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        
        return result;
        
    } catch (error) {
        console.error('Error creating project:', error);
        showNotification('Error creating project', 'error');
        throw error;
    }
}

// Upload script to current project
async function uploadScript(scriptData) {
    if (!selectedProject) {
        showNotification('Please select a project first', 'error');
        return;
    }
    
    try {
        const result = await API.call('/api/scripts', {
            method: 'POST',
            body: JSON.stringify({
                ...scriptData,
                projectId: selectedProject._id
            })
        });
        
        showNotification('Script uploaded successfully', 'success');
        loadProjectScripts();
        
        // Update dashboard stats
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        
        return result;
        
    } catch (error) {
        console.error('Error uploading script:', error);
        showNotification('Error uploading script', 'error');
        throw error;
    }
}

// Generate user keys for current project
async function generateUserKeys(keyData) {
    if (!selectedProject) {
        showNotification('Please select a project first', 'error');
        return;
    }
    
    try {
        const result = await API.call('/api/user-keys', {
            method: 'POST',
            body: JSON.stringify({
                ...keyData,
                projectId: selectedProject._id
            })
        });
        
        showNotification(`${keyData.count} user keys generated successfully`, 'success');
        loadUserKeys();
        
        // Update dashboard stats
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        
        return result;
        
    } catch (error) {
        console.error('Error generating user keys:', error);
        showNotification('Error generating user keys', 'error');
        throw error;
    }
}

// Utility function for time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Export functions for global access
window.loadProjects = loadProjects;
window.selectProject = selectProject;
window.switchProjectTab = switchProjectTab;
window.closeProjectDetails = closeProjectDetails;
window.loadProjectScripts = loadProjectScripts;
window.loadUserKeys = loadUserKeys;
window.displayProjectScripts = displayProjectScripts;
window.displayUserKeys = displayUserKeys;
window.createProject = createProject;
window.uploadScript = uploadScript;
window.generateUserKeys = generateUserKeys;
window.confirmDeleteProject = confirmDeleteProject;
window.deleteProject = deleteProject;
window.openProjectSettings = openProjectSettings;
window.deleteScript = deleteScript;
window.removeUserKey = removeUserKey;
window.getLoader = getLoader;
window.openScriptSettings = openScriptSettings;
window.getTimeAgo = getTimeAgo;

// Make data available globally
window.currentProjects = currentProjects;
window.selectedProject = selectedProject;
window.currentProjectScripts = currentProjectScripts;
window.currentUserKeys = currentUserKeys;