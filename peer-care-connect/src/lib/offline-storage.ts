/**
 * Offline Storage Service
 * Handles offline data storage and emergency access
 */

export interface OfflineEmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'crisis_hotline' | 'emergency_services' | 'therapist' | 'family';
  description?: string;
}

export interface OfflineSession {
  id: string;
  therapistName: string;
  therapistPhone?: string;
  sessionDate: string;
  sessionTime: string;
  location?: string;
  status: string;
}

export class OfflineStorageService {
  private static readonly STORAGE_KEYS = {
    EMERGENCY_CONTACTS: 'theramate_emergency_contacts',
    CURRENT_SESSION: 'theramate_current_session',
    USER_INFO: 'theramate_user_info',
    OFFLINE_DATA: 'theramate_offline_data'
  };

  /**
   * Check if browser supports offline storage
   */
  static isSupported(): boolean {
    return 'localStorage' in window && 'indexedDB' in window;
  }

  /**
   * Store emergency contacts offline
   */
  static async storeEmergencyContacts(contacts: OfflineEmergencyContact[]): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Offline storage not supported');
    }

    try {
      const data = {
        contacts,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(
        this.STORAGE_KEYS.EMERGENCY_CONTACTS,
        JSON.stringify(data)
      );

    } catch (error) {
      console.error('Failed to store emergency contacts:', error);
      throw new Error('Failed to store emergency contacts offline');
    }
  }

  /**
   * Get emergency contacts from offline storage
   */
  static async getEmergencyContacts(): Promise<OfflineEmergencyContact[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.EMERGENCY_CONTACTS);
      if (!data) {
        return [];
      }

      const parsed = JSON.parse(data);
      
      // Check if data is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        return [];
      }

      return parsed.contacts || [];
    } catch (error) {
      console.error('Failed to get emergency contacts:', error);
      return [];
    }
  }

  /**
   * Store current session offline
   */
  static async storeCurrentSession(session: OfflineSession): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Offline storage not supported');
    }

    try {
      const data = {
        session,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(
        this.STORAGE_KEYS.CURRENT_SESSION,
        JSON.stringify(data)
      );

    } catch (error) {
      console.error('Failed to store current session:', error);
      throw new Error('Failed to store current session offline');
    }
  }

  /**
   * Get current session from offline storage
   */
  static async getCurrentSession(): Promise<OfflineSession | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.CURRENT_SESSION);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // Check if data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        return null;
      }

      return parsed.session || null;
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Store user info offline
   */
  static async storeUserInfo(userInfo: any): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Offline storage not supported');
    }

    try {
      const data = {
        userInfo,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(
        this.STORAGE_KEYS.USER_INFO,
        JSON.stringify(data)
      );

    } catch (error) {
      console.error('Failed to store user info:', error);
      throw new Error('Failed to store user info offline');
    }
  }

  /**
   * Get user info from offline storage
   */
  static async getUserInfo(): Promise<any | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // Check if data is not too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        return null;
      }

      return parsed.userInfo || null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Store general offline data
   */
  static async storeOfflineData(key: string, data: any): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Offline storage not supported');
    }

    try {
      const offlineData = {
        [key]: data,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(
        `${this.STORAGE_KEYS.OFFLINE_DATA}_${key}`,
        JSON.stringify(offlineData)
      );

    } catch (error) {
      console.error('Failed to store offline data:', error);
      throw new Error('Failed to store offline data');
    }
  }

  /**
   * Get general offline data
   */
  static async getOfflineData(key: string): Promise<any | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const data = localStorage.getItem(`${this.STORAGE_KEYS.OFFLINE_DATA}_${key}`);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // Check if data is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        return null;
      }

      return parsed[key] || null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  /**
   * Clear all offline data
   */
  static async clearAllOfflineData(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear any additional offline data keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('theramate_offline_data_')) {
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
  } {
    if (!this.isSupported()) {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }

      // Estimate available storage (most browsers limit to ~5-10MB)
      const available = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / available) * 100;

      return {
        used,
        available,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Check if device is offline
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Listen for online/offline status changes
   */
  static onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  /**
   * Sync offline data when connection is restored
   */
  static async syncOfflineData(): Promise<void> {
    if (this.isOffline()) {
      return;
    }

    try {
      
      // Here you would implement sync logic
      // For example, upload pending messages, sync session data, etc.
      
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }
}
