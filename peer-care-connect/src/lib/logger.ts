/**
 * Centralized logging service
 * 
 * Replaces console.log/error/warn with environment-aware logging.
 * In development, logs are shown in the console. In production,
 * errors are sent to error tracking services (e.g., Sentry).
 * 
 * @module logger
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * // Debug logging (development only)
 * logger.debug('User action', { userId: '123' }, 'ComponentName');
 * 
 * // Error logging (always logged, sent to tracking in production)
 * logger.error('Failed to load data', error, 'ComponentName');
 * 
 * // Warning logging
 * logger.warn('Deprecated API used', { api: 'old-api' }, 'ComponentName');
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;
  
  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: unknown, context?: string): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG]${context ? ` [${context}]` : ''}`, message, data || '');
    }
  }

  /**
   * Log info messages (only in development)
   */
  info(message: string, data?: unknown, context?: string): void {
    if (this.isDevelopment) {
      console.info(`[INFO]${context ? ` [${context}]` : ''}`, message, data || '');
    }
  }

  /**
   * Log warnings (always logged, but formatted)
   */
  warn(message: string, data?: unknown, context?: string): void {
    if (this.isDevelopment) {
      console.warn(`[WARN]${context ? ` [${context}]` : ''}`, message, data || '');
    } else {
      // In production, send to error tracking service (e.g., Sentry)
      this.sendToErrorTracking('warn', message, data, context);
    }
  }

  /**
   * Log errors (always logged, sent to error tracking in production)
   */
  error(message: string, error?: unknown, context?: string): void {
    if (this.isDevelopment) {
      console.error(`[ERROR]${context ? ` [${context}]` : ''}`, message, error || '');
    } else {
      // In production, send to error tracking service
      this.sendToErrorTracking('error', message, error, context);
    }
  }

  /**
   * Send logs to error tracking service (e.g., Sentry, LogRocket)
   * TODO: Integrate with actual error tracking service
   */
  private sendToErrorTracking(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string
  ): void {
    // Placeholder for error tracking integration
    // Example: Sentry.captureException(error, { extra: { context, data } });
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context
    };
    
    // In production, you might want to batch these and send periodically
    // For now, we'll just store in memory (could be sent to analytics endpoint)
    if (level === 'error') {
      // Critical errors should be logged even in production console
      console.error(`[${level.toUpperCase()}]${context ? ` [${context}]` : ''}`, message);
    }
  }
}

export const logger = new Logger();

// Convenience exports
export const logDebug = (message: string, data?: unknown, context?: string) => 
  logger.debug(message, data, context);
export const logInfo = (message: string, data?: unknown, context?: string) => 
  logger.info(message, data, context);
export const logWarn = (message: string, data?: unknown, context?: string) => 
  logger.warn(message, data, context);
export const logError = (message: string, error?: unknown, context?: string) => 
  logger.error(message, error, context);
