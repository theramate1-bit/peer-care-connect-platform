/**
 * Unit tests for GuestBookingFlow component
 * Tests guest booking flow functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { GuestBookingFlow } from '../GuestBookingFlow';
import { supabase } from '@/integrations/supabase/client';
import { PaymentIntegration } from '@/lib/payment-integration';
import { PreAssessmentService } from '@/lib/pre-assessment-service';
import { formValidation } from '@/lib/form-utils';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/payment-integration');
vi.mock('@/lib/pre-assessment-service');
vi.mock('@/lib/form-utils');
vi.mock('@/lib/error-handling', () => ({
  handleApiError: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('GuestBookingFlow', () => {
  const mockPractitioner = {
    id: 'practitioner-123',
    user_id: 'practitioner-user-123',
    first_name: 'Dr.',
    last_name: 'Smith',
    location: 'London',
    hourly_rate: 100,
    specializations: ['massage'],
    bio: 'Test bio',
    experience_years: 5,
    user_role: 'massage_therapist',
    average_rating: 4.5,
    total_sessions: 100,
  };

  const mockService = {
    id: 'service-123',
    name: 'Massage Therapy',
    description: 'Test service',
    duration_minutes: 60,
    price_amount: 10000,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (formValidation.isValidEmail as any) = vi.fn((email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
  });

  it('should render guest booking flow', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockService],
        error: null,
      }),
    });

    render(
      <GuestBookingFlow
        practitioner={mockPractitioner}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/select.*service/i)).toBeInTheDocument();
    });
  });

  it('should validate email input', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockService],
        error: null,
      }),
    });

    render(
      <GuestBookingFlow
        practitioner={mockPractitioner}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/email/i);
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
    });
  });

  it('should handle guest booking creation', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-123',
      },
      error: null,
    });

    (supabase.rpc as any).mockReturnValue(mockRpc);
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: { id: 'session-123' },
        error: null,
      }),
    });

    render(
      <GuestBookingFlow
        practitioner={mockPractitioner}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
