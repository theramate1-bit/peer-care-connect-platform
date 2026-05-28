/**
 * Unit tests for PreAssessmentForm component
 * Tests form submission and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreAssessmentForm } from '../PreAssessmentForm';
import { PreAssessmentService } from '@/lib/pre-assessment-service';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/lib/pre-assessment-service');
vi.mock('@/contexts/AuthContext');
vi.mock('@/lib/error-handling', () => ({
  handleApiError: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PreAssessmentForm', () => {
  const mockSessionId = 'session-123';
  const mockClientEmail = 'test@example.com';
  const mockClientName = 'Test User';
  const mockOnComplete = vi.fn();

  const defaultProps = {
    sessionId: mockSessionId,
    clientEmail: mockClientEmail,
    clientName: mockClientName,
    isGuest: false,
    isInitialSession: true,
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'user-123' },
      userProfile: {},
    });
    (PreAssessmentService.getForm as any) = vi.fn().mockResolvedValue(null);
    (PreAssessmentService.submitForm as any) = vi.fn().mockResolvedValue({
      id: 'form-123',
    });
  });

  it('should render pre-assessment form', async () => {
    render(<PreAssessmentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/background.*information/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    render(<PreAssessmentForm {...defaultProps} />);

    const user = userEvent.setup();
    
    // Try to proceed without filling required fields
    const nextButton = screen.getByText(/next/i);
    await user.click(nextButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should submit form successfully', async () => {
    render(<PreAssessmentForm {...defaultProps} />);

    const user = userEvent.setup();
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test User');

    // Navigate through steps
    const nextButton = screen.getByText(/next/i);
    await user.click(nextButton);

    // Submit form
    await waitFor(() => {
      const submitButton = screen.getByText(/complete.*booking/i);
      expect(submitButton).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/complete.*booking/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(PreAssessmentService.submitForm).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalledWith('form-123');
    });
  });

  it('should handle form submission errors', async () => {
    (PreAssessmentService.submitForm as any) = vi.fn().mockRejectedValue(
      new Error('Submission failed')
    );

    render(<PreAssessmentForm {...defaultProps} />);

    const user = userEvent.setup();
    
    // Navigate to submit step
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test User');
    
    const nextButton = screen.getByText(/next/i);
    await user.click(nextButton);

    await waitFor(() => {
      const submitButton = screen.getByText(/complete.*booking/i);
      expect(submitButton).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/complete.*booking/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(PreAssessmentService.submitForm).toHaveBeenCalled();
    });
  });
});
