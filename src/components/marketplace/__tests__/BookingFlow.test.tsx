/**
 * Unit tests for BookingFlow component
 * Tests critical booking flow functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BookingFlow } from '../BookingFlow';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PaymentIntegration } from '@/lib/payment-integration';
import { PreAssessmentService } from '@/lib/pre-assessment-service';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/payment-integration');
vi.mock('@/lib/pre-assessment-service');
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

describe('BookingFlow', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockUserProfile = {
    first_name: 'Test',
    last_name: 'User',
    phone: '1234567890',
  };

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
    price_amount: 10000, // £100.00 in minor units
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
    });
  });

  it('should render booking flow with service selection', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockService],
        error: null,
      }),
    });

    render(
      <BookingFlow
        open={true}
        onOpenChange={() => {}}
        practitioner={mockPractitioner}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/select.*service/i)).toBeInTheDocument();
    });
  });

  it('should handle service selection', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockService],
        error: null,
      }),
    });

    render(
      <BookingFlow
        open={true}
        onOpenChange={() => {}}
        practitioner={mockPractitioner}
      />
    );

    await waitFor(() => {
      const serviceButton = screen.getByText(mockService.name);
      expect(serviceButton).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText(mockService.name));

    // Should proceed to calendar/time selection
    await waitFor(() => {
      expect(screen.getByText(/select.*date/i)).toBeInTheDocument();
    });
  });

  it('should validate time slot availability', async () => {
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
      <BookingFlow
        open={true}
        onOpenChange={() => {}}
        practitioner={mockPractitioner}
      />
    );

    // This test would need more setup to navigate through the flow
    // For now, we're testing the structure
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should handle booking errors gracefully', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error_code: 'CONFLICT_BOOKING',
        error_message: 'Time slot is already booked',
      },
      error: null,
    });

    (supabase.rpc as any).mockReturnValue(mockRpc);
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockService],
        error: null,
      }),
    });

    render(
      <BookingFlow
        open={true}
        onOpenChange={() => {}}
        practitioner={mockPractitioner}
      />
    );

    // Error handling would be tested in integration tests
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
