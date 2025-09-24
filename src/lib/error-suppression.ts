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
    
    // Intercept fetch errors for blocked requests
    this.interceptFetchErrors();
    
    // Override global error handlers for blocked requests
    this.overrideGlobalErrorHandlers();
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
      lowerMessage.includes('twk-chunk-common') ||
      lowerMessage.includes('log-performance')
    )) {
      return true;
    }

    // Stripe errors (ad blocker related)
    if (this.config.suppressStripeErrors && (
      lowerMessage.includes('r.stripe.com') ||
      lowerMessage.includes('stripe') && lowerMessage.includes('blocked') ||
      lowerMessage.includes('net::err_blocked_by_client') ||
      lowerMessage.includes('fetcherror') && lowerMessage.includes('stripe') ||
      lowerMessage.includes('error fetching https://r.stripe.com')
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
        lowerMessage.includes('tracking') ||
        lowerMessage.includes('r.stripe.com')
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

  private interceptFetchErrors() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        return await originalFetch(...args);
      } catch (error: any) {
        const url = args[0]?.toString() || '';
        const errorMessage = error.message || '';
        
        // Check if this is a blocked request we should suppress
        if (this.shouldSuppressFetchError(url, errorMessage)) {
          if (this.config.logSuppressedErrors) {
            console.log('🔇 Suppressed fetch error:', url, errorMessage);
          }
          // Return a mock response to prevent app crashes
          return new Response('{}', { 
            status: 200, 
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Re-throw other errors
        throw error;
      }
    };
  }

  private shouldSuppressFetchError(url: string, errorMessage: string): boolean {
    const lowerUrl = url.toLowerCase();
    const lowerMessage = errorMessage.toLowerCase();
    
    // Suppress Stripe analytics requests
    if (this.config.suppressStripeErrors && (
      lowerUrl.includes('r.stripe.com') ||
      lowerUrl.includes('stripe.com/b') ||
      (lowerMessage.includes('failed to fetch') && lowerUrl.includes('stripe'))
    )) {
      return true;
    }
    
    // Suppress Tawk.to requests
    if (this.config.suppressTawkToErrors && (
      lowerUrl.includes('tawk.to') ||
      lowerUrl.includes('log-performance')
    )) {
      return true;
    }
    
    // Suppress general blocked requests
    if (this.config.suppressAdBlockerErrors && (
      lowerMessage.includes('net::err_blocked_by_client') ||
      lowerMessage.includes('blocked by client')
    )) {
      return true;
    }
    
    return false;
  }

  private overrideGlobalErrorHandlers() {
    // Override window.onerror to catch blocked resource errors
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = message?.toString() || '';
      const sourceUrl = source?.toString() || '';
      
      if (this.shouldSuppressGlobalError(errorMessage, sourceUrl)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔇 Suppressed global error:', errorMessage, sourceUrl);
        }
        return true; // Prevent default error handling
      }
      
      // Call original handler for non-suppressed errors
      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
  }

  private shouldSuppressGlobalError(message: string, source: string): boolean {
    const lowerMessage = message.toLowerCase();
    const lowerSource = source.toLowerCase();
    
    // Suppress Stripe analytics errors
    if (this.config.suppressStripeErrors && (
      lowerMessage.includes('r.stripe.com') ||
      lowerMessage.includes('stripe') && lowerMessage.includes('blocked') ||
      lowerMessage.includes('net::err_blocked_by_client') ||
      lowerSource.includes('stripe') && lowerMessage.includes('failed to load')
    )) {
      return true;
    }
    
    // Suppress Tawk.to errors
    if (this.config.suppressTawkToErrors && (
      lowerMessage.includes('tawk.to') ||
      lowerMessage.includes('va.tawk.to') ||
      lowerSource.includes('tawk.to') ||
      lowerMessage.includes('log-performance')
    )) {
      return true;
    }
    
    // Suppress general blocked requests
    if (this.config.suppressAdBlockerErrors && (
      lowerMessage.includes('net::err_blocked_by_client') ||
      lowerMessage.includes('blocked by client') ||
      lowerMessage.includes('failed to load resource')
    )) {
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
