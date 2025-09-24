/**
 * Service Worker for Push Notifications
 * Handles push events and notification display
 */

const CACHE_NAME = 'theramate-v9';
const urlsToCache = [
  '/',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip caching for dynamic assets (JS/CSS with hashes)
  if (event.request.url.includes('/assets/') && 
      (event.request.url.includes('.js') || event.request.url.includes('.css'))) {
    return fetch(event.request);
  }
  
  // Skip caching for HTML files to ensure fresh content
  if (event.request.url.endsWith('.html') || event.request.url === self.location.origin + '/') {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Theramate', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    image: data.image,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    tag: data.tag || 'theramate-notification',
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Theramate', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action || data.action;

  // Handle different notification actions
  let url = '/';
  switch (action) {
    case 'view_session':
      url = data.sessionId ? `/sessions/${data.sessionId}` : '/sessions';
      break;
    case 'view_message':
      url = data.conversationId ? `/messages/${data.conversationId}` : '/messages';
      break;
    case 'view_payment':
      url = data.paymentId ? `/payments/${data.paymentId}` : '/payments';
      break;
    case 'emergency':
      url = '/emergency';
      break;
    case 'open_app':
      url = '/';
      break;
    default:
      url = data.url || '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations
      syncData()
    );
  }
});

// Message event
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper function for background sync
async function syncData() {
  try {
    // Sync offline data when connection is restored
    console.log('Syncing offline data...');
    
    // You can implement specific sync logic here
    // For example, sync pending messages, offline payments, etc.
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);

  event.waitUntil(
    // Re-subscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription.options.applicationServerKey
    }).then((subscription) => {
      console.log('Re-subscribed to push notifications:', subscription);
      
      // Send new subscription to server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
    })
  );
});
