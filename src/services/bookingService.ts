/**
 * Booking Service API
 * Handles session bookings with custom pricing and Stripe integration
 */

import { supabase } from '@/integrations/supabase/client';
import { BookingPricing, calculateBookingPricing } from '@/utils/pricing';

export interface SessionBooking {
  id: string;
  client_id: string;
  practitioner_id: string;
  service_id: string;
  session_date: string;
  session_duration_minutes: number;
  total_price_pence: number;
  platform_fee_pence: number;
  practitioner_earnings_pence: number;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  client_notes?: string;
  practitioner_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRequest {
  serviceId: string;
  clientId: string;
  sessionDate: Date;
  clientNotes?: string;
}

export interface BookingResponse {
  booking: SessionBooking;
  paymentIntent: {
    client_secret: string;
    payment_intent_id: string;
  };
}

/**
 * Create a new booking with payment processing
 * 
 * This function handles the complete booking creation flow:
 * 1. Validates the service exists and is active
 * 2. Calculates pricing (including platform fees)
 * 3. Creates booking record in database
 * 4. Creates Stripe payment intent for payment
 * 5. Links payment intent to booking
 * 
 * The booking starts as 'pending' status until payment is confirmed.
 * 
 * @param bookingRequest - Booking details (service, client, date, notes)
 * @returns Booking record and payment intent details
 * 
 * @throws Error if service not found, booking creation fails, or payment intent creation fails
 * 
 * @example
 * ```typescript
 * const booking = await createBooking({
 *   serviceId: 'service-123',
 *   clientId: 'client-456',
 *   sessionDate: new Date('2025-02-15T14:00:00'),
 *   clientNotes: 'Lower back pain'
 * });
 * 
 * // Use booking.paymentIntent.client_secret for Stripe payment
 * ```
 */
export async function createBooking(bookingRequest: BookingRequest): Promise<BookingResponse> {
  // First, get the service details
  const { data: service, error: serviceError } = await supabase
    .from('practitioner_services')
    .select('*')
    .eq('id', bookingRequest.serviceId)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) {
    throw new Error('Service not found or inactive');
  }

  // Calculate pricing
  const pricing = calculateBookingPricing(
    bookingRequest.serviceId,
    bookingRequest.clientId,
    service.practitioner_id,
    bookingRequest.sessionDate,
    service.duration_minutes,
    service.base_price_pence
  );

  // Create the booking record
  const { data: booking, error: bookingError } = await supabase
    .from('session_bookings')
    .insert({
      client_id: bookingRequest.clientId,
      practitioner_id: service.practitioner_id,
      service_id: bookingRequest.serviceId,
      session_date: bookingRequest.sessionDate.toISOString(),
      session_duration_minutes: service.duration_minutes,
      total_price_pence: pricing.totalPricePence,
      platform_fee_pence: pricing.platformFeePence,
      practitioner_earnings_pence: pricing.practitionerEarningsPence,
      status: 'pending',
      client_notes: bookingRequest.clientNotes
    })
    .select()
    .single();

  if (bookingError) {
    throw new Error(`Failed to create booking: ${bookingError.message}`);
  }

  // Create Stripe payment intent
  const paymentIntent = await createStripePaymentIntent({
    amount: pricing.totalPricePence,
    currency: 'gbp',
    metadata: {
      booking_id: booking.id,
      service_id: bookingRequest.serviceId,
      practitioner_id: service.practitioner_id,
      client_id: bookingRequest.clientId,
      platform_fee: pricing.platformFeePence.toString(),
      practitioner_earnings: pricing.practitionerEarningsPence.toString()
    }
  });

  // Update booking with payment intent ID
  const { error: updateError } = await supabase
    .from('session_bookings')
    .update({
      stripe_payment_intent_id: paymentIntent.id
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('Failed to update booking with payment intent ID:', updateError);
  }

  return {
    booking,
    paymentIntent: {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    }
  };
}

/**
 * Create Stripe payment intent for booking payment
 * 
 * This calls the backend API to create a Stripe PaymentIntent.
 * The PaymentIntent is used by the frontend to process payment securely.
 * 
 * @param amount - Amount in pence (e.g., 5000 = £50.00)
 * @param currency - Currency code (e.g., 'gbp')
 * @param metadata - Additional data to store with payment (booking_id, etc.)
 * @returns Stripe PaymentIntent object with client_secret
 * 
 * @throws Error if payment intent creation fails
 * 
 * @internal This is a helper function used by createBooking()
 */
async function createStripePaymentIntent({
  amount,
  currency,
  metadata
}: {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}) {
  // This would typically call your backend API that creates the Stripe payment intent
  // For now, we'll simulate the response structure
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  return await response.json();
}

/**
 * Confirm a booking payment
 */
export async function confirmBookingPayment(
  bookingId: string,
  paymentIntentId: string
): Promise<SessionBooking> {
  const { data: booking, error } = await supabase
    .from('session_bookings')
    .update({
      status: 'confirmed',
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to confirm booking: ${error.message}`);
  }

  return booking;
}

/**
 * Get client's bookings
 */
export async function getClientBookings(clientId: string): Promise<SessionBooking[]> {
  const { data, error } = await supabase
    .from('session_bookings')
    .select(`
      *,
      practitioner_services!session_bookings_service_id_fkey (
        service_name,
        service_type,
        duration_minutes,
        base_price_pence
      ),
      users!session_bookings_practitioner_id_fkey (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('client_id', clientId)
    .order('session_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch client bookings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get practitioner's bookings
 */
export async function getPractitionerBookings(practitionerId: string): Promise<SessionBooking[]> {
  const { data, error } = await supabase
    .from('session_bookings')
    .select(`
      *,
      practitioner_services!session_bookings_service_id_fkey (
        service_name,
        service_type,
        duration_minutes,
        base_price_pence
      ),
      users!session_bookings_client_id_fkey (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('practitioner_id', practitionerId)
    .order('session_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch practitioner bookings: ${error.message}`);
  }

  return data || [];
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: SessionBooking['status'],
  practitionerId?: string
): Promise<SessionBooking> {
  let query = supabase
    .from('session_bookings')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId);

  // If practitionerId is provided, ensure they can only update their own bookings
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw new Error(`Failed to update booking status: ${error.message}`);
  }

  return data;
}

/**
 * Add practitioner notes to booking
 */
export async function addPractitionerNotes(
  bookingId: string,
  practitionerId: string,
  notes: string
): Promise<SessionBooking> {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      practitioner_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('practitioner_id', practitionerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add practitioner notes: ${error.message}`);
  }

  return data;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  userRole: 'client' | 'practitioner'
): Promise<SessionBooking> {
  const column = userRole === 'client' ? 'client_id' : 'practitioner_id';
  
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq(column, userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel booking: ${error.message}`);
  }

  return data;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<SessionBooking | null> {
  const { data, error } = await supabase
    .from('session_bookings')
    .select(`
      *,
      practitioner_services!session_bookings_service_id_fkey (
        service_name,
        service_type,
        duration_minutes,
        base_price_pence
      ),
      users!session_bookings_client_id_fkey (
        first_name,
        last_name,
        avatar_url
      ),
      users!session_bookings_practitioner_id_fkey (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Booking not found
    }
    throw new Error(`Failed to fetch booking: ${error.message}`);
  }

  return data;
}

/**
 * Get booking statistics for practitioner
 */
export async function getPractitionerStats(practitionerId: string, period: 'week' | 'month' | 'year' = 'month') {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  const { data, error } = await supabase
    .from('session_bookings')
    .select('total_price_pence, platform_fee_pence, practitioner_earnings_pence, status')
    .eq('practitioner_id', practitionerId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    throw new Error(`Failed to fetch practitioner stats: ${error.message}`);
  }

  const completedBookings = data?.filter(booking => booking.status === 'completed') || [];
  
  const totalRevenue = completedBookings.reduce((sum, booking) => sum + booking.total_price_pence, 0);
  const platformFees = completedBookings.reduce((sum, booking) => sum + booking.platform_fee_pence, 0);
  const practitionerEarnings = completedBookings.reduce((sum, booking) => sum + booking.practitioner_earnings_pence, 0);
  const totalBookings = completedBookings.length;

  return {
    totalRevenue,
    platformFees,
    practitionerEarnings,
    totalBookings,
    averageBookingValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0
  };
}
