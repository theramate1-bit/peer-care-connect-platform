/**
 * Push Notifications Service
 * Handles service worker registration and push notifications
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      return this.registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Check notification permission
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      console.warn('Cannot send notification: permission not granted');
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Handle notification action
        if (payload.data?.action) {
          this.handleNotificationAction(payload.data.action, payload.data);
        }
        
        notification.close();
      };

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  /**
   * Handle notification actions
   */
  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'view_session':
        // Navigate to session details
        if (data.sessionId) {
          window.location.href = `/sessions/${data.sessionId}`;
        }
        break;
      case 'view_message':
        // Navigate to messages
        if (data.conversationId) {
          window.location.href = `/messages/${data.conversationId}`;
        }
        break;
      case 'view_payment':
        // Navigate to payment details
        if (data.paymentId) {
          window.location.href = `/payments/${data.paymentId}`;
        }
        break;
      case 'emergency':
        // Show emergency contacts
        window.location.href = '/emergency';
        break;
      default:
    }
  }

  /**
   * Send notification for new message
   */
  async notifyNewMessage(
    senderName: string,
    message: string,
    conversationId: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: `New message from ${senderName}`,
      body: message,
      icon: '/favicon.ico',
      data: {
        action: 'view_message',
        conversationId
      },
      tag: `message-${conversationId}`,
      requireInteraction: false
    });
  }

  /**
   * Send notification for session update
   */
  async notifySessionUpdate(
    sessionId: string,
    status: string,
    therapistName: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: 'Session Update',
      body: `Your session with ${therapistName} is now ${status}`,
      icon: '/favicon.ico',
      data: {
        action: 'view_session',
        sessionId
      },
      tag: `session-${sessionId}`,
      requireInteraction: false
    });
  }

  /**
   * Send notification for payment update
   */
  async notifyPaymentUpdate(
    paymentId: string,
    status: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: 'Payment Update',
      body: `Your payment of ${currency} ${(amount / 100).toFixed(2)} is ${status}`,
      icon: '/favicon.ico',
      data: {
        action: 'view_payment',
        paymentId
      },
      tag: `payment-${paymentId}`,
      requireInteraction: false
    });
  }

  /**
   * Send emergency notification
   */
  async notifyEmergency(
    title: string,
    message: string,
    emergencyType: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: `🚨 ${title}`,
      body: message,
      icon: '/favicon.ico',
      data: {
        action: 'emergency',
        emergencyType
      },
      tag: `emergency-${emergencyType}`,
      requireInteraction: true
    });
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Request permission
      const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        await this.subscribeToPush();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Get subscription info
   */
  async getSubscriptionInfo(): Promise<{
    subscribed: boolean;
    endpoint?: string;
    keys?: any;
  }> {
    if (!this.isSupported || !this.registration) {
      return { subscribed: false };
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        return {
          subscribed: true,
          endpoint: subscription.endpoint,
          keys: subscription.getKey ? {
            p256dh: subscription.getKey('p256dh'),
            auth: subscription.getKey('auth')
          } : undefined
        };
      }
      return { subscribed: false };
    } catch (error) {
      console.error('Failed to get subscription info:', error);
      return { subscribed: false };
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
