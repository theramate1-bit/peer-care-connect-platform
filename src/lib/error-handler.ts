/**
 * Global Error Handler for Tawk.to and Other Third-Party Services
 * Handles blocked resources gracefully without affecting functionality
 */

interface ErrorHandlerConfig {
  suppressTawkToPerformance: boolean;
  suppressAdBlockerErrors: boolean;
  logSuppressedErrors: boolean;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  suppressTawkToPerformance: true,
  suppressAdBlockerErrors: true,
  logSuppressedErrors: true
};

class GlobalErrorHandler {
  private config: ErrorHandlerConfig;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.init();
  }

  private init() {
    // Override console.error to catch Tawk.to performance logging errors
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (this.shouldSuppressError(errorMessage)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔧 Suppressed third-party error (functionality unaffected):', errorMessage);
        }
        return;
      }
      
      // Log other errors normally
      this.originalConsoleError.apply(console, args);
    };

    // Override console.warn for consistency
    console.warn = (...args: any[]) => {
      const warningMessage = args.join(' ');
      
      if (this.shouldSuppressWarning(warningMessage)) {
        if (this.config.logSuppressedErrors) {
          console.log('🔧 Suppressed third-party warning (functionality unaffected):', warningMessage);
        }
        return;
      }
      
      // Log other warnings normally
      this.originalConsoleWarn.apply(console, args);
    };

    // Add global error event listener
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  private shouldSuppressError(message: string): boolean {
    if (!this.config.suppressTawkToPerformance) return false;

    // Only suppress specific Tawk.to performance logging errors
    const tawkToPatterns = [
      'va.tawk.to/log-performance',
      'tawk.to/log-performance',
      'twk-chunk-common.js',
      'twk-chunk-vendors.js'
    ];

    // Only suppress if it's specifically a Tawk.to performance logging error
    return tawkToPatterns.some(pattern => message.includes(pattern)) && 
           message.includes('ERR_BLOCKED_BY_CLIENT');
  }

  private shouldSuppressWarning(message: string): boolean {
    if (!this.config.suppressAdBlockerErrors) return false;

    const adBlockerPatterns = [
      'ERR_BLOCKED_BY_CLIENT',
      'net::ERR_BLOCKED_BY_CLIENT',
      'Failed to load resource'
    ];

    return adBlockerPatterns.some(pattern => message.includes(pattern));
  }

  private handleGlobalError(event: ErrorEvent): void {
    if (this.shouldSuppressError(event.message || '')) {
      event.preventDefault();
      if (this.config.logSuppressedErrors) {
        console.log('🔧 Suppressed global error (functionality unaffected):', event.message);
      }
      return false;
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason?.toString() || '';
    
    if (this.shouldSuppressError(reason)) {
      event.preventDefault();
      if (this.config.logSuppressedErrors) {
        console.log('🔧 Suppressed unhandled rejection (functionality unaffected):', reason);
      }
      return false;
    }
  }

  public destroy(): void {
    // Restore original console methods
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    // Remove event listeners
    window.removeEventListener('error', this.handleGlobalError.bind(this));
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create global instance
let globalErrorHandler: GlobalErrorHandler | null = null;

export function initGlobalErrorHandler(config?: Partial<ErrorHandlerConfig>): void {
  if (!globalErrorHandler) {
    globalErrorHandler = new GlobalErrorHandler(config);
    console.log('🔧 Global error handler initialized');
  }
}

export function destroyGlobalErrorHandler(): void {
  if (globalErrorHandler) {
    globalErrorHandler.destroy();
    globalErrorHandler = null;
    console.log('🔧 Global error handler destroyed');
  }
}

export function updateErrorHandlerConfig(config: Partial<ErrorHandlerConfig>): void {
  if (globalErrorHandler) {
    globalErrorHandler.updateConfig(config);
  }
}

// Auto-initialize in development with more conservative settings
if (import.meta.env.DEV) {
  initGlobalErrorHandler({
    suppressTawkToPerformance: true,
    suppressAdBlockerErrors: false, // Don't suppress general ad blocker errors
    logSuppressedErrors: true
  });
}
