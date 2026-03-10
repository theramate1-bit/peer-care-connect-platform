/**
 * Treatment Exchange Service - Main service class
 * 
 * This file has been refactored to improve readability. Type definitions
 * have been moved to treatment-exchange/types.ts for better organization.
 * 
 * @see treatment-exchange/types.ts for all type definitions
 */

import { supabase } from '@/integrations/supabase/client';
import { SlotHoldingService } from './slot-holding';
import { ExchangeNotificationService, ExchangeNotificationType } from './exchange-notifications';
import { NotificationSystem } from './notification-system';
import { getOverlappingBlocks } from './block-time-utils';

// Re-export types for backward compatibility
export type {
  TreatmentExchangePreferences,
  ExchangeRequest,
  MutualExchangeSession,
  EligiblePractitioner,
  PractitionerFilters,
  CreditBalanceResult
} from './treatment-exchange/types';

/**
 * TreatmentExchangeService - Handles treatment exchange between practitioners
 * 
 * Treatment exchange allows practitioners to exchange treatments with each other
 * using credits instead of money. This creates a peer-to-peer economy where
 * practitioners can receive treatments by providing treatments to others.
 * 
 * Key concepts:
 * - Practitioners can request treatments from other practitioners
 * - Requests are matched based on preferences (rating tier, specialization, distance)
 * - Credits are used as currency (1 credit per minute of treatment)
 * - Both practitioners must opt-in to treatment exchange
 * 
 * @example
 * ```typescript
 * // Check if user has enough credits
 * const { hasSufficientCredits } = await TreatmentExchangeService.checkCreditBalance(userId, 60);
 * 
 * // Get eligible practitioners
 * const practitioners = await TreatmentExchangeService.getEligiblePractitioners(userId);
 * 
 * // Send exchange request
 * const requestId = await TreatmentExchangeService.sendExchangeRequest(
 *   requesterId,
 *   recipientId,
 *   { session_date, start_time, end_time, duration_minutes }
 * );
 * ```
 */
export class TreatmentExchangeService {
  /**
   * Check if user has sufficient credits for a treatment exchange
   * 
   * This validates that a practitioner has enough credits to book a treatment.
   * Credits are required upfront before a request can be sent.
   * 
   * @param userId - Practitioner user ID to check
   * @param requiredCredits - Number of credits needed (default: 1)
   * @returns Object with credit balance status and current balance
   * 
   * @example
   * ```typescript
   * const { hasSufficientCredits, currentBalance } = 
   *   await TreatmentExchangeService.checkCreditBalance(userId, 60);
   * 
   * if (!hasSufficientCredits) {
   *   // Show message: "You need 60 credits but only have {currentBalance}"
   * }
   * ```
   */
  static async checkCreditBalance(userId: string, requiredCredits: number = 1) {
    // Delegate to credits module
    const { checkCreditBalance } = await import('./treatment-exchange/credits');
    return checkCreditBalance(userId, requiredCredits);
  }

  /**
   * Calculate star rating tier from average rating
   * Returns: 0 (0-1 stars), 1 (2-3 stars), 2 (4-5 stars)
   * 
   * @internal Use getStarRatingTier from matching module
   */
  private static getStarRatingTier(averageRating: number | string | null | undefined): number {
    // Import and use from matching module
    const { getStarRatingTier } = require('./treatment-exchange/matching');
    return getStarRatingTier(averageRating);
  }

  /**
   * Calculate required credits based on session duration
   * Credit cost = duration_minutes (1 credit per minute)
   * NOTE: This is a fallback calculation. The actual cost should be fetched from
   * get_practitioner_credit_cost RPC function for accuracy.
   * 
   * @internal Use calculateRequiredCredits from credits module
   */
  private static calculateRequiredCredits(durationMinutes: number): number {
    // Import and use from credits module
    const { calculateRequiredCredits } = require('./treatment-exchange/credits');
    return calculateRequiredCredits(durationMinutes);
  }

  /**
   * Enable/disable Treatment Exchange for a practitioner
   */
  static async setTreatmentExchangeEnabled(
    userId: string,
    enabled: boolean,
    preferences?: Partial<TreatmentExchangePreferences>
  ): Promise<void> {
    try {
      const updateData: any = {
        treatment_exchange_enabled: enabled,
        updated_at: new Date().toISOString()
      };

      if (preferences) {
        updateData.treatment_exchange_preferences = preferences;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error setting treatment exchange enabled:', error);
      throw error;
    }
  }

  /**
   * Get eligible practitioners for treatment exchange
   * 
   * This finds practitioners who:
   * - Have opted into treatment exchange
   * - Are in the same rating tier (4-5 stars, 2-3 stars, or 0-1 stars)
   * - Match optional filters (specialization, distance, session types)
   * - Have completed their profile
   * 
   * Rating tier matching ensures practitioners exchange with peers of similar quality.
   * 
   * @param userId - User ID requesting the list (excluded from results)
   * @param filters - Optional filters for specialization, distance, session types
   * @returns Array of eligible practitioners with their details
   * 
   * @example
   * ```typescript
   * // Get all eligible practitioners
   * const practitioners = await TreatmentExchangeService.getEligiblePractitioners(userId);
   * 
   * // Filter by specialization and distance
   * const filtered = await TreatmentExchangeService.getEligiblePractitioners(userId, {
   *   specializations: ['sports_therapy'],
   *   max_distance_km: 10
   * });
   * ```
   */
  static async getEligiblePractitioners(
    userId: string,
    filters?: {
      specializations?: string[];
      rating_threshold?: number;
      max_distance_km?: number;
      session_types?: string[];
    }
  ): Promise<EligiblePractitioner[]> {
    // Delegate to matching module
    const { getEligiblePractitioners } = await import('./treatment-exchange/matching');
    return getEligiblePractitioners(userId, filters);
  }

  /**
   * Send a treatment exchange request to another practitioner
   * 
   * This creates a request for a treatment exchange. The flow:
   * 1. Validates requester has sufficient credits
   * 2. Creates exchange request record
   * 3. Sends notification to recipient
   * 4. Holds the time slot temporarily
   * 
   * The request expires after a set time if not accepted.
   * Credits are deducted when the request is accepted.
   * 
   * @param requesterId - User ID of practitioner requesting treatment
   * @param recipientId - User ID of practitioner to receive request
   * @param requestData - Session details (date, time, duration, type, notes)
   * @returns Exchange request ID
   * 
   * @throws Error if validation fails, insufficient credits, or request creation fails
   * 
   * @example
   * ```typescript
   * const requestId = await TreatmentExchangeService.sendExchangeRequest(
   *   requesterId,
   *   recipientId,
   *   {
   *     session_date: '2025-02-15',
   *     start_time: '14:00',
   *     end_time: '15:00',
   *     duration_minutes: 60,
   *     session_type: 'massage',
   *     notes: 'Focus on lower back'
   *   }
   * );
   * ```
   */
  static async sendExchangeRequest(
    requesterId: string,
    recipientId: string,
    requestData: {
      session_date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      session_type?: string;
      notes?: string;
    }
  ): Promise<string> {
    try {
      // Validate IDs are non-empty strings (UUIDs)
      if (!requesterId || typeof requesterId !== 'string' || requesterId.trim() === '') {
        console.error('Invalid requesterId:', requesterId);
        throw new Error('Invalid requester ID. Please sign in again.');
      }
      
      if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
        console.error('Invalid recipientId:', recipientId);
        throw new Error('Invalid practitioner ID. Please try selecting the practitioner again.');
      }
      
      // Basic UUID format validation (should be 36 characters with hyphens)
      if (requesterId.length < 30 || recipientId.length < 30) {
        console.error('Invalid UUID format:', { requesterId, recipientId });
        throw new Error('Invalid ID format. Please refresh the page and try again.');
      }
      
      // Get actual credit cost from backend RPC function for accurate calculation
      let requiredCredits: number;
      try {
        const { data: creditCostData, error: creditCostError } = await supabase.rpc('get_practitioner_credit_cost', {
          p_practitioner_id: recipientId,
          p_duration_minutes: requestData.duration_minutes
        });
        
        if (creditCostError) {
          console.warn('Error getting credit cost from RPC, using fallback:', creditCostError);
          // Fallback: Use duration_minutes (1 credit per minute)
          const { calculateRequiredCredits } = await import('./treatment-exchange/credits');
          requiredCredits = calculateRequiredCredits(requestData.duration_minutes);
        } else {
          const { calculateRequiredCredits } = await import('./treatment-exchange/credits');
          requiredCredits = creditCostData || calculateRequiredCredits(requestData.duration_minutes);
        }
      } catch (error) {
        console.warn('Error calculating credit cost, using fallback:', error);
        const { calculateRequiredCredits } = await import('./treatment-exchange/credits');
        requiredCredits = calculateRequiredCredits(requestData.duration_minutes);
      }
      
      const creditCheck = await this.checkCreditBalance(requesterId, requiredCredits);
      
      if (!creditCheck.hasSufficientCredits) {
        throw new Error(`Insufficient credits. You have ${creditCheck.currentBalance} credits but need ${requiredCredits} credits for this ${requestData.duration_minutes}-minute exchange.`);
      }

      // Check for blocked/unavailable time on recipient's calendar
      const blocks = await getOverlappingBlocks(
        recipientId,
        requestData.session_date,
        requestData.start_time,
        requestData.duration_minutes
      );

      if (blocks.length > 0) {
        const blockType = blocks[0].event_type === 'block' ? 'blocked' : 'unavailable';
        const blockMessage = blocks[0].title 
          ? `This time slot is ${blockType}: ${blocks[0].title}. Please select another time.`
          : `This time slot is ${blockType}. Please select another time.`;
        throw new Error(blockMessage);
      }

      // First, do a direct real-time check of the recipient's eligibility
      // This bypasses any caching issues with the practitioner list
      const { data: recipientCheck, error: recipientCheckError } = await supabase
        .from('users')
        .select('id, first_name, last_name, average_rating, treatment_exchange_opt_in, profile_completed, user_role, is_active')
        .eq('id', recipientId)
        .single();
      
      // Log the raw data for debugging
      console.log('Recipient eligibility check - raw data:', {
        recipientId,
        recipientCheck,
        recipientCheckError,
        treatment_exchange_opt_in: recipientCheck?.treatment_exchange_opt_in,
        treatment_exchange_opt_in_type: typeof recipientCheck?.treatment_exchange_opt_in,
        treatment_exchange_opt_in_value: recipientCheck?.treatment_exchange_opt_in === true,
        allFields: JSON.stringify(recipientCheck, null, 2)
      });
      
      // Also do a direct SQL check to verify the value (if function exists)
      try {
        const { data: directCheck } = await supabase
          .rpc('get_user_treatment_exchange_status', { user_id_param: recipientId });
        
        if (directCheck) {
          console.log('Direct SQL check result:', directCheck);
        }
      } catch (rpcError) {
        // RPC function might not exist, that's okay
        console.log('RPC check not available:', rpcError);
      }
      
      if (recipientCheckError) {
        console.error('Error fetching recipient data:', recipientCheckError);
        throw new Error(`Recipient not found: ${recipientCheckError.message}`);
      }
      
      if (!recipientCheck) {
        throw new Error('Recipient not found');
      }
      
      // Quick validation of basic eligibility requirements
      if (!recipientCheck.is_active) {
        console.error('Recipient eligibility failed: account not active', { recipientId, is_active: recipientCheck.is_active });
        throw new Error('Recipient account is not active');
      }
      
      if (!['sports_therapist', 'massage_therapist', 'osteopath'].includes(recipientCheck.user_role || '')) {
        console.error('Recipient eligibility failed: not a practitioner', { recipientId, user_role: recipientCheck.user_role });
        throw new Error('Recipient is not a practitioner');
      }
      
      // Check treatment_exchange_opt_in - must be explicitly true
      const treatmentExchangeOptIn = recipientCheck.treatment_exchange_opt_in === true;
      
      if (!treatmentExchangeOptIn) {
        console.error('Recipient eligibility failed: treatment exchange not opted in', {
          recipientId,
          recipientName: `${recipientCheck.first_name} ${recipientCheck.last_name}`,
          treatment_exchange_opt_in: recipientCheck.treatment_exchange_opt_in,
          treatment_exchange_opt_in_type: typeof recipientCheck.treatment_exchange_opt_in
        });
        throw new Error('Recipient has not opted in to treatment exchange. They must enable the toggle in their settings.');
      }
      
      if (!recipientCheck.profile_completed) {
        console.error('Recipient eligibility failed: profile not completed', { recipientId, profile_completed: recipientCheck.profile_completed });
        throw new Error('Recipient profile is not completed');
      }
      
      // Now check rating tier match
      const { data: requesterRatingData } = await supabase
        .from('users')
        .select('id, first_name, last_name, average_rating')
        .eq('id', requesterId)
        .single();
      
      const requesterRating = requesterRatingData?.average_rating 
        ? parseFloat(String(requesterRatingData.average_rating)) || 0 
        : 0;
      const recipientRating = recipientCheck.average_rating 
        ? parseFloat(String(recipientCheck.average_rating)) || 0 
        : 0;
      
      // Import getStarRatingTier from matching module
      const { getStarRatingTier } = await import('./treatment-exchange/matching');
      const requesterTier = getStarRatingTier(requesterRating);
      const recipientTier = getStarRatingTier(recipientRating);
      
      if (requesterTier !== recipientTier) {
        throw new Error(`Rating tier mismatch: You are in the ${requesterTier === 0 ? '0-1' : requesterTier === 1 ? '2-3' : '4-5'} star tier (rating: ${requesterRating.toFixed(1)}), but ${recipientCheck.first_name} ${recipientCheck.last_name} is in the ${recipientTier === 0 ? '0-1' : recipientTier === 1 ? '2-3' : '4-5'} star tier (rating: ${recipientRating.toFixed(1)}). Treatment exchange is only available between practitioners in the same rating tier.`);
      }
      
      // If all checks pass, create recipient object for use below
      const recipient: EligiblePractitioner = {
        id: recipientCheck.id,
        user_id: recipientCheck.id,
        first_name: recipientCheck.first_name || '',
        last_name: recipientCheck.last_name || '',
        user_role: recipientCheck.user_role || '',
        specializations: [],
        average_rating: recipientRating,
      };

      // Check for existing pending requests
      // Use maybeSingle() instead of single() to avoid 406 errors when no rows exist
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('treatment_exchange_requests')
        .select('id')
        .eq('requester_id', requesterId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .maybeSingle();

      // If there's an error that's not "no rows found", throw it
      if (existingRequestError && existingRequestError.code !== 'PGRST116') {
        console.error('Error checking for existing requests:', existingRequestError);
        throw existingRequestError;
      }

      if (existingRequest) {
        throw new Error('You already have a pending request with this practitioner. Please wait for a response or cancel the existing request before sending a new one.');
      }

      // Hold the slot first
      const slotHold = await SlotHoldingService.holdSlot(
        recipientId,
        '', // Will be updated after request creation
        requestData.session_date,
        requestData.start_time,
        requestData.end_time,
        requestData.duration_minutes,
        10 // 10 minutes hold duration
      );

      // Create the request
      const { data, error } = await supabase
        .from('treatment_exchange_requests')
        .insert({
          requester_id: requesterId,
          recipient_id: recipientId,
          requested_session_date: requestData.session_date,
          requested_start_time: requestData.start_time,
          requested_end_time: requestData.end_time,
          duration_minutes: requestData.duration_minutes,
          session_type: requestData.session_type,
          requester_notes: requestData.notes,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single();

      if (error) {
        // Release the slot hold if request creation fails
        await SlotHoldingService.releaseSlot(slotHold.id);
        throw error;
      }

      // Update slot hold with request ID
      await supabase
        .from('slot_holds')
        .update({ request_id: data.id })
        .eq('id', slotHold.id);

      // Get requester details for notification
      const { data: requesterData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', requesterId)
        .single();

      const requesterName = requesterData ? `${requesterData.first_name} ${requesterData.last_name}` : 'A practitioner';

      // Send notifications
      await ExchangeNotificationService.sendExchangeRequestNotification(recipientId, {
        type: ExchangeNotificationType.EXCHANGE_REQUEST_RECEIVED,
        requestId: data.id,
        practitionerId: requesterId,
        practitionerName: requesterName,
        sessionDate: requestData.session_date,
        startTime: requestData.start_time,
        duration: requestData.duration_minutes,
        actionRequired: true,
        expiresAt: data.expires_at
      });

      await ExchangeNotificationService.sendSlotHeldNotification(recipientId, {
        type: ExchangeNotificationType.EXCHANGE_SLOT_HELD,
        requestId: data.id,
        practitionerId: recipientId,
        practitionerName: requesterName,
        sessionDate: requestData.session_date,
        startTime: requestData.start_time,
        duration: requestData.duration_minutes,
        actionRequired: false,
        expiresAt: slotHold.expires_at
      });

      return data.id;
    } catch (error) {
      console.error('Error sending exchange request:', error);
      throw error;
    }
  }

  /**
   * Accept a treatment exchange request
   */
  static async acceptExchangeRequest(
    requestId: string,
    recipientId: string,
    recipientNotes?: string
  ): Promise<string> {
    try {
      // Get the request - first check if it exists and get its status
      const { data: requestCheck, error: checkError } = await supabase
        .from('treatment_exchange_requests')
        .select('id, status, expires_at, accepted_at, declined_at')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check request: ${checkError.message}`);
      }

      if (!requestCheck) {
        throw new Error('Request not found. It may have been deleted or you may not have permission to access it.');
      }

      // Check if request is already processed
      if (requestCheck.status !== 'pending') {
        const statusMessages: Record<string, string> = {
          'accepted': 'This request has already been accepted',
          'declined': 'This request has already been declined',
          'expired': 'This request has expired',
          'cancelled': 'This request has been cancelled'
        };
        throw new Error(statusMessages[requestCheck.status] || `This request is no longer available (status: ${requestCheck.status})`);
      }

      // Now get the full request data
      const { data: request, error: requestError } = await supabase
        .from('treatment_exchange_requests')
        .select('*')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or status changed. Please refresh the page and try again.');
      }

      // Check if request has expired
      if (new Date(request.expires_at) < new Date()) {
        throw new Error('Request has expired');
      }

      // Get slot hold for this request
      // First try by request_id
      let slotHold = await SlotHoldingService.getSlotHoldByRequest(requestId);
      
      // If not found by request_id, try to find by practitioner, date, and time
      // (in case the request_id update failed or slot hold was created with null request_id)
      if (!slotHold) {
        // Convert time format for comparison
        // Database stores time as HH:MM:SS, but we need to match both formats
        const requestTime = request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3
          ? request.requested_start_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
          : request.requested_start_time;
        
        // Try to find slot hold by matching time (handle both HH:MM and HH:MM:SS formats)
        // Fetch all matching slot holds and filter by time overlap
        const { data: slotHoldsByDetails, error: slotError } = await supabase
          .from('slot_holds')
          .select('*')
          .eq('practitioner_id', request.recipient_id)
          .eq('session_date', request.requested_session_date)
          .in('status', ['active', 'converted']) // Include converted in case it was already processed
          .order('created_at', { ascending: false });
        
        if (!slotError && slotHoldsByDetails && slotHoldsByDetails.length > 0) {
          // Find slot hold that matches the time (handle both HH:MM and HH:MM:SS formats)
          const matchingSlotHold = slotHoldsByDetails.find(sh => {
            const shTime = sh.start_time as string;
            const shTimeHHMM = shTime.includes(':') && shTime.split(':').length === 3
              ? shTime.substring(0, 5) // Extract HH:MM from HH:MM:SS
              : shTime;
            return shTimeHHMM === requestTime || shTime === requestTime || shTime === `${requestTime}:00`;
          });
          
          if (matchingSlotHold) {
            // Check if it's expired
            const isExpired = matchingSlotHold.expires_at && new Date(matchingSlotHold.expires_at) < new Date();
            
            if (!isExpired && matchingSlotHold.status === 'active') {
              // Update it with the request_id for future queries
              await supabase
                .from('slot_holds')
                .update({ request_id: requestId })
                .eq('id', matchingSlotHold.id);
              
              slotHold = matchingSlotHold;
              console.log('Found and updated orphaned slot hold with request_id:', requestId, 'slot hold ID:', matchingSlotHold.id);
            }
          }
        }
      }
      
      // If slot hold doesn't exist or has expired, check for blocked time and conflicts first, then recreate it
      // This can happen if the hold expired but the request is still valid
      if (!slotHold || (slotHold.expires_at && new Date(slotHold.expires_at) < new Date()) || slotHold.status !== 'active') {
        console.log('Slot hold not found or expired, checking availability before recreating for request:', requestId);
        
        // Check for blocked time BEFORE recreating the slot hold
        const { getBlocksForDate, isTimeSlotBlocked } = await import('./block-time-utils');
        const blocks = await getBlocksForDate(request.recipient_id, request.requested_session_date);
        const startTime = request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3
          ? request.requested_start_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
          : request.requested_start_time;
        
        if (isTimeSlotBlocked(startTime, request.duration_minutes, blocks, request.requested_session_date)) {
          throw new Error('This time slot is now blocked or unavailable. The request cannot be accepted.');
        }

        // Check for existing bookings at this time slot (race condition protection)
        const startTimeForCheck = request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3
          ? request.requested_start_time
          : `${request.requested_start_time}:00`; // Convert HH:MM to HH:MM:SS
        
        const { data: existingBookings, error: bookingCheckError } = await supabase
          .from('client_sessions')
          .select('id, status')
          .eq('therapist_id', request.recipient_id)
          .eq('session_date', request.requested_session_date)
          .eq('start_time', startTimeForCheck)
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
          .limit(1);

        if (bookingCheckError) {
          console.error('Error checking for existing bookings:', bookingCheckError);
          throw new Error('Failed to verify availability. Please try again.');
        }

        if (existingBookings && existingBookings.length > 0) {
          throw new Error('This time slot has been booked by someone else. The request cannot be accepted.');
        }
        
        // Recreate the slot hold with the request details
        const endTime = request.requested_end_time.includes(':') && request.requested_end_time.split(':').length === 3
          ? request.requested_end_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
          : request.requested_end_time;
        
        const newSlotHold = await SlotHoldingService.holdSlot(
          request.recipient_id,
          requestId,
          request.requested_session_date,
          startTime,
          endTime,
          request.duration_minutes,
          60 // Longer hold duration when accepting (1 hour)
        );
        
        slotHold = newSlotHold;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('treatment_exchange_requests')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          recipient_notes: recipientNotes
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Convert slot hold to confirmed booking
      await SlotHoldingService.convertSlotToBooking(slotHold.id);

      // Calculate credits based on duration
      const requiredCredits = this.calculateRequiredCredits(request.duration_minutes);

      // Create or get conversation for messaging (try to get it before creating session)
      // This is done synchronously to include conversation_id in the RPC call if possible
      // If it fails, we'll update it later asynchronously
      let conversationId: string | null = null;
      try {
        const { MessagingManager } = await import('./messaging');
        conversationId = await MessagingManager.getOrCreateConversation(
          request.requester_id,
          request.recipient_id
        );
        console.log('Conversation created/retrieved for treatment exchange:', conversationId);
      } catch (error) {
        console.warn('Failed to create conversation before session creation (will update later):', error);
        // Try to find existing conversation as fallback
        try {
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant_1_id.eq.${request.requester_id},participant_2_id.eq.${request.recipient_id}),and(participant_1_id.eq.${request.recipient_id},participant_2_id.eq.${request.requester_id})`)
            .maybeSingle();
          
          if (existingConv?.id) {
            conversationId = existingConv.id;
            console.log('Found existing conversation:', conversationId);
          }
        } catch (fallbackError) {
          console.warn('Failed to find existing conversation:', fallbackError);
          // conversationId remains null, will be updated later
        }
      }

      // Final conflict check before creating the booking (race condition protection)
      // Check for existing bookings at this exact time slot
      const startTimeForFinalCheck = request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3
        ? request.requested_start_time
        : `${request.requested_start_time}:00`; // Convert HH:MM to HH:MM:SS
      
      const { data: finalBookingCheck, error: finalCheckError } = await supabase
        .from('client_sessions')
        .select('id, status')
        .eq('therapist_id', request.recipient_id)
        .eq('session_date', request.requested_session_date)
        .eq('start_time', startTimeForFinalCheck)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
        .limit(1);

      if (finalCheckError) {
        console.error('Error in final booking check:', finalCheckError);
        throw new Error('Failed to verify availability. Please try again.');
      }

      if (finalBookingCheck && finalBookingCheck.length > 0) {
        throw new Error('This time slot has been booked by someone else. The request cannot be accepted.');
      }

      // Create mutual exchange session and client_sessions using RPC function
      // This bypasses RLS to ensure both records are created successfully
      // RPC returns TABLE (array), so we need to handle it as an array
      const { data: sessionDataArray, error: sessionError } = await supabase
        .rpc('create_accepted_exchange_session', {
          p_request_id: requestId,
          p_requester_id: request.requester_id,
          p_recipient_id: request.recipient_id,
          p_session_date: request.requested_session_date,
          p_start_time: request.requested_start_time,
          p_end_time: request.requested_end_time,
          p_duration_minutes: request.duration_minutes,
          p_session_type: request.session_type,
          p_requester_notes: request.requester_notes || null,
          p_recipient_notes: recipientNotes || null,
          p_required_credits: requiredCredits,
          p_conversation_id: conversationId || null
        });

      if (sessionError) {
        console.error('Error creating accepted exchange session:', sessionError);
        throw sessionError;
      }

      // RPC returns TABLE (array), extract first element
      let sessionData: any = null;
      if (Array.isArray(sessionDataArray) && sessionDataArray.length > 0) {
        sessionData = sessionDataArray[0];
      } else if (sessionDataArray && !Array.isArray(sessionDataArray)) {
        // Handle case where RPC returns single object instead of array
        sessionData = sessionDataArray;
      }

      // Validate that sessionData exists and has required fields
      if (!sessionData) {
        console.error('RPC returned no data:', { requestId, sessionError, sessionDataArray });
        throw new Error('Failed to create exchange session: No data returned from server');
      }

      if (!sessionData.mutual_exchange_session_id && !sessionData.client_session_id) {
        console.error('RPC returned invalid data:', { sessionData, sessionDataArray, requestId });
        throw new Error('Failed to create exchange session: Invalid response from server');
      }

      // If conversation wasn't created yet, try to create/update it asynchronously
      // This is a fallback in case the synchronous creation above failed
      if (!conversationId && sessionData.mutual_exchange_session_id) {
        Promise.resolve().then(async () => {
          try {
            const { MessagingManager } = await import('./messaging');
            const newConversationId = await MessagingManager.getOrCreateConversation(
              request.requester_id,
              request.recipient_id
            );
            console.log('Conversation created/retrieved asynchronously for treatment exchange:', newConversationId);
            
            // Update the session with conversation_id if it was created
            if (newConversationId) {
              await supabase
                .from('mutual_exchange_sessions')
                .update({ conversation_id: newConversationId })
                .eq('id', sessionData.mutual_exchange_session_id);
            }
          } catch (error) {
            console.error('Failed to create conversation asynchronously:', error);
          }
        }).catch(err => console.warn('Error creating conversation asynchronously:', err));
      }

      // Get recipient data for notifications (fetch in parallel with session creation)
      const recipientDataPromise = supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', request.recipient_id)
        .single();

      // Credits are NOT deducted on acceptance per TREATMENT_EXCHANGE_SYSTEM_DESIGN.
      // Credits are deducted only when BOTH practitioners have booked (in bookReciprocalExchange).
      if (!sessionData.mutual_exchange_session_id) {
        console.error('Missing mutual_exchange_session_id', { sessionData });
        throw new Error('Failed to create exchange session: Missing session ID');
      }

      // Get recipient data (await the promise we created earlier)
      const { data: recipientData } = await recipientDataPromise;
      
      // Use recipientData for notification
      const recipientName = recipientData 
        ? `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() || 'A practitioner'
        : 'A practitioner';

      // Return session ID immediately - fire notifications and emails asynchronously
      // RPC returns { mutual_exchange_session_id, client_session_id }, not { id }
      const sessionIdToReturn = sessionData.mutual_exchange_session_id || sessionData.client_session_id;

      // Fire notifications and emails asynchronously (non-blocking)
      Promise.all([
        // Mark old notifications as read (Slot Reserved, New Request) - clean up UI
        ExchangeNotificationService.markRequestNotificationsAsRead(requestId, recipientId)
          .catch(err => console.warn('Failed to mark old notifications as read:', err)),

      // Send notification to requester that their request was accepted
      // Note: Exchange is NOT fully confirmed until BOTH practitioners book their sessions
        ExchangeNotificationService.sendExchangeResponseNotification(request.requester_id, {
        type: ExchangeNotificationType.EXCHANGE_REQUEST_ACCEPTED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: true, // Requester needs to wait for recipient to book return session
        message: 'Your treatment exchange request has been accepted. The exchange will be confirmed once both practitioners have booked their sessions.'
        }, 'accepted').catch(err => console.warn('Failed to send exchange response notification:', err)),

      // Note: Session confirmed notification will be sent later when BOTH practitioners have booked
      // This happens in bookReciprocalExchange() after practitioner_b_booked is set to true

        // Send peer booking confirmation emails (fire and forget)
        (async () => {
      try {
        // Get requester data for email
        const { data: requesterData } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', request.requester_id)
          .single();

        // Get client_sessions ID if it was created successfully
        const { data: clientSession } = await supabase
          .from('client_sessions')
          .select('id')
          .eq('therapist_id', request.recipient_id)
          .eq('client_id', request.requester_id)
          .eq('session_date', request.requested_session_date)
          .eq('start_time', request.requested_start_time)
          .eq('is_peer_booking', true)
          .order('created_at', { ascending: false })
          .limit(1)
              .maybeSingle();

        const clientSessionId = clientSession?.id;
        const sessionId = clientSessionId || sessionData.mutual_exchange_session_id;

        const practitionerName = recipientData 
          ? `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() || 'A practitioner'
          : 'A practitioner';
        const practitionerEmail = recipientData?.email || '';

        const clientName = requesterData 
          ? `${requesterData.first_name || ''} ${requesterData.last_name || ''}`.trim() || 'Practitioner'
          : 'Practitioner';
        const clientEmail = requesterData?.email || '';

        await NotificationSystem.sendPeerBookingNotifications(
          sessionId,
              request.requester_id,
              request.recipient_id,
          {
            sessionType: request.session_type || 'Peer Treatment',
            sessionDate: request.requested_session_date,
            sessionTime: request.requested_start_time,
            sessionDuration: request.duration_minutes,
            creditCost: requiredCredits
          },
          clientName,
          clientEmail,
          practitionerName,
          practitionerEmail
        );
      } catch (error) {
        console.warn('Failed to send peer booking confirmation emails:', error);
      }
        })()
      ]).catch(err => console.warn('Error in async notification/email tasks:', err));

      return sessionIdToReturn;
    } catch (error) {
      console.error('Error accepting exchange request:', error);
      throw error;
    }
  }

  /**
   * Decline a treatment exchange request
   */
  static async declineExchangeRequest(
    requestId: string,
    recipientId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Get the request first
      const { data: request, error: requestError } = await supabase
        .from('treatment_exchange_requests')
        .select('*')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or already processed');
      }

      // Update request status and get slot hold in parallel
      const [slotHoldResult, updateResult] = await Promise.all([
        SlotHoldingService.getSlotHoldByRequest(requestId),
        supabase
        .from('treatment_exchange_requests')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          recipient_notes: reason
        })
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
          .eq('status', 'pending')
      ]);

      if (updateResult.error) throw updateResult.error;

      // Release slot hold if it exists (non-blocking)
      if (slotHoldResult) {
        SlotHoldingService.releaseSlot(slotHoldResult.id).catch(err => 
          console.warn('Failed to release slot hold:', err)
        );
      }

      // Get recipient details and send notifications asynchronously (non-blocking)
      Promise.all([
        supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', recipientId)
          .single()
          .then(({ data: recipientData }) => {
      const recipientName = recipientData ? `${recipientData.first_name} ${recipientData.last_name}` : 'A practitioner';

            // Send notifications in parallel
            return Promise.all([
              // Mark old notifications as read (Slot Reserved, New Request) - clean up UI
              ExchangeNotificationService.markRequestNotificationsAsRead(requestId, recipientId)
                .catch(err => console.warn('Failed to mark old notifications as read:', err)),

              ExchangeNotificationService.sendExchangeResponseNotification(request.requester_id, {
        type: ExchangeNotificationType.EXCHANGE_REQUEST_DECLINED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: false
              }, 'declined').catch(err => console.warn('Failed to send decline notification:', err)),

              ExchangeNotificationService.sendSlotReleasedNotification(recipientId, {
        type: ExchangeNotificationType.EXCHANGE_SLOT_RELEASED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: false
              }).catch(err => console.warn('Failed to send slot released notification:', err))
            ]);
          })
      ]).catch(err => console.warn('Error in async decline notification tasks:', err));

    } catch (error) {
      console.error('Error declining exchange request:', error);
      throw error;
    }
  }

  /**
   * Get exchange requests for a user (sent and received)
   */
  static async getExchangeRequests(userId: string): Promise<{
    sent: ExchangeRequest[];
    received: ExchangeRequest[];
  }> {
    try {
      // Get sent requests
      const { data: sentRequests, error: sentError } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          *,
          recipient:users!treatment_exchange_requests_recipient_id_fkey(
            id,
            first_name,
            last_name,
            user_role,
            specializations,
            average_rating,
            profile_photo_url
          )
        `)
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Get received requests
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          *,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            id,
            first_name,
            last_name,
            user_role,
            specializations,
            average_rating,
            profile_photo_url
          )
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      return {
        sent: sentRequests || [],
        received: receivedRequests || []
      };
    } catch (error) {
      console.error('Error getting exchange requests:', error);
      return { sent: [], received: [] };
    }
  }

  /**
   * Get mutual exchange sessions for a user
   */
  static async getMutualExchangeSessions(userId: string): Promise<MutualExchangeSession[]> {
    try {
      const { data, error } = await supabase
        .from('mutual_exchange_sessions')
        .select('*')
        .or(`practitioner_a_id.eq.${userId},practitioner_b_id.eq.${userId}`)
        .order('session_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting mutual exchange sessions:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * 
   * @internal Use calculateDistance from matching module
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Import and use from matching module
    const { calculateDistance } = require('./treatment-exchange/matching');
    return calculateDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Book reciprocal exchange - recipient books back from requester
   * This completes the mutual exchange when both have booked
   */
  static async bookReciprocalExchange(
    exchangeRequestId: string,
    recipientId: string,
    bookingData: {
      session_date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      session_type?: string;
      notes?: string;
    }
  ): Promise<string> {
    try {
      // Get the original exchange request
      const { data: request, error: requestError } = await supabase
        .from('treatment_exchange_requests')
        .select('*')
        .eq('id', exchangeRequestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'accepted')
        .single();

      if (requestError || !request) {
        throw new Error('Exchange request not found or not accepted');
      }

      // Get the mutual exchange session
      const { data: session, error: sessionError } = await supabase
        .from('mutual_exchange_sessions')
        .select('*')
        .eq('exchange_request_id', exchangeRequestId)
        .single();

      if (sessionError || !session) {
        throw new Error('Exchange session not found');
      }

      // Check if recipient already booked by checking for active sessions
      // Don't just rely on the flag - check actual sessions to handle edge cases
      if (session.practitioner_b_booked) {
        // Double-check by looking for active sessions
        const { data: existingSessions } = await supabase
          .from('client_sessions')
          .select('id, status')
          .eq('is_peer_booking', true)
          .eq('therapist_id', request.requester_id) // Original requester provides service
          .eq('client_id', recipientId) // Original recipient receives service
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
          .gte('created_at', session.created_at || '1970-01-01') // Only sessions created after mutual session
          .limit(1);

        // Only throw error if there's actually an active session
        if (existingSessions && existingSessions.length > 0) {
          throw new Error('You have already booked your reciprocal session');
        } else {
          // Flag is true but no active session - reset the flag (edge case recovery)
          console.warn('⚠️ practitioner_b_booked flag is true but no active session found. Resetting flag.');
          await supabase
            .from('mutual_exchange_sessions')
            .update({ practitioner_b_booked: false })
            .eq('id', session.id);
        }
      }

      // Check recipient's credit balance
      const requiredCredits = this.calculateRequiredCredits(bookingData.duration_minutes);
      const recipientCreditCheck = await this.checkCreditBalance(recipientId, requiredCredits);
      
      if (!recipientCreditCheck.hasSufficientCredits) {
        throw new Error(`Insufficient credits. You have ${recipientCreditCheck.currentBalance} credits but need ${requiredCredits}.`);
      }

      // Check for blocked/unavailable time on requester's calendar (they're providing the service)
      const blocks = await getOverlappingBlocks(
        request.requester_id,
        bookingData.session_date,
        bookingData.start_time,
        bookingData.duration_minutes
      );

      if (blocks.length > 0) {
        const blockType = blocks[0].event_type === 'block' ? 'blocked' : 'unavailable';
        const blockMessage = blocks[0].title 
          ? `This time slot is ${blockType}: ${blocks[0].title}. Please select another time.`
          : `This time slot is ${blockType}. Please select another time.`;
        throw new Error(blockMessage);
      }

      // Final conflict check before creating booking (race condition protection)
      // Check for existing bookings at this exact time slot
      const startTimeForCheck = bookingData.start_time.includes(':') && bookingData.start_time.split(':').length === 3
        ? bookingData.start_time
        : `${bookingData.start_time}:00`; // Convert HH:MM to HH:mm:ss
      
      const { data: finalBookingCheck, error: finalCheckError } = await supabase
        .from('client_sessions')
        .select('id, status')
        .eq('therapist_id', request.requester_id) // Original requester provides service
        .eq('session_date', bookingData.session_date)
        .eq('start_time', startTimeForCheck)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
        .limit(1);

      if (finalCheckError) {
        console.error('Error in final booking check for reciprocal:', finalCheckError);
        throw new Error('Failed to verify availability. Please try again.');
      }

      if (finalBookingCheck && finalBookingCheck.length > 0) {
        throw new Error('This time slot has been booked by someone else. Please select another time.');
      }

      // Create reciprocal booking request
      const { data: reciprocalRequest, error: reciprocalError } = await supabase
        .from('treatment_exchange_requests')
        .insert({
          requester_id: recipientId, // Recipient becomes requester
          recipient_id: request.requester_id, // Original requester becomes recipient
          requested_session_date: bookingData.session_date,
          requested_start_time: bookingData.start_time,
          requested_end_time: bookingData.end_time,
          duration_minutes: bookingData.duration_minutes,
          session_type: bookingData.session_type || request.session_type,
          requester_notes: bookingData.notes,
          status: 'accepted', // Auto-accept since original was accepted
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (reciprocalError) throw reciprocalError;

      // Update original request to link reciprocal booking
      await supabase
        .from('treatment_exchange_requests')
        .update({ recipient_booking_request_id: reciprocalRequest.id })
        .eq('id', exchangeRequestId);

      // DO NOT set practitioner_b_booked yet - wait until booking is confirmed
      // This prevents the flag from being set if the booking fails

      // Credits will be processed AFTER the booking is created to link the session ID
      // This ensures we burn credits for this specific booking

      // Create client_sessions for reciprocal booking using RPC function with validation
      const { data: recipientData } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', recipientId)
        .single();

      const clientName = recipientData 
        ? `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim() 
        : 'Practitioner';
      const clientEmail = recipientData?.email || '';

      // Generate idempotency key (no Date.now() for double-submit protection)
      const idempotencyKey = `exchange-${exchangeRequestId}-reciprocal`;

      const { data: bookingResult, error: bookingError } = await supabase
        .rpc('create_treatment_exchange_booking', {
          p_therapist_id: request.requester_id, // Original requester provides service
          p_client_id: recipientId, // Original recipient receives service
          p_client_name: clientName,
          p_client_email: clientEmail,
          p_client_phone: null,
          p_session_date: bookingData.session_date,
          p_start_time: bookingData.start_time,
          p_duration_minutes: bookingData.duration_minutes,
          p_session_type: bookingData.session_type || request.session_type,
          p_price: 0,
          p_notes: bookingData.notes || null,
          p_is_peer_booking: true,
          p_credit_cost: requiredCredits,
          p_exchange_request_id: exchangeRequestId,
          p_mutual_exchange_session_id: session.id,
          p_idempotency_key: idempotencyKey
        });

      if (bookingError) throw bookingError;

      // Check RPC response (RPC returns JSONB, need to type assert)
      const result = bookingResult as any;
      if (!result || !result.success) {
        const errorCode = result?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = result?.error_message || 'Failed to create reciprocal booking';
        throw new Error(`${errorCode}: ${errorMessage}`);
      }

      // NOW that the booking is confirmed, mark practitioner_b as booked
      // This ensures the flag is only set if the booking actually succeeded
      const { error: updateError } = await supabase
        .from('mutual_exchange_sessions')
        .update({
          practitioner_b_booked: true,
          practitioner_b_notes: bookingData.notes
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Failed to update practitioner_b_booked flag:', updateError);
        // Don't throw - the booking was created, we can update the flag later if needed
      }

      // Process credits for BOTH sessions when both have booked (per TREATMENT_EXCHANGE_SYSTEM_DESIGN)
      // Session A: requester pays recipient (original session, created on accept)
      // Session B: recipient pays requester (reciprocal session, just created)
      if (result.session_id) {
        const { data: mes } = await supabase
          .from('mutual_exchange_sessions')
          .select('credits_deducted')
          .eq('id', session.id)
          .single();

        if (!mes?.credits_deducted) {
          // Find Session A (original: requester receives from recipient)
          const startTimeForQuery = request.requested_start_time.includes(':') && request.requested_start_time.split(':').length === 3
            ? request.requested_start_time
            : `${request.requested_start_time}:00`;
          const { data: sessionA } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', request.recipient_id)
            .eq('client_id', request.requester_id)
            .eq('session_date', request.requested_session_date)
            .eq('start_time', startTimeForQuery)
            .eq('is_peer_booking', true)
            .maybeSingle();

          if (sessionA?.id) {
            console.log('💰 Processing Session A credits (requester pays recipient):', {
              clientId: request.requester_id,
              practitionerId: request.recipient_id,
              sessionId: sessionA.id,
              durationMinutes: request.duration_minutes
            });
            const { error: creditAError } = await supabase.rpc('process_peer_booking_credits', {
              p_client_id: request.requester_id,
              p_practitioner_id: request.recipient_id,
              p_session_id: sessionA.id,
              p_duration_minutes: request.duration_minutes,
              p_product_id: null
            });
            if (creditAError) throw creditAError;
          }

          console.log('💰 Processing Session B credits (recipient pays requester):', {
            clientId: recipientId,
            practitionerId: request.requester_id,
            sessionId: result.session_id,
            durationMinutes: bookingData.duration_minutes
          });
          const { error: creditBError } = await supabase.rpc('process_peer_booking_credits', {
            p_client_id: recipientId,
            p_practitioner_id: request.requester_id,
            p_session_id: result.session_id,
            p_duration_minutes: bookingData.duration_minutes,
            p_product_id: null
          });
          if (creditBError) throw creditBError;

          await supabase
            .from('mutual_exchange_sessions')
            .update({ credits_deducted: true })
            .eq('id', session.id);
        }

        // Check if both practitioners have now booked (exchange is fully confirmed)
        // Fetch the updated session to check both booking flags
        const { data: updatedSession } = await supabase
          .from('mutual_exchange_sessions')
          .select('practitioner_a_booked, practitioner_b_booked')
          .eq('id', session.id)
          .single();

        if (updatedSession?.practitioner_a_booked && updatedSession?.practitioner_b_booked) {
          // Both practitioners have accepted and booked - exchange is now fully confirmed
          await supabase
            .from('mutual_exchange_sessions')
            .update({ 
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

          console.log('✅ Treatment exchange fully confirmed - both practitioners have booked');
          
          // Send confirmation notifications to both practitioners
          try {
            const { ExchangeNotificationService, ExchangeNotificationType } = await import('./exchange-notifications');
            
            // Notify both practitioners that the exchange is fully confirmed
            await Promise.all([
              ExchangeNotificationService.sendSessionConfirmedNotification(request.requester_id, {
                type: ExchangeNotificationType.EXCHANGE_SESSION_CONFIRMED,
                requestId: exchangeRequestId,
                practitionerId: recipientId,
                sessionDate: bookingData.session_date,
                startTime: bookingData.start_time,
                duration: bookingData.duration_minutes,
                actionRequired: false
              }).catch(err => console.warn('Failed to send confirmation to requester:', err)),
              
              ExchangeNotificationService.sendSessionConfirmedNotification(recipientId, {
                type: ExchangeNotificationType.EXCHANGE_SESSION_CONFIRMED,
                requestId: exchangeRequestId,
                practitionerId: request.requester_id,
                sessionDate: request.requested_session_date,
                startTime: request.requested_start_time,
                duration: request.duration_minutes,
                actionRequired: false
              }).catch(err => console.warn('Failed to send confirmation to recipient:', err))
            ]);
          } catch (notificationError) {
            console.warn('Failed to send exchange confirmation notifications:', notificationError);
          }
        }
      } else {
        console.warn('⚠️ Could not find session_id in booking result, skipping immediate credit deduction for reciprocal booking');
      }

      return session.id;
    } catch (error) {
      console.error('Error booking reciprocal exchange:', error);
      throw error;
    }
  }

  /**
   * @deprecated No longer called. Credits are deducted only when BOTH practitioners have booked (in bookReciprocalExchange).
   * Kept for reference. See TREATMENT_EXCHANGE_SYSTEM_DESIGN.md.
   */
  private static async processExchangeCreditsOnAcceptance(
    sessionId: string,
    requesterId: string,
    recipientId: string,
    requiredCredits: number,
    durationMinutes: number
  ): Promise<void> {
    try {
      // Check if credits already deducted
      const { data: session, error: sessionError } = await supabase
        .from('mutual_exchange_sessions')
        .select('credits_deducted')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        throw new Error('Session not found');
      }

      if (session.credits_deducted) {
        return; // Already processed
      }

      // Get the client_sessions ID for this exchange
      // The requester is the client, recipient is the therapist
      // Wait a moment for the RPC to fully commit the client_sessions record
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let clientSessionId: string | null = null;
      let retries = 3;
      
      while (!clientSessionId && retries > 0) {
        const { data: clientSession, error: clientSessionError } = await supabase
          .from('client_sessions')
          .select('id')
          .eq('client_id', requesterId)
          .eq('therapist_id', recipientId)
          .eq('is_peer_booking', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      
        if (clientSessionError) {
          console.error(`❌ Error finding client session (attempt ${4 - retries}/3):`, clientSessionError);
          console.error('   Details:', {
            requesterId,
            recipientId,
            sessionId,
            error: clientSessionError.message,
            code: clientSessionError.code,
            details: clientSessionError.details,
            hint: clientSessionError.hint
          });
          
          if (retries === 1) {
            throw new Error(`Could not find client session for credit processing after 3 attempts. Error: ${clientSessionError.message || 'Unknown error'}. This may be an RLS (Row Level Security) issue.`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
          retries--;
          continue;
        }

        if (clientSession?.id) {
          clientSessionId = clientSession.id;
          console.log('✅ Found client session:', clientSessionId);
          break;
        } else {
          console.warn(`⚠️ Client session not found (attempt ${4 - retries}/3), retrying...`);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      if (!clientSessionId) {
        console.error('❌ Client session not found for credit processing after all retries', {
          requesterId,
          recipientId,
          sessionId
        });
        throw new Error('Client session not found for credit processing. The session may not have been created properly by the RPC function.');
      }

      // Use process_peer_booking_credits to properly handle credit transactions
      // This creates session_earning for practitioner and session_payment for client
      // Credit cost = duration_minutes (1 credit per minute) from practitioner_products
      console.log('💰 Processing credits:', {
        clientId: requesterId,
        practitionerId: recipientId,
        sessionId: clientSessionId,
        durationMinutes
      });
      
      const { data: creditResult, error: creditError } = await supabase.rpc('process_peer_booking_credits', {
        p_client_id: requesterId, // Requester pays
        p_practitioner_id: recipientId, // Recipient earns
        p_session_id: clientSessionId, // Link to client_sessions
        p_duration_minutes: durationMinutes,
        p_product_id: null // Could be enhanced to look up product by session_type if needed
      });

      console.log('💰 Credit processing result:', { creditResult, creditError });

      if (creditError) {
        console.error('Error processing peer booking credits:', creditError);
        throw creditError;
      }

      if (!creditResult?.success) {
        throw new Error(creditResult?.error || 'Failed to process credits');
      }

      // Mark credits as deducted
      await supabase
        .from('mutual_exchange_sessions')
        .update({ credits_deducted: true })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error processing exchange credits on acceptance:', error);
      throw error;
    }
  }

  /**
   * Cancel a treatment exchange session with refund logic
   */
  static async cancelExchangeSession(
    sessionId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<{ refundAmount: number; refundPercent: number }> {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('mutual_exchange_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Check if session can be cancelled
      if (session.status === 'cancelled') {
        throw new Error('Session already cancelled');
      }

      if (session.status === 'completed') {
        throw new Error('Cannot cancel completed session');
      }

      // Check if this is a reciprocal booking and if the first peer treatment is completed
      // Rule: Cannot cancel reciprocal booking if first peer treatment is done and reciprocal is in the future
      const { data: exchangeRequest, error: requestError } = await supabase
        .from('treatment_exchange_requests')
        .select('id, recipient_booking_request_id')
        .eq('id', session.exchange_request_id)
        .single();

      if (!requestError && exchangeRequest?.recipient_booking_request_id) {
        // This is a reciprocal booking (has recipient_booking_request_id pointing to original)
        // The original request ID is stored in recipient_booking_request_id
        const originalRequestId = exchangeRequest.recipient_booking_request_id;
        
        // Find the first mutual exchange session (from the original request)
        const { data: firstSession, error: firstSessionError } = await supabase
          .from('mutual_exchange_sessions')
          .select('id, status, session_date')
          .eq('exchange_request_id', originalRequestId)
          .single();

        if (!firstSessionError && firstSession) {
          // Check if first session is completed
          if (firstSession.status === 'completed') {
            // Check if reciprocal session is in the future
            const reciprocalDate = new Date(`${session.session_date}T${session.start_time}`);
            const now = new Date();
            
            if (reciprocalDate > now) {
              throw new Error('Cannot cancel reciprocal booking: The first peer treatment has been completed and the reciprocal booking is in the future.');
            }
          }
        }
      }

      // Calculate refund based on cancellation time
      const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
      const now = new Date();
      const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Updated cancellation policy (24h full, 12-24h partial 50%, <12h none)
      let refundPercent = 0;
      if (hoursUntilSession >= 24) {
        refundPercent = 100; // Full refund (24+ hours)
      } else if (hoursUntilSession >= 12) {
        refundPercent = 50; // 50% refund (12-24 hours)
      } else {
        refundPercent = 0; // No refund (<12 hours)
      }

      const refundAmount = Math.round((session.credits_exchanged * refundPercent) / 100);

      // Update session status
      await supabase
        .from('mutual_exchange_sessions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: reason,
          refund_percentage: refundPercent
        })
        .eq('id', sessionId);

      // Process refund if applicable
      if (refundAmount > 0 && session.credits_deducted) {
        // Determine who gets refunded based on who cancelled
        const isPractitionerA = cancelledBy === session.practitioner_a_id;
        const refundRecipient = isPractitionerA ? session.practitioner_a_id : session.practitioner_b_id;
        const refundFrom = isPractitionerA ? session.practitioner_b_id : session.practitioner_a_id;

        // Refund credits
        await supabase.rpc('credits_transfer', {
          p_from_user_id: refundFrom,
          p_to_user_id: refundRecipient,
          p_amount: refundAmount,
          p_reference_id: sessionId,
          p_reference_type: 'refund',
          p_description: `Cancellation refund (${refundPercent}%)`
        });

        await supabase
          .from('mutual_exchange_sessions')
          .update({ refund_processed: true })
          .eq('id', sessionId);
      }

      // Cancel related client_sessions
      await supabase
        .from('client_sessions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .or(`therapist_id.eq.${session.practitioner_a_id},therapist_id.eq.${session.practitioner_b_id}`)
        .eq('session_date', session.session_date)
        .eq('start_time', session.start_time)
        .eq('is_peer_booking', true);

      return { refundAmount, refundPercent };
    } catch (error) {
      console.error('Error cancelling exchange session:', error);
      throw error;
    }
  }

  /**
   * Get conversation ID for an exchange session
   */
  static async getExchangeConversation(sessionId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('mutual_exchange_sessions')
        .select('conversation_id')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data?.conversation_id || null;
    } catch (error) {
      console.error('Error getting exchange conversation:', error);
      return null;
    }
  }

  /**
   * Convert degrees to radians
   * 
   * @internal This is now handled in matching module
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
