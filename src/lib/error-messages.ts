/**
 * Centralized Error Message System
 * Provides specific, helpful error messages for different scenarios
 */

export interface ErrorContext {
  action?: string;
  field?: string;
  value?: string;
  code?: string;
  details?: any;
}

export class ErrorMessageService {
  /**
   * Get a user-friendly error message based on error type and context
   */
  static getErrorMessage(error: any, context?: ErrorContext): string {
    const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
    const errorCode = error?.code || context?.code;

    // Authentication errors
    if (errorMessage.includes('Invalid login credentials')) {
      return 'The email or password you entered is incorrect. Please check your credentials and try again.';
    }

    if (errorMessage.includes('Email not confirmed')) {
      return 'Please verify your email address before signing in. Check your inbox for a verification link.';
    }

    if (errorMessage.includes('already registered')) {
      return 'This email address is already registered. Please sign in instead or use a different email.';
    }

    if (errorMessage.includes('Too many requests')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }

    if (errorMessage.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long and contain both letters and numbers.';
    }

    // Network errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network Error')) {
      return 'Unable to connect to our servers. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('timeout')) {
      return 'The request timed out. Please try again in a moment.';
    }

    // Validation errors
    if (errorMessage.includes('required')) {
      const field = context?.field || 'This field';
      return `${field} is required. Please fill it in and try again.`;
    }

    if (errorMessage.includes('invalid email')) {
      return 'Please enter a valid email address (e.g., user@example.com).';
    }

    if (errorMessage.includes('Passwords do not match')) {
      return 'The passwords you entered do not match. Please make sure both password fields are identical.';
    }

    // Payment errors
    if (errorMessage.includes('card_declined')) {
      return 'Your card was declined. Please check your card details or try a different payment method.';
    }

    if (errorMessage.includes('insufficient_funds')) {
      return 'Insufficient funds. Please check your account balance or use a different payment method.';
    }

    if (errorMessage.includes('expired_card')) {
      return 'Your card has expired. Please use a different payment method or update your card details.';
    }

    if (errorMessage.includes('incorrect_cvc')) {
      return 'The security code (CVC) you entered is incorrect. Please check the 3-digit code on the back of your card.';
    }

    // Database errors
    if (errorMessage.includes('duplicate key')) {
      return 'This information already exists in our system. Please use different details or contact support.';
    }

    if (errorMessage.includes('foreign key')) {
      return 'Unable to complete this action due to related data. Please contact support if this continues.';
    }

    // Permission errors
    if (errorMessage.includes('permission denied') || errorMessage.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action. Please contact support if you believe this is an error.';
    }

    if (errorMessage.includes('subscription required')) {
      return 'This feature requires an active subscription. Please upgrade your plan to continue.';
    }

    // File upload errors
    if (errorMessage.includes('file too large')) {
      return 'The file you\'re trying to upload is too large. Please choose a smaller file (max 10MB).';
    }

    if (errorMessage.includes('invalid file type')) {
      return 'This file type is not supported. Please upload a JPG, PNG, or PDF file.';
    }

    // Booking errors
    if (errorMessage.includes('slot not available')) {
      return 'This time slot is no longer available. Please choose a different time.';
    }

    if (errorMessage.includes('booking conflict')) {
      return 'You already have a session scheduled at this time. Please choose a different time slot.';
    }

    // Location errors
    if (errorMessage.includes('location not found')) {
      return 'We couldn\'t find that location. Please try a different address or city.';
    }

    if (errorMessage.includes('location services disabled')) {
      return 'Location services are disabled. Please enable them in your browser settings to find nearby therapists.';
    }

    // Stripe-specific errors
    if (errorCode === 'card_declined') {
      return 'Your card was declined by your bank. Please contact your bank or try a different payment method.';
    }

    if (errorCode === 'expired_card') {
      return 'Your card has expired. Please update your payment method with a valid card.';
    }

    if (errorCode === 'incorrect_cvc') {
      return 'The security code (CVC) is incorrect. Please check the 3-digit code on the back of your card.';
    }

    if (errorCode === 'processing_error') {
      return 'There was an error processing your payment. Please try again or contact support if the issue persists.';
    }

    // Supabase-specific errors
    if (errorCode === 'PGRST116') {
      return 'No data found. Please check your search criteria and try again.';
    }

    if (errorCode === '23505') {
      return 'This information already exists. Please use different details or contact support.';
    }

    if (errorCode === '23503') {
      return 'Cannot complete this action due to related data. Please contact support for assistance.';
    }

    // Generic fallback with context
    if (context?.action) {
      return `Unable to ${context.action}. ${errorMessage}`;
    }

    // Return the original error message if no specific match found
    return errorMessage;
  }

  /**
   * Get a recovery suggestion based on error type
   */
  static getRecoverySuggestion(error: any, context?: ErrorContext): string | null {
    const errorMessage = error?.message || error?.toString() || '';

    if (errorMessage.includes('Invalid login credentials')) {
      return 'Try resetting your password or contact support if you\'re still having trouble.';
    }

    if (errorMessage.includes('Email not confirmed')) {
      return 'Check your spam folder or request a new verification email.';
    }

    if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
      return 'Check your internet connection and try refreshing the page.';
    }

    if (errorMessage.includes('timeout')) {
      return 'Try again in a few moments when the server is less busy.';
    }

    if (errorMessage.includes('card_declined')) {
      return 'Contact your bank to ensure the card is active, or try a different payment method.';
    }

    if (errorMessage.includes('subscription required')) {
      return 'Upgrade your plan to access this feature, or contact support for assistance.';
    }

    return null;
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code;

    // Critical errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied')) {
      return 'critical';
    }

    // High severity errors
    if (errorMessage.includes('card_declined') || errorMessage.includes('payment failed')) {
      return 'high';
    }

    if (errorMessage.includes('subscription required')) {
      return 'high';
    }

    // Medium severity errors
    if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Email not confirmed')) {
      return 'medium';
    }

    if (errorMessage.includes('Network Error') || errorMessage.includes('timeout')) {
      return 'medium';
    }

    // Low severity errors
    if (errorMessage.includes('required') || errorMessage.includes('invalid email')) {
      return 'low';
    }

    return 'medium';
  }
}

/**
 * Hook for using error messages in components
 */
export const useErrorMessage = () => {
  const getErrorMessage = (error: any, context?: ErrorContext) => {
    return ErrorMessageService.getErrorMessage(error, context);
  };

  const getRecoverySuggestion = (error: any, context?: ErrorContext) => {
    return ErrorMessageService.getRecoverySuggestion(error, context);
  };

  const getErrorSeverity = (error: any) => {
    return ErrorMessageService.getErrorSeverity(error);
  };

  return {
    getErrorMessage,
    getRecoverySuggestion,
    getErrorSeverity
  };
};
