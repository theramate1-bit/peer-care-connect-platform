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
 * Maps error types to user-friendly messages
 */
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    description: 'Please check your internet connection and try again.',
    variant: 'destructive' as const
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    variant: 'destructive' as const
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Authentication Required',
    description: 'Please sign in to continue.',
    variant: 'destructive' as const
  },
  [ErrorType.AUTHORIZATION]: {
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action.',
    variant: 'destructive' as const
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    variant: 'destructive' as const
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
    variant: 'destructive' as const
  },
  [ErrorType.UNKNOWN]: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. Please try again.',
    variant: 'destructive' as const
  }
};

/**
 * Determines error type from error object
 */
export function getErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return ErrorType.NETWORK;
  }

  // Authentication errors
  if (error.message?.includes('Invalid login credentials') || 
      error.message?.includes('Authentication required')) {
    return ErrorType.AUTHENTICATION;
  }

  // Authorization errors
  if (error.message?.includes('Access denied') || 
      error.message?.includes('Unauthorized')) {
    return ErrorType.AUTHORIZATION;
  }

  // Validation errors
  if (error.message?.includes('validation') || 
      error.message?.includes('required') ||
      error.message?.includes('invalid')) {
    return ErrorType.VALIDATION;
  }

  // Not found errors
  if (error.code === 'PGRST116' || error.message?.includes('not found')) {
    return ErrorType.NOT_FOUND;
  }

  // Server errors
  if (error.status >= 500 || error.message?.includes('server')) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Shows a standardized error toast
 */
export function showError(error: any, customInfo?: Partial<ErrorInfo>): void {
  const errorType = getErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];
  
  const finalInfo = {
    ...errorInfo,
    ...customInfo
  };

  toast.error(finalInfo.title || 'Error', {
    description: finalInfo.description,
    action: finalInfo.action ? {
      label: finalInfo.action.label,
      onClick: finalInfo.action.onClick
    } : undefined
  });
}

/**
 * Shows a standardized success toast
 */
export function showSuccess(title: string, description?: string): void {
  toast.success(title, {
    description
  });
}

/**
 * Shows a standardized info toast
 */
export function showInfo(title: string, description?: string): void {
  toast.info(title, {
    description
  });
}

/**
 * Shows a standardized warning toast
 */
export function showWarning(title: string, description?: string): void {
  toast.warning(title, {
    description
  });
}

/**
 * Handles API errors consistently
 */
export function handleApiError(error: any, context?: string): void {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
  
  const errorType = getErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];
  
  showError(error, {
    title: errorInfo.title,
    description: errorInfo.description
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
