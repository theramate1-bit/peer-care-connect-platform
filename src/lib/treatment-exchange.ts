import { supabase } from '@/integrations/supabase/client';
import { SlotHoldingService } from './slot-holding';
import { ExchangeNotificationService, ExchangeNotificationType } from './exchange-notifications';

export interface TreatmentExchangePreferences {
  preferred_specializations: string[];
  rating_threshold: number;
  auto_accept: boolean;
  max_distance_km: number;
  preferred_session_types: string[];
  availability_preferences: {
    weekdays: boolean;
    weekends: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

export interface ExchangeRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  requested_session_date: string;
  requested_start_time: string;
  requested_end_time: string;
  duration_minutes: number;
  session_type?: string;
  requester_notes?: string;
  recipient_notes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at?: string;
  declined_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    specializations: string[];
    average_rating?: number;
    profile_photo_url?: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    specializations: string[];
    average_rating?: number;
    profile_photo_url?: string;
  };
}

export interface MutualExchangeSession {
  id: string;
  exchange_request_id: string;
  practitioner_a_id: string;
  practitioner_b_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  session_type?: string;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  practitioner_a_notes?: string;
  practitioner_b_notes?: string;
  practitioner_a_rating?: number;
  practitioner_b_rating?: number;
  practitioner_a_feedback?: string;
  practitioner_b_feedback?: string;
  credits_exchanged: number;
  created_at: string;
  updated_at: string;
}

export interface EligiblePractitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  specializations: string[];
  average_rating?: number;
  total_sessions?: number;
  profile_photo_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  treatment_exchange_preferences?: TreatmentExchangePreferences;
}

export class TreatmentExchangeService {
  /**
   * Check if user has sufficient credits for treatment exchange
   */
  static async checkCreditBalance(userId: string, requiredCredits: number = 1): Promise<{
    hasSufficientCredits: boolean;
    currentBalance: number;
    requiredCredits: number;
  }> {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('credit_settings')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Expecting shape: credit_settings: { balance: number }
      const currentBalance =
        (userData?.credit_settings &&
          (typeof (userData as any).credit_settings.balance === 'number'
            ? (userData as any).credit_settings.balance
            : parseInt((userData as any).credit_settings?.balance ?? '0', 10))) || 0;
      const hasSufficientCredits = currentBalance >= requiredCredits;

      return {
        hasSufficientCredits,
        currentBalance,
        requiredCredits
      };
    } catch (error) {
      console.error('Error checking credit balance:', error);
      return {
        hasSufficientCredits: false,
        currentBalance: 0,
        requiredCredits
      };
    }
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
   * Get eligible practitioners for treatment exchange based on preferences
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
    try {
      // Get user's preferences
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('treatment_exchange_preferences, latitude, longitude')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const userPrefs = userData?.treatment_exchange_preferences as TreatmentExchangePreferences || {};
      const userLat = userData?.latitude;
      const userLng = userData?.longitude;

      // Build query
      let query = supabase
        .from('users')
        .select(`
          id,
          user_id: id,
          first_name,
          last_name,
          user_role,
          specializations,
          average_rating,
          total_sessions,
          profile_photo_url,
          location,
          latitude,
          longitude,
          treatment_exchange_preferences
        `)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('treatment_exchange_enabled', true)
        .eq('profile_completed', true)
        .neq('id', userId); // Exclude self

      // Apply rating filter
      const ratingThreshold = filters?.rating_threshold || userPrefs.rating_threshold || 4;
      if (ratingThreshold > 0) {
        query = query.gte('average_rating', ratingThreshold);
      }

      const { data, error } = await query;

      if (error) throw error;

      let practitioners = data || [];

      // Apply specialization filter
      if (filters?.specializations && filters.specializations.length > 0) {
        practitioners = practitioners.filter(p => 
          p.specializations && 
          filters.specializations!.some(spec => p.specializations.includes(spec))
        );
      }

      // Apply distance filter
      if (filters?.max_distance_km && userLat && userLng) {
        const maxDistance = filters.max_distance_km;
        practitioners = practitioners.filter(p => {
          if (!p.latitude || !p.longitude) return false;
          
          const distance = this.calculateDistance(userLat, userLng, p.latitude, p.longitude);
          return distance <= maxDistance;
        });
      }

      return practitioners;
    } catch (error) {
      console.error('Error getting eligible practitioners:', error);
      return [];
    }
  }

  /**
   * Send a treatment exchange request
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
      // Check credit balance first
      const requiredCredits = Math.ceil(requestData.duration_minutes / 60); // 1 credit per hour
      const creditCheck = await this.checkCreditBalance(requesterId, requiredCredits);
      
      if (!creditCheck.hasSufficientCredits) {
        throw new Error(`Insufficient credits. You have ${creditCheck.currentBalance} credits but need ${creditCheck.requiredCredits} credits for this exchange.`);
      }

      // Validate that recipient is eligible
      const eligiblePractitioners = await this.getEligiblePractitioners(requesterId);
      const recipient = eligiblePractitioners.find(p => p.id === recipientId);
      
      if (!recipient) {
        throw new Error('Recipient is not eligible for treatment exchange');
      }

      // Check for existing pending requests
      const { data: existingRequest } = await supabase
        .from('treatment_exchange_requests')
        .select('id')
        .eq('requester_id', requesterId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        throw new Error('You already have a pending request with this practitioner');
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
      // Get the request
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

      // Check if request has expired
      if (new Date(request.expires_at) < new Date()) {
        throw new Error('Request has expired');
      }

      // Get slot hold for this request
      const slotHold = await SlotHoldingService.getSlotHoldByRequest(requestId);
      if (!slotHold) {
        throw new Error('Slot hold not found - request may have expired');
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

      // Create mutual exchange session
      const { data: sessionData, error: sessionError } = await supabase
        .from('mutual_exchange_sessions')
        .insert({
          exchange_request_id: requestId,
          practitioner_a_id: request.requester_id,
          practitioner_b_id: request.recipient_id,
          session_date: request.requested_session_date,
          start_time: request.requested_start_time,
          end_time: request.requested_end_time,
          duration_minutes: request.duration_minutes,
          session_type: request.session_type,
          status: 'scheduled',
          credits_exchanged: Math.ceil(request.duration_minutes / 60) // 1 credit per hour
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Atomic credit transfer: requester -> recipient (1 credit per hour)
      const requiredCredits = Math.ceil(request.duration_minutes / 60);
      const { error: transferError } = await supabase.rpc('credits_transfer', {
        p_from_user_id: request.requester_id,
        p_to_user_id: request.recipient_id,
        p_amount: requiredCredits,
        p_reference_id: requestId,
        p_reference_type: 'exchange',
        p_description: 'Treatment exchange transfer'
      });

      if (transferError) {
        // Rollback: mark request back to pending and cancel session if transfer fails
        await supabase
          .from('treatment_exchange_requests')
          .update({ status: 'pending', accepted_at: null })
          .eq('id', requestId);
        // Optionally delete created session and release slot
        await supabase
          .from('mutual_exchange_sessions')
          .delete()
          .eq('id', sessionData.id);
        await SlotHoldingService.releaseSlot(slotHold.id);
        throw new Error(transferError.message || 'Credit transfer failed');
      }

      // Get recipient details for notification
      const { data: recipientData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', recipientId)
        .single();

      const recipientName = recipientData ? `${recipientData.first_name} ${recipientData.last_name}` : 'A practitioner';

      // Send notification to requester
      await ExchangeNotificationService.sendExchangeResponseNotification(request.requester_id, {
        type: ExchangeNotificationType.EXCHANGE_REQUEST_ACCEPTED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: true
      }, 'accepted');

      // Send session confirmed notification
      await ExchangeNotificationService.sendSessionConfirmedNotification(recipientId, {
        type: ExchangeNotificationType.EXCHANGE_SESSION_CONFIRMED,
        requestId: requestId,
        practitionerId: request.requester_id,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: false
      });

      return sessionData.id;
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

      // Release the slot hold
      const slotHold = await SlotHoldingService.getSlotHoldByRequest(requestId);
      if (slotHold) {
        await SlotHoldingService.releaseSlot(slotHold.id);
      }

      // Update request status
      const { error } = await supabase
        .from('treatment_exchange_requests')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          recipient_notes: reason
        })
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending');

      if (error) throw error;

      // Get recipient details for notification
      const { data: recipientData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', recipientId)
        .single();

      const recipientName = recipientData ? `${recipientData.first_name} ${recipientData.last_name}` : 'A practitioner';

      // Send notification to requester
      await ExchangeNotificationService.sendExchangeResponseNotification(request.requester_id, {
        type: ExchangeNotificationType.EXCHANGE_REQUEST_DECLINED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: false
      }, 'declined');

      // Send slot released notification to recipient
      await ExchangeNotificationService.sendSlotReleasedNotification(recipientId, {
        type: ExchangeNotificationType.EXCHANGE_SLOT_RELEASED,
        requestId: requestId,
        practitionerId: recipientId,
        practitionerName: recipientName,
        sessionDate: request.requested_session_date,
        startTime: request.requested_start_time,
        duration: request.duration_minutes,
        actionRequired: false
      });

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
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
