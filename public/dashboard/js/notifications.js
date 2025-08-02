// Notification system functionality
let notificationDropdownOpen = false;
let currentNotifications = [];

async function loadNotifications() {
    try {
        // Load user notifications
        const userResponse = await API.call('/api/notifications/user?limit=5');
        const globalResponse = await API.call('/api/notifications/global?limit=5');
        
        let notifications = [];
        
        if (userResponse.success) {
            notifications = notifications.concat(userResponse.notifications.map(n => ({...n, source: 'user'})));
        }
        
        if (globalResponse.success) {
            notifications = notifications.concat(globalResponse.notifications.map(n => ({...n, source: 'global'})));
        }
        
        // Sort by creation date
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        currentNotifications = notifications.slice(0, 10); // Keep only latest 10
        
        updateNotificationUI();
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function loadUnreadCount() {
    try {
        const response = await API.call('/api/notifications/unread-count');
        if (response.success) {
            updateNotificationBadge(response.unreadCount.total);
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

function updateNotificationUI() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    if (currentNotifications.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    notificationList.innerHTML = currentNotifications.map(notification => {
        const isUnread = notification.source === 'global' ? !notification.isRead : true;
        const timeAgo = getTimeAgo(new Date(notification.createdAt));
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="handleNotificationClick('${notification._id}')">
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateNotificationBadge(count = null) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (count === null) {
        // Count unread from current notifications
        count = currentNotifications.filter(n => 
            n.source === 'global' ? !n.isRead : true
        ).length;
    }
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    notificationDropdownOpen = !notificationDropdownOpen;
    dropdown.style.display = notificationDropdownOpen ? 'block' : 'none';
    
    if (notificationDropdownOpen) {
        loadNotifications();
    }
}

async function handleNotificationClick(notificationId) {
    try {
        // Mark as read
        await API.call(`/api/notifications/${notificationId}/read`, { method: 'POST' });
        
        // Update local state
        const notification = currentNotifications.find(n => n._id === notificationId);
        if (notification && notification.source === 'global') {
            notification.isRead = true;
        }
        
        updateNotificationUI();
        updateNotificationBadge();
        
        // Handle confetti if enabled
        if (notification && notification.displaySettings && notification.displaySettings.showConfetti) {
            showConfetti();
        }
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        // Mark all global notifications as read
        for (const notification of currentNotifications) {
            if (notification.source === 'global' && !notification.isRead) {
                await API.call(`/api/notifications/${notification._id}/read`, { method: 'POST' });
                notification.isRead = true;
            }
        }
        
        updateNotificationUI();
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

function showAllNotifications() {
    // Close dropdown and show notifications section
    toggleNotifications();
    // Could implement a dedicated notifications page/modal here
    alert('Full notifications page would be implemented here');
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
        return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showConfetti() {
    // Simple confetti effect using CSS animations
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.innerHTML = `
        <div class="confetti"></div>
        <div class="confetti"></div>
        <div class="confetti"></div>
        <div class="confetti"></div>
        <div class="confetti"></div>
    `;
    
    document.body.appendChild(confettiContainer);
    
    // Remove after animation
    setTimeout(() => {
        confettiContainer.remove();
    }, 3000);
}

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationDropdown');
    const toggle = document.querySelector('.notification-toggle');
    
    if (dropdown && toggle && notificationDropdownOpen) {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
            toggleNotifications();
        }
    }
});

// Load notifications on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    setInterval(() => {
        if (!notificationDropdownOpen) {
            loadUnreadCount();
        }
    }, 30000);
});