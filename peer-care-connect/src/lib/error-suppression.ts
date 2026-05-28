/**
 * Error Suppression Utility
 * Handles common third-party service errors that users can't control
 */

interface SuppressionConfig {
  suppressTawkToErrors: boolean;
  suppressStripeErrors: boolean;
  suppressAdBlockerErrors: boolean;
  logSuppressedErrors: boolean;
}

const defaultConfig: SuppressionConfig = {
  suppressTawkToErrors: true,
  suppressStripeErrors: true,
  suppressAdBlockerErrors: true,
  logSuppressedErrors: true,
};

class ErrorSuppressionService {
  private config: SuppressionConfig;
  private suppressedErrors: Set<string> = new Set();

  constructor(config: Partial<SuppressionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Suppress console errors from third-party services
    this.suppressThirdPartyErrors();
    
    // Suppress unhandled promise rejections
    this.suppressUnhandledRejections();
  }

  private suppressThirdPartyErrors() {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressError(message)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔇 Suppressed error:', message);
        }
        return;
      }
      
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressWarning(message)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔇 Suppressed warning:', message);
        }
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };
  }

  private suppressUnhandledRejections() {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const message = error?.message || error?.toString() || '';
      
      if (this.shouldSuppressError(message)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔇 Suppressed unhandled rejection:', message);
        }
        event.preventDefault();
        return;
      }
    });
  }

  private shouldSuppressError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Tawk.to errors
    if (this.config.suppressTawkToErrors && (
      lowerMessage.includes('tawk.to') ||
      lowerMessage.includes('va.tawk.to') ||
      lowerMessage.includes('twk-chunk-common')
    )) {
      return true;
    }

    // Stripe errors (ad blocker related)
    if (this.config.suppressStripeErrors && (
      lowerMessage.includes('r.stripe.com') ||
      lowerMessage.includes('stripe') && lowerMessage.includes('blocked') ||
      lowerMessage.includes('net::err_blocked_by_client')
    )) {
      return true;
    }

    // General ad blocker errors
    if (this.config.suppressAdBlockerErrors && (
      lowerMessage.includes('net::err_blocked_by_client') ||
      lowerMessage.includes('blocked by client') ||
      lowerMessage.includes('failed to fetch') && (
        lowerMessage.includes('stripe') ||
        lowerMessage.includes('analytics') ||
        lowerMessage.includes('tracking')
      )
    )) {
      return true;
    }

    return false;
  }

  private shouldSuppressWarning(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Suppress common third-party warnings
    if (lowerMessage.includes('tawk.to') || 
        lowerMessage.includes('stripe') && lowerMessage.includes('blocked')) {
      return true;
    }

    return false;
  }

  public addSuppressedError(error: string) {
    this.suppressedErrors.add(error);
  }

  public isSuppressed(error: string): boolean {
    return this.suppressedErrors.has(error);
  }

  public updateConfig(newConfig: Partial<SuppressionConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const errorSuppression = new ErrorSuppressionService();

// Export for manual configuration
export const initErrorSuppression = (config?: Partial<SuppressionConfig>) => {
  return new ErrorSuppressionService(config);
};
