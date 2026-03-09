/**
 * Centralized Error Handling Utilities
 * 
 * This utility ensures consistent error handling patterns
 * across the entire application.
 */

import { toast } from 'sonner';

export interface ErrorInfo {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

/**
 * Standard error types for consistent handling
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Maps error types to user-friendly messages with actionable guidance
 */
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    description: 'Unable to connect to our servers. Please check your internet connection and try again. If the problem persists, try refreshing the page.',
    variant: 'destructive' as const
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    description: 'Please check the highlighted fields and correct any errors. All required fields must be filled in correctly.',
    variant: 'destructive' as const
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Authentication Required',
    description: 'Your session has expired or you need to sign in. Please sign in to continue.',
    variant: 'destructive' as const
  },
  [ErrorType.AUTHORIZATION]: {
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action. If you believe this is an error, please contact support.',
    variant: 'destructive' as const
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    description: 'The requested resource could not be found. It may have been deleted or moved. Please check and try again.',
    variant: 'destructive' as const
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Our team has been notified. Please try again in a few moments. If the problem persists, contact support.',
    variant: 'destructive' as const
  },
  [ErrorType.UNKNOWN]: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. Please try again. If the problem continues, contact support with details about what you were trying to do.',
    variant: 'destructive' as const
  }
};

/**
 * Determines error type from error object with enhanced detection
 */
export function getErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // Check Supabase-specific error codes first
  if (error.code) {
    // Network/connection errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return ErrorType.NETWORK;
    }
    
    // Not found errors (Supabase PostgREST)
    if (error.code === 'PGRST116' || error.code === '23505') {
      return ErrorType.NOT_FOUND;
    }
    
    // Authentication errors (Supabase Auth)
    if (error.code === 'invalid_credentials' || error.code === 'invalid_token' || error.code === 'token_expired') {
      return ErrorType.AUTHENTICATION;
    }
    
    // Authorization errors (Supabase RLS)
    if (error.code === '42501' || error.code === 'PGRST301') {
      return ErrorType.AUTHORIZATION;
    }
    
    // Validation errors (PostgreSQL)
    if (error.code === '23502' || error.code === '23503' || error.code === '23514') {
      return ErrorType.VALIDATION;
    }
    
    // Server errors
    if (error.code.startsWith('5') || error.code === 'PGRST500') {
      return ErrorType.SERVER;
    }
  }

  // Check error message content
  const errorMessage = error.message?.toLowerCase() || '';
  const errorDetails = error.details?.toLowerCase() || '';
  const combinedMessage = `${errorMessage} ${errorDetails}`;

  // Network errors
  if (combinedMessage.includes('fetch') || 
      combinedMessage.includes('network') || 
      combinedMessage.includes('connection') ||
      combinedMessage.includes('offline') ||
      combinedMessage.includes('timeout')) {
    return ErrorType.NETWORK;
  }

  // Authentication errors
  if (combinedMessage.includes('invalid login credentials') || 
      combinedMessage.includes('authentication required') ||
      combinedMessage.includes('session expired') ||
      combinedMessage.includes('unauthorized') ||
      combinedMessage.includes('invalid token')) {
    return ErrorType.AUTHENTICATION;
  }

  // Authorization errors
  if (combinedMessage.includes('access denied') || 
      combinedMessage.includes('permission denied') ||
      combinedMessage.includes('forbidden') ||
      combinedMessage.includes('row-level security')) {
    return ErrorType.AUTHORIZATION;
  }

  // Validation errors
  if (combinedMessage.includes('validation') || 
      combinedMessage.includes('required') ||
      combinedMessage.includes('invalid') ||
      combinedMessage.includes('constraint') ||
      combinedMessage.includes('check constraint')) {
    return ErrorType.VALIDATION;
  }

  // Not found errors
  if (combinedMessage.includes('not found') || 
      combinedMessage.includes('does not exist') ||
      combinedMessage.includes('no rows')) {
    return ErrorType.NOT_FOUND;
  }

  // Server errors
  if (error.status >= 500 || 
      combinedMessage.includes('server error') ||
      combinedMessage.includes('internal error') ||
      combinedMessage.includes('database error')) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Extracts specific error details for user-friendly display
 */
function extractErrorDetails(error: any): { specificMessage?: string; actionableGuidance?: string } {
  if (!error) return {};
  
  const errorMessage = error.message || '';
  const errorDetails = error.details || '';
  const errorHint = error.hint || '';
  
  // Extract specific field names from validation errors
  if (errorDetails.includes('column') || errorDetails.includes('field')) {
    const fieldMatch = errorDetails.match(/column "(\w+)"/) || errorDetails.match(/field "(\w+)"/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1].replace(/_/g, ' ');
      return {
        specificMessage: `The ${fieldName} field has an error.`,
        actionableGuidance: 'Please check this field and correct any issues.'
      };
    }
  }
  
  // Extract constraint names for better context
  if (errorDetails.includes('constraint')) {
    const constraintMatch = errorDetails.match(/constraint "(\w+)"/);
    if (constraintMatch) {
      return {
        specificMessage: errorMessage || 'A validation rule was not met.',
        actionableGuidance: errorHint || 'Please check your input and try again.'
      };
    }
  }
  
  // Use hint if available (PostgreSQL often provides helpful hints)
  if (errorHint) {
    return {
      actionableGuidance: errorHint
    };
  }
  
  return {};
}

/**
 * Shows a standardized error toast with specific details when available
 */
export function showError(error: any, customInfo?: Partial<ErrorInfo>): void {
  const errorType = getErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];
  const errorDetails = extractErrorDetails(error);
  
  // Build description with specific details if available
  let description = customInfo?.description || errorInfo.description;
  if (errorDetails.specificMessage) {
    description = `${errorDetails.specificMessage} ${errorDetails.actionableGuidance || errorInfo.description}`;
  } else if (errorDetails.actionableGuidance) {
    description = `${errorInfo.description} ${errorDetails.actionableGuidance}`;
  }
  
  const finalInfo = {
    ...errorInfo,
    description,
    ...customInfo
  };

  toast.error(finalInfo.title || 'Error', {
    description: finalInfo.description,
    duration: TOAST_DURATIONS.ERROR,
    action: finalInfo.action ? {
      label: finalInfo.action.label,
      onClick: finalInfo.action.onClick
    } : undefined
  });
}

/**
 * Standard toast durations (in milliseconds)
 */
export const TOAST_DURATIONS = {
  SUCCESS: 3000, // 3 seconds
  ERROR: 5000,   // 5 seconds
  INFO: 4000,    // 4 seconds
  WARNING: 4000  // 4 seconds
} as const;

/**
 * Shows a standardized success toast
 */
export function showSuccess(title: string, description?: string): void {
  toast.success(title, {
    description,
    duration: TOAST_DURATIONS.SUCCESS
  });
}

/**
 * Shows a standardized info toast
 */
export function showInfo(title: string, description?: string): void {
  toast.info(title, {
    description,
    duration: TOAST_DURATIONS.INFO
  });
}

/**
 * Shows a standardized warning toast
 */
export function showWarning(title: string, description?: string): void {
  toast.warning(title, {
    description,
    duration: TOAST_DURATIONS.WARNING
  });
}

/**
 * Checks if device is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Handles API errors consistently with context-aware messages and retry support
 */
/**
 * Handle API errors with user-friendly messages and optional retry
 * 
 * Standardizes error handling across the application by:
 * - Converting technical errors to user-friendly messages
 * - Logging errors appropriately
 * - Showing toast notifications
 * - Providing retry functionality when applicable
 * 
 * @param error - The error object to handle
 * @param context - Optional context string for logging (e.g., 'booking session')
 * @param onRetry - Optional callback function to retry the failed operation
 * 
 * @example
 * ```typescript
 * try {
 *   await createBooking(data);
 * } catch (error) {
 *   handleApiError(error, 'booking session', () => createBooking(data));
 * }
 * ```
 */
export function handleApiError(
  error: any, 
  context?: string, 
  onRetry?: () => void
): void {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
  
  const errorType = getErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];
  
  // Check if offline
  if (isOffline()) {
    showError(error, {
      title: 'You\'re Offline',
      description: 'Please check your internet connection and try again. Some features may be limited while offline.',
      action: onRetry ? {
        label: 'Retry',
        onClick: onRetry
      } : undefined
    });
    return;
  }
  
  // Add context to description if provided
  let description = errorInfo.description;
  if (context) {
    description = `Failed to ${context.toLowerCase()}. ${errorInfo.description}`;
  }
  
  // Show retry for network errors or if onRetry provided
  const showRetry = errorType === ErrorType.NETWORK || onRetry;
  
  showError(error, {
    title: errorInfo.title,
    description,
    action: showRetry && onRetry ? {
      label: 'Retry',
      onClick: onRetry
    } : errorType === ErrorType.NETWORK ? {
      label: 'Refresh Page',
      onClick: () => window.location.reload()
    } : undefined
  });
}

/**
 * Handles form validation errors consistently
 */
export function handleValidationError(errors: string[]): void {
  showError(null, {
    title: 'Validation Error',
    description: errors.join(', ')
  });
}

/**
 * Handles loading states consistently
 */
export function createLoadingState(message?: string): LoadingState {
  return {
    isLoading: true,
    message: message || 'Loading...'
  };
}

/**
 * Standard loading spinner component props
 */
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

/**
 * Standard error display component props
 */
export interface ErrorDisplayProps {
  error: any;
  context?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Retry button configuration
 */
export interface RetryConfig {
  label?: string;
  onRetry: () => void;
}

/**
 * Creates a retry configuration for error displays
 */
export function createRetryConfig(onRetry: () => void, label?: string): RetryConfig {
  return {
    label: label || 'Try Again',
    onRetry
  };
}

/**
 * Retry configuration with exponential backoff
 */
export interface RetryConfigWithBackoff extends RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Creates a retry function with exponential backoff
 */
export function createRetryWithBackoff(
  fn: () => Promise<any>,
  config: RetryConfigWithBackoff = {}
): () => Promise<any> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = config;

  let retryCount = 0;

  const retry = async (): Promise<any> => {
    try {
      return await fn();
    } catch (error) {
      if (retryCount >= maxRetries) {
        throw error;
      }

      retryCount++;
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, retryCount - 1),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return retry();
    }
  };

  return retry;
}
