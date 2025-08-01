// Component utilities and custom components

// Custom Dropdown Component
function createCustomDropdown(container, options, selectedValue, onSelect) {
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    
    const selected = document.createElement('div');
    selected.className = 'dropdown-selected';
    
    const selectedText = document.createElement('span');
    const selectedOption = options.find(opt => opt.value === selectedValue) || options[0];
    selectedText.textContent = selectedOption.label;
    
    const arrow = document.createElement('i');
    arrow.className = 'fas fa-chevron-down dropdown-arrow';
    
    selected.appendChild(selectedText);
    selected.appendChild(arrow);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'dropdown-options';
    
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'dropdown-option';
        if (option.value === selectedValue) {
            optionElement.classList.add('selected');
        }
        optionElement.textContent = option.label;
        optionElement.onclick = () => {
            selectedText.textContent = option.label;
            optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            optionElement.classList.add('selected');
            selected.classList.remove('open');
            optionsContainer.classList.remove('open');
            onSelect(option.value);
        };
        optionsContainer.appendChild(optionElement);
    });
    
    selected.onclick = (e) => {
        e.stopPropagation();
        const isOpen = selected.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-selected.open').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
        document.querySelectorAll('.dropdown-options.open').forEach(options => {
            options.classList.remove('open');
        });
        
        if (!isOpen) {
            selected.classList.add('open');
            optionsContainer.classList.add('open');
        }
    };
    
    dropdown.appendChild(selected);
    dropdown.appendChild(optionsContainer);
    container.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        selected.classList.remove('open');
        optionsContainer.classList.remove('open');
    });
    
    return {
        setValue: (value) => {
            const option = options.find(opt => opt.value === value);
            if (option) {
                selectedText.textContent = option.label;
                optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                optionsContainer.querySelector(`[data-value="${value}"]`)?.classList.add('selected');
            }
        },
        getValue: () => {
            const selectedOption = optionsContainer.querySelector('.dropdown-option.selected');
            return options.find(opt => opt.label === selectedOption?.textContent)?.value;
        }
    };
}

// Notification System
function showNotification(message, type = 'success', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="notification-icon ${icons[type]}"></i>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="removeNotification(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => removeNotification(notification), duration);
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Utility functions
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

function toggleSwitch(element) {
    element.classList.toggle('active');
}

function toggleTheme() {
    const body = document.body;
    const isLight = body.hasAttribute('data-theme');
    
    if (isLight) {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

function logout() {
    API.logout();
}

function copyApiKey() {
    const field = document.getElementById('apiKeyField');
    navigator.clipboard.writeText(field.value).then(() => {
        showNotification('API key copied to clipboard!', 'success');
    });
}