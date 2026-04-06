// notifications.js - Real-time notifications for Kundu Cafe
// Handles Socket.io connection, rooms, alerts, sounds, toasts

class Notifications {
  constructor(userId = null, isAdmin = false) {
    this.userId = userId;
    this.isAdmin = isAdmin;
    this.socket = null;
    this.notificationSound = new Audio(`data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQ==`);
    this.init();
  }

  init() {
    // Connect to Socket.io
    this.socket = io();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (this.userId) {
      this.socket.emit('joinRoom', { room: `user-${this.userId}` });
    }

    if (this.isAdmin) {
      this.socket.emit('joinRoom', { room: 'admin-room' });
    }

    this.bindEvents();
  }

  bindEvents() {
    // New order alert for admin
    this.socket.on('newOrder', (data) => {
      this.showNotification('New Order!', `Order #${data.order.id} received`, 'new-order');
      this.playSound();
      this.showToast('New order arrived! Refresh orders page.', 'info');
    });

    // Order status update for student
    this.socket.on('orderUpdate', (data) => {
      if (!this.isAdmin) { // Student only
        const isReady = data.status === 'ready';
        const title = isReady ? 'Ready for Pickup!' : 'Order Update!';
        const body = isReady
          ? `Order #${data.orderId} is ready. You can head to the canteen now.`
          : `Your order is now ${data.status}`;

        this.showNotification(title, body, 'order-update');
        if (data.status === 'ready') {
          this.playSound(true); // Longer sound for ready
        }
        this.showToast(
          isReady ? `Order #${data.orderId} is ready for pickup` : `Order status: ${data.status}`,
          'success'
        );
      }
    });

    // Admin broadcasts
    this.socket.on('broadcast', (data) => {
      this.showNotification(data.title || 'Cafe Notice', data.message, 'broadcast');
      this.playSound();
      this.showToast(data.message, 'warning');
    });

    // Generic connection feedback
    this.socket.on('connect', () => {
      console.log('Connected to notifications server');
    });
  }

  showNotification(title, body, tag) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag, icon: '/images/kundu-cafe-logo.svg' });
    }
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} show`;
    toast.innerHTML = `
      <i class="bi bi-bell-fill me-2"></i>${message}
      <button class="btn-close ms-auto" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  playSound(long = false) {
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(e => console.log('Sound play failed:', e));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Global instance management
let notificationSystem = null;

function initNotifications(userId = null, isAdmin = false) {
  if (notificationSystem) {
    notificationSystem.disconnect();
  }
  notificationSystem = new Notifications(userId, isAdmin);
  window.notificationSystem = notificationSystem;
  return notificationSystem;
}

window.showAppToast = function (message, type = 'info') {
  if (notificationSystem) {
    notificationSystem.showToast(message, type);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type} show`;
  toast.innerHTML = `
    <i class="bi bi-bell-fill me-2"></i>${message}
    <button class="btn-close ms-auto" type="button" aria-label="Close"></button>
  `;

  toast.querySelector('.btn-close').addEventListener('click', function () {
    toast.remove();
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

// Export for module use
if (typeof module !== 'undefined') {
  module.exports = Notifications;
}
