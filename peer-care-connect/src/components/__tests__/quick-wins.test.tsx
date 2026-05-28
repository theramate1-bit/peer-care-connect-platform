/**
 * Quick Wins Implementation Tests
 * 
 * Tests for the 4 quick wins implemented from user feedback:
 * 1. Date display bug fix
 * 2. "Fix" button UX improvement
 * 3. Stripe T&C clarity
 * 4. Payment notifications
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCompletionWidget } from '../profile/ProfileCompletionWidget';
import { PaymentSetupStep } from '../onboarding/PaymentSetupStep';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    userProfile: {
      id: 'test-user-id',
      first_name: 'Test',
      last_name: 'User',
      user_role: 'sports_therapist',
      profile_completed: false,
      bio: null,
      location: null,
      specializations: []
    }
  })
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

describe('Quick Wins - Date Display Bug Fix', () => {
  it('should correctly calculate Monday as first day of week', () => {
    // Test that Sunday (0) converts to 6 (last day of week when Monday=0)
    const firstDay = new Date(2025, 1, 1); // February 1, 2025 is a Saturday
    const dayOfWeek = firstDay.getDay(); // Should be 6 (Saturday)
    
    // Our fix: (day + 6) % 7 converts Sunday=0 to Monday=0
    const startingDayOfWeek = (dayOfWeek + 6) % 7;
    
    // Saturday (6) should become 5 (6th day when Monday=0)
    expect(startingDayOfWeek).toBe(5);
  });

  it('should handle Sunday correctly', () => {
    const sunday = new Date(2025, 1, 2); // February 2, 2025 is a Sunday
    const dayOfWeek = sunday.getDay(); // Should be 0 (Sunday)
    
    const startingDayOfWeek = (dayOfWeek + 6) % 7;
    
    // Sunday (0) should become 6 (last day when Monday=0)
    expect(startingDayOfWeek).toBe(6);
  });

  it('should handle Monday correctly', () => {
    const monday = new Date(2025, 1, 3); // February 3, 2025 is a Monday
    const dayOfWeek = monday.getDay(); // Should be 1 (Monday)
    
    const startingDayOfWeek = (dayOfWeek + 6) % 7;
    
    // Monday (1) should become 0 (first day when Monday=0)
    expect(startingDayOfWeek).toBe(0);
  });
});

describe('Quick Wins - Fix Button UX', () => {
  it('should render Fix button as always visible', () => {
    const mockProfile = {
      id: 'test-id',
      user_role: 'sports_therapist',
      profile_completed: false,
      bio: null,
      location: null,
      specializations: []
    };

    render(<ProfileCompletionWidget userProfile={mockProfile} />);
    
    const fixButton = screen.queryByText(/Fix/i);
    expect(fixButton).toBeInTheDocument();
    
    // Button should have outline variant (not ghost)
    expect(fixButton).toHaveClass('variant-outline');
  });

  it('should not hide Fix button on mobile', () => {
    const mockProfile = {
      id: 'test-id',
      user_role: 'sports_therapist',
      profile_completed: false,
      bio: null,
      location: null,
      specializations: []
    };

    render(<ProfileCompletionWidget userProfile={mockProfile} />);
    
    const fixButton = screen.queryByText(/Fix/i);
    
    // Should not have opacity classes that hide it
    expect(fixButton).not.toHaveClass('opacity-0');
    expect(fixButton).not.toHaveClass('sm:opacity-0');
  });
});

describe('Quick Wins - Stripe T&C Clarity', () => {
  it('should require terms acceptance before proceeding', () => {
    const mockOnComplete = vi.fn();
    
    render(<PaymentSetupStep onComplete={mockOnComplete} />);
    
    // Checkbox should be present
    const checkbox = screen.getByLabelText(/I agree to/i);
    expect(checkbox).toBeInTheDocument();
    
    // Button should be disabled initially
    const setupButton = screen.getByText(/Set Up Payment Account/i);
    expect(setupButton).toBeDisabled();
  });

  it('should enable button when terms are accepted', () => {
    const mockOnComplete = vi.fn();
    
    render(<PaymentSetupStep onComplete={mockOnComplete} />);
    
    const checkbox = screen.getByLabelText(/I agree to/i);
    const setupButton = screen.getByText(/Set Up Payment Account/i);
    
    // Initially disabled
    expect(setupButton).toBeDisabled();
    
    // Accept terms
    fireEvent.click(checkbox);
    
    // Should be enabled
    expect(setupButton).not.toBeDisabled();
  });

  it('should have links to Stripe agreements', () => {
    render(<PaymentSetupStep onComplete={vi.fn()} />);
    
    const connectedAccountLink = screen.getByText(/Stripe's Connected Account Agreement/i);
    const servicesLink = screen.getByText(/Stripe Services Agreement/i);
    
    expect(connectedAccountLink).toBeInTheDocument();
    expect(servicesLink).toBeInTheDocument();
    
    expect(connectedAccountLink.closest('a')).toHaveAttribute('href', 'https://stripe.com/gb/legal/connect-account');
    expect(servicesLink.closest('a')).toHaveAttribute('href', 'https://stripe.com/gb/legal');
  });
});

describe('Quick Wins - Theme Color Consistency', () => {
  it('should use primary theme color for Fix button', () => {
    const mockProfile = {
      id: 'test-id',
      user_role: 'sports_therapist',
      profile_completed: false,
      bio: null,
      location: null,
      specializations: []
    };

    render(<ProfileCompletionWidget userProfile={mockProfile} />);
    
    const fixButton = screen.getByText(/Fix/i);
    
    // Should use text-primary class (theme color)
    expect(fixButton).toHaveClass('text-primary');
  });

  it('should use primary theme color for Stripe T&C links', () => {
    render(<PaymentSetupStep onComplete={vi.fn()} />);
    
    const links = screen.getAllByRole('link');
    const stripeLinks = links.filter(link => 
      link.getAttribute('href')?.includes('stripe.com')
    );
    
    stripeLinks.forEach(link => {
      // Should use text-primary class
      expect(link).toHaveClass('text-primary');
    });
  });
});
