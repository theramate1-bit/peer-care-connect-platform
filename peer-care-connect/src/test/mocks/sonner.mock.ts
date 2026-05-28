/**
 * Sonner Toast Mock for OAuth Tests
 * 
 * This mock provides toast notification functionality
 * for testing OAuth error handling and user feedback.
 */

export const toast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
  promise: jest.fn(),
};

export default toast;
