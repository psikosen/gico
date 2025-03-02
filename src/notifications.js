// Notification System

// Show Success Notification
export function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Show Error Notification
export function showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 4000);
}

// Show Warning Notification
export function showWarningNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Show Loading Notification with Custom Duration
export function showLoadingNotification(message, duration = 0) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification loading';
    
    // Create loading spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    // Create message element
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    
    notification.appendChild(spinner);
    notification.appendChild(messageElement);
    
    // Add to document
    document.body.appendChild(notification);
    
    // If duration is set, remove after timeout
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, duration);
    }
    
    // Return reference to the notification for manual removal
    return notification;
}

// Remove a specific notification
export function removeNotification(notification) {
    if (notification && document.body.contains(notification)) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }
}
