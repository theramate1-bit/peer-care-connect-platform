export type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  'scheduled': ['confirmed', 'cancelled', 'no_show'],
  'confirmed': ['in_progress', 'cancelled', 'no_show'],
  'in_progress': ['completed', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': [], // Terminal state
  'no_show': []    // Terminal state
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(
  from: SessionStatus, 
  to: SessionStatus,
  options?: { isPeerBooking?: boolean; paymentStatus?: string }
): {
  valid: boolean;
  error?: string;
} {
  // Special case: Allow scheduled -> in_progress for peer bookings or when payment is completed
  // Peer bookings are already "confirmed" when accepted, so they can skip the 'confirmed' step
  if (from === 'scheduled' && to === 'in_progress') {
    if (options?.isPeerBooking === true || options?.paymentStatus === 'completed' || options?.paymentStatus === 'paid') {
      return { valid: true };
    }
  }
  
  if (!canTransition(from, to)) {
    return {
      valid: false,
      error: `Invalid transition from '${from}' to '${to}'. Valid transitions: ${VALID_TRANSITIONS[from]?.join(', ') || 'none'}`
    };
  }
  return { valid: true };
}

// Helper to get valid next statuses for a given status
export function getValidNextStatuses(currentStatus: SessionStatus): SessionStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

// Helper to check if status is terminal (no further transitions)
export function isTerminalStatus(status: SessionStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

// Payment validation guards
export function canStartSession(
  sessionStatus: SessionStatus, 
  paymentStatus: string,
  options?: { isPeerBooking?: boolean; price?: number }
): { valid: boolean; error?: string } {
  if (sessionStatus !== 'scheduled' && sessionStatus !== 'confirmed') {
    return { valid: false, error: 'Session must be scheduled or confirmed to start' };
  }
  
  // Allow peer bookings (free sessions) or sessions with completed/paid status
  const isFreeSession = options?.isPeerBooking === true || (options?.price !== undefined && Number(options.price) === 0);
  const isPaymentComplete = paymentStatus === 'completed' || paymentStatus === 'paid';
  
  if (!isFreeSession && !isPaymentComplete) {
    return { valid: false, error: 'Payment must be completed before starting session' };
  }
  
  return { valid: true };
}

export function canCompleteSession(
  sessionStatus: SessionStatus,
  paymentStatus: string
): { valid: boolean; error?: string } {
  if (sessionStatus !== 'in_progress') {
    return { valid: false, error: 'Session must be in progress to complete' };
  }
  
  // Payment can be auto-marked as completed when session completes
  return { valid: true };
}

