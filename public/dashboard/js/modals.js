// Modal management and form handling

function openModal(type) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    switch(type) {
        case 'createProject':
            title.textContent = 'Create New Project';
            body.innerHTML = `
                <form id="createProjectForm">
                    <div class="form-group">
                        <label for="projectName">Project Name</label>
                        <input type="text" id="projectName" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="projectDescription">Description</label>
                        <textarea id="projectDescription" name="description" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Create Project</button>
                </form>
            `;
            break;
            
        case 'uploadScript':
            if (!selectedProject) {
                showNotification('Please select a project first', 'error');
                return;
            }
            title.textContent = 'Upload Script';
            body.innerHTML = `
                <form id="uploadScriptForm">
                    <input type="hidden" name="projectId" value="${selectedProject._id}">
                    <div class="form-group">
                        <label>Project: <strong>${selectedProject.name}</strong></label>
                    </div>
                    <div class="form-group">
                        <label for="scriptName">Script Name</label>
                        <input type="text" id="scriptName" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="scriptContent">Script Content</label>
                        <textarea id="scriptContent" name="content" class="code-textarea" placeholder="-- Your Lua script here" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="loaderType">Loader Type</label>
                        <div id="loaderTypeDropdown"></div>
                    </div>
                    <div class="form-group">
                        <label>Script Options</label>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">OWO Protection</div>
                                <div class="settings-description">Advanced anti-reverse engineering protection</div>
                            </div>
                            <div class="settings-control">
                                <div class="toggle-switch" onclick="toggleSwitch(this)" data-setting="owo"></div>
                            </div>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Code Obfuscation</div>
                                <div class="settings-description">Obfuscate script code to prevent reading</div>
                            </div>
                            <div class="settings-control">
                                <div class="toggle-switch active" onclick="toggleSwitch(this)" data-setting="obfuscated"></div>
                            </div>
                        </div>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Code Minification</div>
                                <div class="settings-description">Compress code to reduce size</div>
                            </div>
                            <div class="settings-control">
                                <div class="toggle-switch active" onclick="toggleSwitch(this)" data-setting="minified"></div>
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Upload Script</button>
                </form>
            `;
            
            // Create custom dropdown for loader type
            const loaderOptions = [
                { value: 'basic', label: 'Basic' },
                { value: 'advanced', label: 'Advanced' },
                { value: 'custom', label: 'Custom' }
            ];
            createCustomDropdown(
                document.getElementById('loaderTypeDropdown'),
                loaderOptions,
                'basic',
                (value) => {
                    // Handle loader type selection
                }
            );
            break;

        case 'addUserKey':
            if (!selectedProject) {
                showNotification('Please select a project first', 'error');
                return;
            }
            title.textContent = 'Generate User Keys';
            body.innerHTML = `
                <form id="addUserKeyForm">
                    <div class="form-group">
                        <label>Project: <strong>${selectedProject.name}</strong></label>
                    </div>
                    <div class="form-group">
                        <label for="userNote">User Note</label>
                        <input type="text" id="userNote" name="userNote" placeholder="Enter note for this key (optional)">
                    </div>
                    <div class="form-group">
                        <label>Expiration Settings</label>
                        <div class="settings-row">
                            <div>
                                <div class="settings-label">Set Expiration</div>
                                <div class="settings-description">Enable to set when this key expires</div>
                            </div>
                            <div class="settings-control">
                                <div class="toggle-switch" onclick="toggleExpiration(this)" data-setting="expires"></div>
                            </div>
                        </div>
                        
                        <div id="expirationOptions" style="display: none; margin-top: 15px;">
                            <div class="settings-row">
                                <div>
                                    <div class="settings-label">Days from now</div>
                                    <div class="settings-description">Set expiration based on number of days</div>
                                </div>
                                <div class="settings-control">
                                    <div class="toggle-switch active" onclick="toggleExpirationMethod(this, 'days')" data-method="days"></div>
                                </div>
                            </div>
                            
                            <div id="daysInput" style="margin-left: 20px; margin-bottom: 15px;">
                                <input type="number" id="expirationDays" name="expirationDays" min="1" max="365" value="30" style="width: 100px; padding: 8px; border: 1px solid var(--outline); border-radius: 6px; background: var(--bg); color: var(--text);">
                                <span style="margin-left: 10px; color: var(--text-secondary);">days</span>
                            </div>
                            
                            <div class="settings-row">
                                <div>
                                    <div class="settings-label">Specific date</div>
                                    <div class="settings-description">Set exact expiration date</div>
                                </div>
                                <div class="settings-control">
                                    <div class="toggle-switch" onclick="toggleExpirationMethod(this, 'date')" data-method="date"></div>
                                </div>
                            </div>
                            
                            <div id="dateInput" style="margin-left: 20px; display: none;">
                                <input type="date" id="expirationDate" name="expirationDate" style="width: 200px; padding: 8px; border: 1px solid var(--outline); border-radius: 6px; background: var(--bg); color: var(--text);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="keyAmount">Amount to Generate</label>
                        <input type="number" id="keyAmount" name="keyAmount" min="1" max="100" value="1" required>
                        <small style="color: var(--text-secondary); display: block; margin-top: 5px;">Generate between 1 and 100 keys</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Generate Keys</button>
                </form>
            `;
            break;

        case 'changeUsername':
            title.textContent = 'Change Username';
            body.innerHTML = `
                <form id="changeUsernameForm">
                    <div class="form-group">
                        <label for="currentUsername">Current Username</label>
                        <input type="text" id="currentUsername" value="${currentUser.username}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="newUsername">New Username</label>
                        <input type="text" id="newUsername" name="newUsername" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="password" placeholder="Enter your current password" required>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary">Change Username</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                </form>
            `;
            break;

        case 'changeEmail':
            title.textContent = 'Change Email';
            body.innerHTML = `
                <form id="changeEmailForm">
                    <div class="form-group">
                        <label for="currentEmail">Current Email</label>
                        <input type="email" id="currentEmail" value="${currentUser.email}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="newEmail">New Email</label>
                        <input type="email" id="newEmail" name="newEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="password" placeholder="Enter your current password" required>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary">Send Verification Codes</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                    
                    <div id="verificationStep" class="verification-step" style="display: none;">
                        <h4>Email Verification</h4>
                        <p>Verification codes have been sent to both your current and new email addresses. Please enter both codes to complete the email change.</p>
                        <div class="verification-codes">
                            <div class="verification-input">
                                <label>Current Email Code</label>
                                <input type="text" id="currentEmailCode" placeholder="000000" maxlength="6" required>
                            </div>
                            <div class="verification-input">
                                <label>New Email Code</label>
                                <input type="text" id="newEmailCode" placeholder="000000" maxlength="6" required>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-primary" onclick="verifyEmailChange()">Complete Email Change</button>
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        </div>
                    </div>
                </form>
            `;
            break;

        case 'changePassword':
            title.textContent = 'Change Password';
            body.innerHTML = `
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" placeholder="Enter your current password" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" placeholder="Enter your new password" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmNewPassword">Confirm New Password</label>
                        <input type="password" id="confirmNewPassword" name="confirmPassword" placeholder="Confirm your new password" required>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary">Change Password</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                </form>
            `;
            break;

        case 'regenerateApiKey':
            title.textContent = 'Regenerate API Key';
            body.innerHTML = `
                <form id="regenerateApiKeyForm">
                    <div class="form-group">
                        <label>Warning</label>
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">
                            This will invalidate your current API key and generate a new one. 
                            Any applications using the current key will stop working until updated.
                        </p>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="password" placeholder="Enter your current password" required>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary">Regenerate API Key</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                </form>
            `;
            break;
    }
    
    modal.style.display = 'block';
    setupModalForms();
}

let storedPassword = null;

async function verifyEmailChange() {
    const currentEmailCode = document.getElementById('currentEmailCode').value;
    const newEmailCode = document.getElementById('newEmailCode').value;
    const newEmail = document.getElementById('newEmail').value;
    
    if (!currentEmailCode || !newEmailCode) {
        showNotification('Please enter both verification codes', 'error');
        return;
    }
    
    try {
        const result = await API.call('/api/profile/verify-email-change', {
            method: 'POST',
            body: JSON.stringify({
                password: storedPassword,
                newEmail: newEmail,
                currentEmailCode: currentEmailCode,
                newEmailCode: newEmailCode
            })
        });
        
        if (result && result.user) {
            currentUser = result.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserDisplay();
            closeModal();
            showNotification('Email updated successfully!', 'success');
            loadAuditLogs();
            
            // Clear stored password
            storedPassword = null;
        }
    } catch (error) {
        showNotification('Invalid verification codes', 'error');
    }
}

function setupModalForms() {
    const createProjectForm = document.getElementById('createProjectForm');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const result = await API.call('/api/projects', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                if (result && result.project) {
                    closeModal();
                    loadProjects();
                    showNotification('Project created successfully!', 'success');
                }
            } catch (error) {
                showNotification('Error creating project', 'error');
            }
        });
    }
    
    const uploadScriptForm = document.getElementById('uploadScriptForm');
    if (uploadScriptForm) {
        uploadScriptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Collect toggle switch states instead of checkboxes
            const settings = {
                loaderType: document.querySelector('#loaderTypeDropdown .dropdown-option.selected')?.textContent.toLowerCase() || 'basic',
                options: {
                    owo: document.querySelector('[data-setting="owo"]').classList.contains('active'),
                    obfuscated: document.querySelector('[data-setting="obfuscated"]').classList.contains('active'),
                    minified: document.querySelector('[data-setting="minified"]').classList.contains('active')
                }
            };
            
            data.settings = settings;
            
            try {
                const result = await API.call('/api/scripts', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                if (result && result.script) {
                    closeModal();
                    loadProjectScripts();
                    showNotification('Script uploaded successfully!', 'success');
                }
            } catch (error) {
                showNotification('Error uploading script', 'error');
            }
        });
    }

    const addUserKeyForm = document.getElementById('addUserKeyForm');
    if (addUserKeyForm) {
        addUserKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userNote = formData.get('userNote') || 'Generated Key';
            const keyAmount = parseInt(formData.get('keyAmount'));
            const hasExpiration = document.querySelector('[data-setting="expires"]').classList.contains('active');
            
            let expirationDate = null;
            if (hasExpiration) {
                const isDaysMethod = document.querySelector('[data-method="days"]').classList.contains('active');
                if (isDaysMethod) {
                    const days = parseInt(formData.get('expirationDays'));
                    expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + days);
                } else {
                    expirationDate = new Date(formData.get('expirationDate'));
                }
            }
            
            // Generate multiple keys
            const newKeys = [];
            for (let i = 0; i < keyAmount; i++) {
                const newUserKey = {
                    _id: (Date.now() + i).toString(),
                    username: userNote + (keyAmount > 1 ? ` #${i + 1}` : ''),
                    key: `${selectedProject._id}_${Math.random().toString(36).substr(2, 16)}`,
                    createdAt: new Date(),
                    isActive: true,
                    status: 'active',
                    hwid: null, // Will be set when user first uses the key
                    lastLogin: null,
                    expirationDate: expirationDate,
                    note: userNote + (keyAmount > 1 ? ` #${i + 1}` : '')
                };
                newKeys.push(newUserKey);
            }
            
            // Add all new keys to the current list
            currentUserKeys.push(...newKeys);
            loadUserKeys();
            closeModal();
            
            const keyText = keyAmount === 1 ? 'key' : 'keys';
            showNotification(`${keyAmount} ${keyText} generated successfully!`, 'success');
        });
    }

    // Handle username change form
    const changeUsernameForm = document.getElementById('changeUsernameForm');
    if (changeUsernameForm) {
        changeUsernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const result = await API.call('/api/profile/username', {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                
                if (result && result.user) {
                    currentUser = result.user;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    updateUserDisplay();
                    closeModal();
                    showNotification('Username updated successfully!', 'success');
                    loadAuditLogs();
                }
            } catch (error) {
                showNotification('Error updating username', 'error');
            }
        });
    }

    // Handle email change form
    const changeEmailForm = document.getElementById('changeEmailForm');
    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Store password for verification step
            storedPassword = data.password;
            
            try {
                const result = await API.call('/api/profile/email/initiate', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                if (result && result.success) {
                    // Show verification step
                    document.getElementById('verificationStep').style.display = 'block';
                    e.target.style.display = 'none';
                    showNotification('Verification codes sent to both email addresses', 'success');
                }
            } catch (error) {
                storedPassword = null;
                showNotification('Error sending verification codes', 'error');
            }
        });
    }

    // Handle password change form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.newPassword !== data.confirmPassword) {
                showNotification('New passwords do not match', 'error');
                return;
            }
            
            try {
                const result = await API.call('/api/profile/password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        currentPassword: data.currentPassword,
                        newPassword: data.newPassword
                    })
                });
                
                if (result && result.success) {
                    closeModal();
                    showNotification('Password updated successfully!', 'success');
                    loadAuditLogs();
                }
            } catch (error) {
                showNotification('Error updating password', 'error');
            }
        });
    }

    // Handle API key regeneration form
    const regenerateApiKeyForm = document.getElementById('regenerateApiKeyForm');
    if (regenerateApiKeyForm) {
        regenerateApiKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const result = await API.call('/api/profile/regenerate-api-key', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                if (result && result.apiKey) {
                    currentUser.apiKey = result.apiKey;
                    actualApiKey = result.apiKey;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    
                    closeModal();
                    
                    // Show the new API key temporarily
                    document.getElementById('apiKeyField').textContent = result.apiKey;
                    isApiKeyVisible = true;
                    updateRevealButton();
                    
                    showNotification('API key regenerated successfully!', 'success');
                    
                    // Hide it again after 10 seconds
                    setTimeout(() => {
                        if (isApiKeyVisible) {
                            toggleApiKeyVisibility();
                        }
                    }, 10000);
                    
                    // Reload audit logs to show the regeneration action
                    loadAuditLogs();
                }
            } catch (error) {
                showNotification('Error regenerating API key', 'error');
            }
        });
    }
}

// Rest of the existing modal functions...
function toggleExpiration(element) {
    toggleSwitch(element);
    const expirationOptions = document.getElementById('expirationOptions');
    if (element.classList.contains('active')) {
        expirationOptions.style.display = 'block';
    } else {
        expirationOptions.style.display = 'none';
    }
}

function toggleExpirationMethod(element, method) {
    // First turn off all method toggles
    document.querySelectorAll('[data-method]').forEach(toggle => {
        toggle.classList.remove('active');
    });
    
    // Turn on the clicked toggle
    element.classList.add('active');
    
    const daysInput = document.getElementById('daysInput');
    const dateInput = document.getElementById('dateInput');
    
    if (method === 'days') {
        daysInput.style.display = 'block';
        dateInput.style.display = 'none';
    } else {
        daysInput.style.display = 'none';
        dateInput.style.display = 'block';
        
        // Set minimum date to today
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        document.getElementById('expirationDate').min = todayString;
        
        // Set default to 30 days from now if no date is set
        if (!document.getElementById('expirationDate').value) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            document.getElementById('expirationDate').value = futureDate.toISOString().split('T')[0];
        }
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    
    // Clear stored password when modal is closed
    storedPassword = null;
}

// Rest of existing functions remain the same...
function getLoader(scriptId) {
    const script = currentProjectScripts.find(s => s._id === scriptId);
    if (!script) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = 'Script Loader';
    body.innerHTML = `
        <div class="form-group">
            <label>Loader Code</label>
            <textarea id="loaderCode" class="code-textarea" readonly>${script.loader || 'No loader available'}</textarea>
        </div>
        <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" onclick="copyLoader()">
                <i class="fas fa-copy"></i> Copy
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function copyLoader() {
    const textarea = document.getElementById('loaderCode');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        showNotification('Loader copied to clipboard!', 'success');
    });
}

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
                <label for="editScriptContent">Script Content</label>
                <textarea id="editScriptContent" name="content" class="code-textarea" required>${script.content}</textarea>
            </div>
            
            <div class="form-group">
                <label>Script Features</label>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">OWO Protection</div>
                        <div class="settings-description">Advanced anti-reverse engineering protection</div>
                    </div>
                    <div class="settings-control">
                        <div class="toggle-switch ${script.settings?.options?.owo ? 'active' : ''}" onclick="toggleSwitch(this)" data-setting="owo">
                        </div>
                    </div>
                </div>
                
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Code Obfuscation</div>
                        <div class="settings-description">Obfuscate script code to prevent reading</div>
                    </div>
                    <div class="settings-control">
                        <div class="toggle-switch ${script.settings?.options?.obfuscated !== false ? 'active' : ''}" onclick="toggleSwitch(this)" data-setting="obfuscated">
                        </div>
                    </div>
                </div>
                
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Code Minification</div>
                        <div class="settings-description">Compress code to reduce size</div>
                    </div>
                    <div class="settings-control">
                        <div class="toggle-switch ${script.settings?.options?.minified !== false ? 'active' : ''}" onclick="toggleSwitch(this)" data-setting="minified">
                        </div>
                    </div>
                </div>
                
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Anti-Debug</div>
                        <div class="settings-description">Prevent script debugging and analysis</div>
                    </div>
                    <div class="settings-control">
                        <div class="toggle-switch ${script.settings?.options?.antidebug ? 'active' : ''}" onclick="toggleSwitch(this)" data-setting="antidebug">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="editScriptStatus">Status</label>
                <div id="statusDropdown"></div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    // Create custom dropdown for status
    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'maintenance', label: 'Maintenance' }
    ];
    createCustomDropdown(
        document.getElementById('statusDropdown'),
        statusOptions,
        script.status,
        (value) => {
            // Handle status selection
        }
    );
    
    modal.style.display = 'block';
    
    document.getElementById('scriptSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Collect toggle switch states
        const settings = {
            loaderType: script.settings?.loaderType || 'basic',
            options: {
                owo: document.querySelector('[data-setting="owo"]').classList.contains('active'),
                obfuscated: document.querySelector('[data-setting="obfuscated"]').classList.contains('active'),
                minified: document.querySelector('[data-setting="minified"]').classList.contains('active'),
                antidebug: document.querySelector('[data-setting="antidebug"]').classList.contains('active')
            }
        };
        
        data.settings = settings;
        data.status = document.querySelector('#statusDropdown .dropdown-option.selected')?.textContent.toLowerCase() || script.status;
        
        try {
            const result = await API.call(`/api/scripts/${scriptId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (result && result.script) {
                closeModal();
                loadProjectScripts();
                showNotification('Script updated successfully!', 'success');
            }
        } catch (error) {
            showNotification('Error updating script', 'error');
        }
    });
}

// Global function exports
window.verifyEmailChange = verifyEmailChange;
window.toggleExpiration = toggleExpiration;
window.toggleExpirationMethod = toggleExpirationMethod;
window.getLoader = getLoader;
window.copyLoader = copyLoader;
window.openScriptSettings = openScriptSettings;