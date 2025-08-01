// Main application initialization and navigation

// Global state for API key visibility
let isApiKeyVisible = false;
let actualApiKey = null;

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(user);
    actualApiKey = currentUser.apiKey || 'dk_' + Math.random().toString(36).substr(2, 32);
    updateUserDisplay();
}

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
        if (document.getElementById('profileUsername')) {
            document.getElementById('profileUsername').textContent = currentUser.username;
            document.getElementById('profileEmail').textContent = currentUser.email;
            // Always start with hidden API key
            document.getElementById('apiKeyField').textContent = '••••••••••••••••••••••••••••••••';
            isApiKeyVisible = false;
            updateRevealButton();
        }
    }
}

function toggleApiKeyVisibility() {
    const apiKeyField = document.getElementById('apiKeyField');
    const revealBtn = document.getElementById('revealApiKeyBtn');
    
    if (isApiKeyVisible) {
        // Hide the API key
        apiKeyField.textContent = '••••••••••••••••••••••••••••••••';
        isApiKeyVisible = false;
    } else {
        // Show the API key
        apiKeyField.textContent = actualApiKey;
        isApiKeyVisible = true;
    }
    
    updateRevealButton();
}

function updateRevealButton() {
    const revealBtn = document.getElementById('revealApiKeyBtn');
    if (revealBtn) {
        if (isApiKeyVisible) {
            revealBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
        } else {
            revealBtn.innerHTML = '<i class="fas fa-eye"></i> Reveal';
        }
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

function setupTabNavigation() {
    document.querySelectorAll('.section-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.section-nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const targetTab = document.getElementById(tab + 'Tab');
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionName + 'Section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Add active class to selected nav link
    const selectedLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (selectedLink) {
        selectedLink.classList.add('active');
    }
    
    // Update page title
    document.getElementById('pageTitle').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    
    // Load section-specific data and refresh dashboard stats
    switch(sectionName) {
        case 'dashboard':
            loadDashboard(); // Refresh stats when viewing dashboard
            break;
        case 'projects':
            loadProjects();
            closeProjectDetails();
            // Refresh dashboard stats when projects are updated
            setTimeout(() => loadDashboard(), 500);
            break;
        case 'account':
            updateUserDisplay();
            loadAuditLogs();
            break;
        case 'subscription':
            if (typeof loadSubscription === 'function') {
                loadSubscription();
            }
            break;    
    }
}

// Theme toggle function
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle icon
    const themeToggle = document.querySelector('.theme-toggle i');
    if (newTheme === 'light') {
        themeToggle.className = 'fas fa-sun';
    } else {
        themeToggle.className = 'fas fa-moon';
    }
}

// Copy text to clipboard utility
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard!', 'success');
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="closeNotification(this)">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        closeNotification(notification.querySelector('.notification-close'));
    }, 5000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return '<i class="fas fa-check-circle"></i>';
        case 'error': return '<i class="fas fa-exclamation-circle"></i>';
        case 'warning': return '<i class="fas fa-exclamation-triangle"></i>';
        default: return '<i class="fas fa-info-circle"></i>';
    }
}

function closeNotification(button) {
    const notification = button.closest('.notification');
    notification.classList.remove('show');
    setTimeout(() => {
        notification.remove();
    }, 300);
}

// Toggle switch component
function toggleSwitch(element) {
    element.classList.toggle('active');
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape') {
            closeModal();
        }
        
        // Ctrl/Cmd + K to open search (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            // Open search modal in future
        }
        
        // Ctrl/Cmd + N to create new project
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (document.getElementById('projectsSection').style.display !== 'none') {
                openModal('createProject');
            }
        }
        
        // Ctrl/Cmd + , to open settings (account section)
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            showSection('account');
        }
        
        // Alt + T to toggle theme
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            toggleTheme();
        }
        
        // F5 or Ctrl+R to refresh dashboard
        if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
            if (document.getElementById('dashboardSection').style.display !== 'none') {
                e.preventDefault();
                refreshDashboard();
            }
        }
    });
}

// Auto-save functionality for forms
function setupAutoSave() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', debounce((e) => {
            const key = `autosave_${e.target.id}`;
            localStorage.setItem(key, e.target.value);
        }, 1000));
        
        // Restore autosaved content
        const key = `autosave_${textarea.id}`;
        const saved = localStorage.getItem(key);
        if (saved && !textarea.value) {
            textarea.value = saved;
        }
    });
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality (future implementation)
function setupSearch() {
    // This will be implemented in future versions
    // Will include global search across projects, scripts, and user keys
}

// Error handling utilities
function handleApiError(error) {
    console.error('API Error:', error);
    
    if (error.status === 401) {
        // Unauthorized - redirect to login
        logout();
        return;
    }
    
    if (error.status === 403) {
        showNotification('Access denied', 'error');
        return;
    }
    
    if (error.status === 429) {
        showNotification('Rate limit exceeded. Please try again later.', 'warning');
        return;
    }
    
    if (error.status >= 500) {
        showNotification('Server error. Please try again later.', 'error');
        return;
    }
    
    // Default error message
    showNotification(error.message || 'An error occurred', 'error');
}

// Performance monitoring
function setupPerformanceMonitoring() {
    // Track page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`Duck Auth Dashboard loaded in ${loadTime.toFixed(2)}ms`);
        
        // Track to analytics if enabled
        if (window.gtag) {
            gtag('event', 'page_load_time', {
                'value': Math.round(loadTime),
                'custom_parameter': 'duck_auth_dashboard'
            });
        }
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard(); // Load dashboard stats on startup
    setupNavigation();
    setupTabNavigation();
    setupKeyboardShortcuts();
    setupAutoSave();
    setupPerformanceMonitoring();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        const themeToggle = document.querySelector('.theme-toggle i');
        if (savedTheme === 'light') {
            themeToggle.className = 'fas fa-sun';
        } else {
            themeToggle.className = 'fas fa-moon';
        }
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Handle window resize for responsive sidebar
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            document.querySelector('.sidebar').classList.remove('open');
        }
    });
    
    // Auto-refresh dashboard stats every 30 seconds
    setInterval(() => {
        if (document.getElementById('dashboardSection').style.display !== 'none') {
            loadDashboard();
        }
    }, 30000);
    
    // Update current time display if needed
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// Update current time display
function updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        const utcTime = now.toISOString().slice(0, 19).replace('T', ' ');
        timeElement.textContent = utcTime;
    }
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    handleApiError({
        message: 'An unexpected error occurred',
        status: 0
    });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    handleApiError({
        message: 'An unexpected error occurred',
        status: 0
    });
});

// Service worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for global access
window.checkAuth = checkAuth;
window.updateUserDisplay = updateUserDisplay;
window.showSection = showSection;
window.loadAuditLogs = loadAuditLogs;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.toggleTheme = toggleTheme;
window.copyText = copyText;
window.showNotification = showNotification;
window.closeNotification = closeNotification;
window.toggleSwitch = toggleSwitch;
window.logout = logout;
window.handleApiError = handleApiError;