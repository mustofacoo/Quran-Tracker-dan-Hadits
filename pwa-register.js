// PWA Registration and Installation Handler
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isStandalone = false;
    this.init();
  }

  init() {
    // Check if running as standalone PWA
    this.checkStandaloneMode();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }

    // Handle install prompt
    this.setupInstallPrompt();
    
    // Setup update handler
    this.setupUpdateHandler();
    this.requestPersistentStorage();
  }

  checkStandaloneMode() {
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
    
    if (this.isStandalone) {
      console.log('[PWA] Running in standalone mode');
      document.body.classList.add('pwa-standalone');
    }
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] New Service Worker found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt triggered');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      
      // Show custom install button
      this.showInstallButton();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
      this.hideInstallButton();
      
      // Show thank you message
      this.showNotification('Terima kasih telah menginstall Quran Tracker!', 'success');
    });
  }

  setupUpdateHandler() {
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.action === 'update-available') {
        this.showUpdateNotification();
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  showInstallButton() {
    // Create install button if it doesn't exist
    let installBtn = document.getElementById('pwa-install-btn');
    
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-button';
      installBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Install Aplikasi</span>
      `;
      installBtn.addEventListener('click', () => this.promptInstall());
      
      // Add to DOM
      document.body.appendChild(installBtn);
      
      // Add styles if not already present
      if (!document.getElementById('pwa-styles')) {
        const style = document.createElement('style');
        style.id = 'pwa-styles';
        style.textContent = `
          .pwa-install-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            z-index: 9999;
            transition: all 0.3s ease;
            animation: slideInUp 0.5s ease;
          }
          
          .pwa-install-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
          }
          
          .pwa-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1F2937;
            color: #F9FAFB;
            padding: 16px 20px;
            border-radius: 8px;
            border: 1px solid #374151;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
          }
          
          .pwa-notification.success {
            border-color: #10B981;
            background: linear-gradient(135deg, #1F2937, #10B981);
          }
          
          .pwa-notification.info {
            border-color: #3B82F6;
            background: linear-gradient(135deg, #1F2937, #3B82F6);
          }
          
          .pwa-notification-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          
          .pwa-notification-button {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          
          .pwa-notification-button:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          @keyframes slideInUp {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes slideInRight {
            from {
              transform: translateX(100px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @media (max-width: 640px) {
            .pwa-install-button {
              bottom: 10px;
              right: 10px;
              font-size: 13px;
              padding: 10px 16px;
            }
            
            .pwa-notification {
              top: 10px;
              right: 10px;
              left: 10px;
              max-width: none;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.animation = 'slideOutDown 0.3s ease';
      setTimeout(() => installBtn.remove(), 300);
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      this.hideInstallButton();
    }

    // Clear the deferred prompt
    this.deferredPrompt = null;
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-notification info';
    notification.innerHTML = `
      <div class="pwa-notification-content">
        <span>Update tersedia! Refresh untuk memperbarui aplikasi.</span>
        <button class="pwa-notification-button" onclick="window.location.reload()">
          Refresh
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 10 seconds
    setTimeout(() => notification.remove(), 10000);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `pwa-notification ${type}`;
    notification.innerHTML = `<div class="pwa-notification-content">${message}</div>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('[PWA] This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Send local notification
  sendNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  // Request persistent storage
async requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        
        if (granted) {
          console.log('[PWA] Persistent storage granted');
        } else {
          console.log('[PWA] Persistent storage denied');
          
          // Show notification to install PWA
          setTimeout(() => {
            this.showNotification(
              'Install aplikasi untuk mencegah data hilang saat refresh',
              'info'
            );
          }, 2000);
        }
      } else {
        console.log('[PWA] Storage already persistent');
      }
      
      // Log storage estimate
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        console.log(`[PWA] Storage usage: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB / ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
      }
    }
  } catch (error) {
    console.error('[PWA] Error requesting persistent storage:', error);
  }
}

  // Clear all caches (for debugging)
  async clearAllCaches() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        navigator.serviceWorker.controller.postMessage(
          { action: 'clearCache' },
          [messageChannel.port2]
        );
      });
    }
  }
}

// Initialize PWA Manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
  });
} else {
  window.pwaManager = new PWAManager();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
