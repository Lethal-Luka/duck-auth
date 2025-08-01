// Dashboard-specific functionality
let currentUser = null;
let currentProjects = [];
let selectedProject = null;
let currentProjectScripts = [];
let currentUserKeys = [];

async function loadDashboard() {
    try {
        const data = await API.call('/api/dashboard/stats');
        
        if (data && data.stats) {
            document.getElementById('projectsCount').textContent = data.stats.projects;
            document.getElementById('scriptsCount').textContent = data.stats.scripts;
            document.getElementById('userKeysCount').textContent = data.stats.users;
            document.getElementById('executionsCount').textContent = data.stats.executions;
        }

        if (data && data.monthlyStats) {
            const obf = data.monthlyStats.obfuscations;
            const keys = data.monthlyStats.users;
            
            document.getElementById('obfuscationsUsed').textContent = obf.used;
            document.getElementById('obfuscationsLimit').textContent = obf.limit;
            document.getElementById('obfuscationsProgress').style.width = obf.percentage + '%';
            
            document.getElementById('monthlyKeysUsed').textContent = keys.used;
            document.getElementById('monthlyKeysLimit').textContent = keys.limit;
            document.getElementById('keysProgress').style.width = keys.percentage + '%';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadProjects() {
    try {
        const data = await API.call('/api/projects');
        currentProjects = data.projects || [];
        
        if (currentProjects.length === 0) {
            document.getElementById('projectsGrid').innerHTML = `
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
            
            return `<div class="project-card" onclick="selectProject('${project._id}')" data-project-id="${project._id}">
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
                <p style="color: var(--text-secondary); margin-bottom: 10px;">${project.description || 'No description'}</p>
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
            </div>`;
        }).join('');
        
        document.getElementById('projectsGrid').innerHTML = projectsHtml;
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsGrid').innerHTML = '<p style="color: var(--text-secondary);">Error loading projects</p>';
        showNotification('Error loading projects', 'error');
    }
}

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

async function loadProjectScripts() {
    if (!selectedProject) return;

    try {
        const data = await API.call(`/api/projects/${selectedProject._id}`);
        currentProjectScripts = data.scripts || [];
        
        if (currentProjectScripts.length === 0) {
            document.getElementById('projectScriptsContainer').innerHTML = `
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
            
            return `<div class="script-item">
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
                    <span style="color: white" class="script-status status-${script.status || 'active'}">${script.status || 'active'}</span>
                </div>
                <div class="script-actions">
                    <button class="btn btn-secondary btn-small" onclick="openScriptSettings('${script._id}')">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn btn-primary btn-small" onclick="getLoader('${script._id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteScript('${script._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
        
        document.getElementById('projectScriptsContainer').innerHTML = scriptsHtml;
    } catch (error) {
        console.error('Error loading project scripts:', error);
        document.getElementById('projectScriptsContainer').innerHTML = '<p style="color: var(--text-secondary);">Error loading scripts</p>';
        showNotification('Error loading scripts', 'error');
    }
}

async function loadUserKeys() {
    if (!selectedProject) return;

    try {
        const data = await API.call(`/api/projects/${selectedProject._id}/keys`);
        currentUserKeys = data.userKeys || [];
        
        if (currentUserKeys.length === 0) {
            document.getElementById('userKeysContainer').innerHTML = `
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
                   
            return `<div class="user-key-item">
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
                    <button class="btn btn-secondary btn-small" onclick="copyText('${userKey.key}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="removeUserKey('${userKey._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        document.getElementById('userKeysContainer').innerHTML = keysHtml;
    } catch (error) {
        console.error('Error loading user keys:', error);
        document.getElementById('userKeysContainer').innerHTML = '<p style="color: var(--text-secondary);">Error loading user keys</p>';
        showNotification('Error loading user keys', 'error');
    }
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

// Open script settings with toggle buttons
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
                <div class="button-group">
                    <button type="button" class="btn ${script.settings?.owo ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="toggleScriptOption(this, 'owo')" data-option="owo">
                        <i class="fas fa-shield-alt"></i> OWO Protection
                    </button>
                    <button type="button" class="btn ${script.settings?.obfuscated ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="toggleScriptOption(this, 'obfuscated')" data-option="obfuscated">
                        <i class="fas fa-lock"></i> Obfuscated
                    </button>
                    <button type="button" class="btn ${script.settings?.minified ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="toggleScriptOption(this, 'minified')" data-option="minified">
                        <i class="fas fa-compress"></i> Minified
                    </button>
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
    
    // Store current settings
    window.currentScriptSettings = {
        owo: script.settings?.owo || false,
        obfuscated: script.settings?.obfuscated || false,
        minified: script.settings?.minified || false
    };
    
    document.getElementById('scriptSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const scriptName = formData.get('name');
        
        try {
            await API.call(`/api/scripts/${scriptId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: scriptName,
                    settings: window.currentScriptSettings
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

// Toggle script option button
function toggleScriptOption(button, option) {
    const isActive = button.classList.contains('btn-primary');
    
    if (isActive) {
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
        window.currentScriptSettings[option] = false;
    } else {
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');
        window.currentScriptSettings[option] = true;
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
        
        // Update dashboard stats
        loadDashboard();
        
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
        loadDashboard();
        
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
        loadProjects();
        loadDashboard();
        
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
        loadProjects();
        loadDashboard();
        
        return result;
        
    } catch (error) {
        console.error('Error generating user keys:', error);
        showNotification('Error generating user keys', 'error');
        throw error;
    }
}

async function loadAuditLogs() {
    try {
        const data = await API.call('/api/audit-logs');
        const auditLogs = data.logs || [];
        
        if (auditLogs.length === 0) {
            document.getElementById('auditLogsContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Activity Yet</h3>
                    <p>Your account activity will appear here</p>
                </div>
            `;
            return;
        }
        
        const logsHtml = auditLogs.map(log => {
            const date = new Date(log.timestamp);
            const timeAgo = getTimeAgo(date);
            
            return `<div class="audit-log-item">
                <div class="log-icon">
                    <i class="fas ${getLogIcon(log.action)}"></i>
                </div>
                <div class="log-content">
                    <div class="log-action">${formatActionName(log.action)}</div>
                    <div class="log-details">${log.details}</div>
                    <div class="log-meta">
                        <span class="log-time">${timeAgo}</span>
                        <span class="log-ip">IP: ${log.ipAddress}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        document.getElementById('auditLogsContainer').innerHTML = logsHtml;
    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('auditLogsContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Activity</h3>
                <p>Unable to load your recent activity</p>
            </div>
        `;
    }
}

function formatActionName(action) {
    const actionNames = {
        'LOGIN': 'Logged In',
        'LOGOUT': 'Logged Out',
        'PROJECT_CREATED': 'Project Created',
        'PROJECT_UPDATED': 'Project Updated',
        'PROJECT_DELETED': 'Project Deleted',
        'SCRIPT_UPLOADED': 'Script Uploaded',
        'SCRIPT_UPDATED': 'Script Updated',
        'SCRIPT_DELETED': 'Script Deleted',
        'SCRIPT_MODIFIED': 'Script Modified',
        'KEY_GENERATED': 'User Key Generated',
        'KEY_DELETED': 'User Key Deleted',
        'PROFILE_UPDATED': 'Profile Updated',
        'PASSWORD_CHANGED': 'Password Changed',
        'API_KEY_REGENERATED': 'API Key Regenerated'
    };
    return actionNames[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function getLogIcon(action) {
    const iconMap = {
        'LOGIN': 'fa-sign-in-alt',
        'LOGOUT': 'fa-sign-out-alt',
        'PROJECT_CREATED': 'fa-folder-plus',
        'PROJECT_UPDATED': 'fa-folder-edit',
        'PROJECT_DELETED': 'fa-folder-minus',
        'SCRIPT_UPLOADED': 'fa-upload',
        'SCRIPT_UPDATED': 'fa-file-edit',
        'SCRIPT_DELETED': 'fa-trash',
        'SCRIPT_MODIFIED': 'fa-edit',
        'KEY_GENERATED': 'fa-key',
        'KEY_DELETED': 'fa-key',
        'PROFILE_UPDATED': 'fa-user-edit',
        'PASSWORD_CHANGED': 'fa-lock',
        'API_KEY_REGENERATED': 'fa-sync'
    };
    return iconMap[action] || 'fa-info-circle';
}

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

function removeUserKey(keyId) {
    if (!confirm('Are you sure you want to remove this user key?')) return;
    
    try {
        API.call(`/api/user-keys/${keyId}`, {
            method: 'DELETE'
        }).then(() => {
            loadUserKeys();
            loadProjects();
            loadDashboard();
            showNotification('User key removed successfully!', 'success');
        });
    } catch (error) {
        console.error('Error removing user key:', error);
        showNotification('Error removing user key', 'error');
    }
}

async function deleteScript(scriptId) {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
        const result = await API.call(`/api/scripts/${scriptId}`, {
            method: 'DELETE'
        });
        
        if (result && result.message) {
            loadProjectScripts();
            loadProjects();
            loadDashboard();
            showNotification('Script deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Error deleting script:', error);
        showNotification('Error deleting script', 'error');
    }
}

// Add these subscription functions to your existing dashboard.js

let currentSubscription = null;

async function loadSubscription() {
    try {
        const data = await API.call('/api/subscription');
        currentSubscription = data.subscription || null;
        
        displaySubscriptionPlans();
        displayCurrentSubscription();
    } catch (error) {
        console.error('Error loading subscription:', error);
        
        // Create containers if they don't exist
        createSubscriptionContainers();
        
        // Show empty states since API failed
        displayCurrentSubscription();
        displaySubscriptionPlans();
    }
}

function createSubscriptionContainers() {
    // Check if subscription section exists
    let subscriptionSection = document.getElementById('subscriptionSection');
    if (!subscriptionSection) {
        // Create the entire subscription section
        subscriptionSection = document.createElement('div');
        subscriptionSection.id = 'subscriptionSection';
        subscriptionSection.className = 'section';
        subscriptionSection.style.display = 'none';
        
        subscriptionSection.innerHTML = `
            <div class="section-header">
                <h2>Subscription Management</h2>
                <p>Manage your Duck Auth subscription and billing</p>
            </div>

            <!-- Current Subscription -->
            <div id="currentSubscriptionContainer">
                <!-- Current subscription will be loaded here -->
            </div>

            <!-- Available Plans -->
            <div class="subscription-plans">
                <h3>Available Plans</h3>
                <div id="subscriptionPlansContainer" class="plans-grid">
                    <!-- Subscription plans will be loaded here -->
                </div>
            </div>
        `;
        
        document.querySelector('.main-content').appendChild(subscriptionSection);
    }
    
    // Ensure containers exist
    if (!document.getElementById('currentSubscriptionContainer')) {
        const container = document.createElement('div');
        container.id = 'currentSubscriptionContainer';
        subscriptionSection.appendChild(container);
    }
    
    if (!document.getElementById('subscriptionPlansContainer')) {
        const container = document.createElement('div');
        container.id = 'subscriptionPlansContainer';
        container.className = 'plans-grid';
        subscriptionSection.appendChild(container);
    }
}

function displayCurrentSubscription() {
    const container = document.getElementById('currentSubscriptionContainer');
    if (!container) {
        createSubscriptionContainers();
        return displayCurrentSubscription();
    }
    
    if (!currentSubscription) {
        container.innerHTML = `
            <div class="current-subscription-card">
                <div class="subscription-header">
                    <h3>Current Subscription</h3>
                    <span class="subscription-status status-inactive">Free Plan</span>
                </div>
                <div class="subscription-details">
                    <p style="margin-bottom: 20px; color: var(--text-secondary);">You're currently using the free plan with limited features.</p>
                    <div class="subscription-limits">
                        <div class="limit-item">
                            <i class="fas fa-folder"></i>
                            <span>1 Project Maximum</span>
                        </div>
                        <div class="limit-item">
                            <i class="fas fa-code"></i>
                            <span>3 Scripts per Project</span>
                        </div>
                        <div class="limit-item">
                            <i class="fas fa-users"></i>
                            <span>10 User Keys per Project</span>
                        </div>
                    </div>
                    <div class="subscription-actions">
                        <button class="btn btn-primary" onclick="openBuyModal('basic', false)">
                            <i class="fas fa-arrow-up"></i> Upgrade Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    const expirationDate = new Date(currentSubscription.expiresAt);
    const timeUntilExpiry = getTimeUntilExpiry(expirationDate);
    
    container.innerHTML = `
        <div class="current-subscription-card">
            <div class="subscription-header">
                <h3>${currentSubscription.planName}</h3>
                <span class="subscription-status status-${currentSubscription.status}">${currentSubscription.status}</span>
            </div>
            <div class="subscription-details">
                <div class="subscription-info">
                    <div class="info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Expires: ${expirationDate.toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${timeUntilExpiry}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>$${currentSubscription.price}/month</span>
                    </div>
                </div>
                <div class="subscription-features">
                    <h4>Your Plan Includes:</h4>
                    <ul>
                        ${currentSubscription.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                    </ul>
                </div>
                <div class="subscription-actions">
                    <button class="btn btn-primary" onclick="openBuyModal('${currentSubscription.planId}', true)">
                        <i class="fas fa-redo"></i> Renew Subscription
                    </button>
                    <button class="btn btn-secondary" onclick="cancelSubscription()">
                        <i class="fas fa-times"></i> Cancel Subscription
                    </button>
                </div>
            </div>
        </div>
    `;
}

function displaySubscriptionPlans() {
    const container = document.getElementById('subscriptionPlansContainer');
    if (!container) {
        createSubscriptionContainers();
        return displaySubscriptionPlans();
    }
    
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            description: 'Perfect for small projects',
            price: 9.99,
            period: 'month',
            popular: false,
            features: [
                'Up to 5 Projects',
                '25 Scripts per Project',
                '100 User Keys per Project',
                'Basic Obfuscation',
                'Email Support'
            ]
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'For serious developers and businesses',
            price: 19.99,
            period: 'month',
            popular: true,
            features: [
                'Unlimited Projects',
                'Unlimited Scripts',
                '500 User Keys per Project',
                'Advanced Obfuscation',
                'OWO Protection',
                'Priority Support',
                'Custom Domains'
            ]
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Custom solutions for large teams',
            price: 'Custom',
            period: 'pricing',
            popular: false,
            features: [
                'Everything in Pro',
                'Unlimited User Keys',
                'White-label Solution',
                'Custom Integrations',
                'Dedicated Support',
                'SLA Guarantee',
                'On-premise Deployment'
            ]
        }
    ];
    
    const plansHtml = plans.map(plan => `
        <div class="subscription-plan-card ${plan.popular ? 'popular' : ''}">
            <h3>${plan.name}</h3>
            <div class="description">${plan.description}</div>
            <div class="plan-price">
                ${plan.price === 'Custom' ? 'Custom' : '$' + plan.price}
                <span class="period">${plan.price === 'Custom' ? 'pricing' : '/' + plan.period}</span>
            </div>
            <ul>
                ${plan.features.map(feature => `<li><span class="check">✓</span> ${feature}</li>`).join('')}
            </ul>
            <div class="plan-actions">
                ${plan.id === 'enterprise' 
                    ? `<button class="btn" onclick="contactUsForEnterprise()">Contact Sales</button>`
                    : `<button class="btn" onclick="openBuyModal('${plan.id}', false)">
                         ${plan.popular ? 'Upgrade to Pro' : 'Get Started'}
                       </button>`
                }
            </div>
        </div>
    `).join('');
    
    container.innerHTML = plansHtml;
}

function contactUsForEnterprise() {
    // Open Discord link in new tab
    const discordUrl = 'https://discord.gg/duckauth';
    window.open(discordUrl, '_blank');
    showNotification('Opening Discord for Enterprise inquiries...', 'info');
}

function openBuyModal(planId, isRenewal) {
    const plans = {
        'basic': { name: 'Basic', price: 9.99 },
        'pro': { name: 'Pro', price: 19.99 },
        'enterprise': { name: 'Enterprise', price: 49.99 }
    };
    
    const plan = plans[planId];
    if (!plan) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = `${isRenewal ? 'Renew' : 'Purchase'} ${plan.name} Plan`;
    body.innerHTML = `
        <div class="buy-modal-content">
            <div class="plan-summary">
                <h4>${plan.name} Plan</h4>
                <div class="price-display">
                    <span class="price">$${plan.price}</span>
                    <span class="period">/month</span>
                </div>
                <p style="color: var(--text-secondary); margin-top: 10px;">
                    ${isRenewal ? 'Extend your current subscription' : 'Get access to all premium features'}
                </p>
            </div>
            
            <div class="payment-methods">
                <h4>Choose Payment Method</h4>
                <div class="payment-options">
                    <div class="payment-option" onclick="buyWithCrypto('${planId}')">
                        <div class="payment-icon">
                            <i class="fab fa-bitcoin"></i>
                        </div>
                        <div class="payment-info">
                            <h5>Crypto Payment (Official)</h5>
                            <p>Pay with Bitcoin, Ethereum, and other cryptocurrencies</p>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    
                    <div class="payment-option" onclick="buyFromReseller('${planId}')">
                        <div class="payment-icon">
                            <i class="fas fa-credit-card"></i>
                        </div>
                        <div class="payment-info">
                            <h5>Buy from Reseller</h5>
                            <p>PayPal, CashApp, and other payment methods</p>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
            
            <div class="buy-modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function buyWithCrypto(planId) {
    // Open Sellix page in new tab
    const sellixUrl = `https://duck-auth.sellix.io/product/${planId}`;
    window.open(sellixUrl, '_blank');
    closeModal();
    showNotification('Redirecting to secure crypto payment...', 'info');
}

function buyFromReseller(planId) {
    // Open Discord link in new tab
    const discordUrl = 'https://discord.gg/duckauth';
    window.open(discordUrl, '_blank');
    closeModal();
    showNotification('Opening Discord for reseller purchase...', 'info');
}

async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
        return;
    }
    
    try {
        await API.call('/api/subscription/cancel', {
            method: 'POST'
        });
        
        showNotification('Subscription cancelled successfully', 'success');
        loadSubscription();
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        showNotification('Error cancelling subscription', 'error');
    }
}

function getTimeUntilExpiry(expirationDate) {
    const now = new Date();
    const diffInMs = expirationDate - now;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
        return 'Expired';
    } else if (diffInDays === 0) {
        return 'Expires today';
    } else if (diffInDays === 1) {
        return 'Expires tomorrow';
    } else if (diffInDays < 30) {
        return `Expires in ${diffInDays} days`;
    } else {
        const diffInMonths = Math.floor(diffInDays / 30);
        return `Expires in ${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
    }
}

// Add these to your existing window exports at the end of dashboard.js
window.loadSubscription = loadSubscription;
window.openBuyModal = openBuyModal;
window.buyWithCrypto = buyWithCrypto;
window.buyFromReseller = buyFromReseller;
window.cancelSubscription = cancelSubscription;
window.currentSubscription = currentSubscription;

// Export functions for global access
window.loadDashboard = loadDashboard;
window.loadProjects = loadProjects;
window.selectProject = selectProject;
window.switchProjectTab = switchProjectTab;
window.closeProjectDetails = closeProjectDetails;
window.loadProjectScripts = loadProjectScripts;
window.loadUserKeys = loadUserKeys;
window.loadAuditLogs = loadAuditLogs;
window.getLoader = getLoader;
window.openScriptSettings = openScriptSettings;
window.toggleScriptOption = toggleScriptOption;
window.openProjectSettings = openProjectSettings;
window.confirmDeleteProject = confirmDeleteProject;
window.deleteProject = deleteProject;
window.createProject = createProject;
window.uploadScript = uploadScript;
window.generateUserKeys = generateUserKeys;
window.removeUserKey = removeUserKey;
window.deleteScript = deleteScript;
window.getTimeAgo = getTimeAgo;
window.currentUser = currentUser;
window.currentProjects = currentProjects;
window.selectedProject = selectedProject;
window.currentProjectScripts = currentProjectScripts;
window.currentUserKeys = currentUserKeys;
window.contactUsForEnterprise = contactUsForEnterprise;