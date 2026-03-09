import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPractitionerProducts, PractitionerProduct } from '@/lib/stripe-products';
import { TreatmentExchangeService } from '@/lib/treatment-exchange';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getBlocksForDate, isTimeSlotBlocked, getOverlappingBlocks } from '@/lib/block-time-utils';

interface ExchangeAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requesterId: string;
  requesterName: string;
  requestedSessionDate: string;
  requestedStartTime: string;
  requestedDuration: number;
  recipientId: string;
  onAccepted: () => void;
  isAlreadyAccepted?: boolean;
}

export const ExchangeAcceptanceModal: React.FC<ExchangeAcceptanceModalProps> = ({
  open,
  onOpenChange,
  requestId,
  requesterId,
  requesterName,
  requestedSessionDate,
  requestedStartTime,
  requestedDuration,
  recipientId,
  onAccepted,
  isAlreadyAccepted = false
}) => {
  const [services, setServices] = useState<PractitionerProduct[]>([]);
  const [selectedService, setSelectedService] = useState<PractitionerProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  
  // Reciprocal booking date/time selection
  const [reciprocalBookingDate, setReciprocalBookingDate] = useState<string>('');
  const [reciprocalBookingTime, setReciprocalBookingTime] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [checkingRequestStatus, setCheckingRequestStatus] = useState(false);
  const [hasReciprocalBooking, setHasReciprocalBooking] = useState<boolean | null>(null);
  const [checkingReciprocalBooking, setCheckingReciprocalBooking] = useState(false);

  // Debug: Log when modal opens
  useEffect(() => {
    console.log('🔍 ExchangeAcceptanceModal render:', {
      open,
      requestId,
      requesterId,
      requesterName,
      recipientId,
      isAlreadyAccepted,
      requestStatus,
      hasReciprocalBooking,
      checkingRequestStatus,
      checkingReciprocalBooking
    });
  }, [open, requestId, requesterId, requesterName, recipientId, isAlreadyAccepted, requestStatus, hasReciprocalBooking, checkingRequestStatus, checkingReciprocalBooking]);

  // Check request status when modal opens and set up real-time subscriptions
  useEffect(() => {
    if (open && requestId && recipientId) {
      console.log('🔍 useEffect triggered - checking request status:', { isAlreadyAccepted, requestId, recipientId });
      checkRequestStatus();
      checkReciprocalBooking();
      
      // Set up real-time subscription for mutual_exchange_sessions
      const channel = supabase
        .channel(`mutual-exchange-${requestId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mutual_exchange_sessions',
            filter: `exchange_request_id=eq.${requestId}`
          },
          () => {
            // Refresh reciprocal booking status when mutual session changes
            checkReciprocalBooking();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_sessions',
            filter: `is_peer_booking=eq.true`
          },
          (payload) => {
            // Only refresh if the change is relevant to this exchange
            // We'll check if it's related by refreshing the check
            checkReciprocalBooking();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setRequestStatus(null);
      setHasReciprocalBooking(null);
    }
  }, [open, requestId, recipientId, isAlreadyAccepted]);

  const checkReciprocalBooking = async () => {
    if (!requestId || !recipientId) return;
    
    try {
      setCheckingReciprocalBooking(true);
      
      // Check if a mutual_exchange_sessions record exists
      const { data: mutualSession, error } = await supabase
        .from('mutual_exchange_sessions')
        .select('id, practitioner_b_booked, practitioner_b_id, practitioner_a_id, created_at')
        .eq('exchange_request_id', requestId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking reciprocal booking:', error);
        setHasReciprocalBooking(null);
        return;
      }

      // If no mutual session exists, reciprocal booking hasn't been made
      if (!mutualSession) {
        setHasReciprocalBooking(false);
        return;
      }

      // Check if the current user (recipient) is practitioner_b
      // In the exchange: requester is practitioner_a, recipient is practitioner_b
      if (mutualSession.practitioner_b_id === recipientId) {
        // Check if there's an ACTIVE (non-cancelled) reciprocal booking session
        // The reciprocal booking would be: practitioner_b (recipient) as client, practitioner_a (requester) as therapist
        // IMPORTANT: We need to check sessions created AFTER the mutual session was created to ensure it's for THIS exchange
        const { data: reciprocalSessions, error: sessionError } = await supabase
          .from('client_sessions')
          .select('id, status, created_at')
          .eq('is_peer_booking', true)
          .eq('therapist_id', mutualSession.practitioner_a_id) // Original requester provides service
          .eq('client_id', mutualSession.practitioner_b_id) // Original recipient receives service
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
          .gte('created_at', mutualSession.created_at || '1970-01-01') // Only sessions created after mutual session
          .order('created_at', { ascending: false })
          .limit(1);

        if (sessionError) {
          console.error('Error checking reciprocal sessions:', sessionError);
          // Fallback to flag check
          setHasReciprocalBooking(mutualSession.practitioner_b_booked === true);
          return;
        }

        // If there's an active session, reciprocal booking exists
        // If no active session but flag is true, it might have been cancelled - allow rebooking
        const hasActiveReciprocalBooking = reciprocalSessions && reciprocalSessions.length > 0;
        
        console.log('🔍 Real-time reciprocal booking check:', {
          requestId,
          recipientId,
          mutualSessionId: mutualSession.id,
          practitioner_b_id: mutualSession.practitioner_b_id,
          practitioner_a_id: mutualSession.practitioner_a_id,
          practitioner_b_booked: mutualSession.practitioner_b_booked,
          activeSessionsFound: reciprocalSessions?.length || 0,
          hasActiveReciprocalBooking,
          timestamp: new Date().toISOString()
        });
        
        setHasReciprocalBooking(hasActiveReciprocalBooking);
      } else {
        // If they're not practitioner_b, they can't book the reciprocal
        setHasReciprocalBooking(true);
      }
    } catch (error) {
      console.error('Error checking reciprocal booking:', error);
      setHasReciprocalBooking(null);
    } finally {
      setCheckingReciprocalBooking(false);
    }
  };

  const checkRequestStatus = useCallback(async () => {
    if (!requestId || !recipientId) return;
    
    console.log('🔍 checkRequestStatus called with:', { isAlreadyAccepted, requestId, recipientId });
    
    try {
      setCheckingRequestStatus(true);
      const { data: request, error } = await supabase
        .from('treatment_exchange_requests')
        .select('status, expires_at, accepted_at, declined_at')
        .eq('id', requestId)
        .eq('recipient_id', recipientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking request status:', error);
        return;
      }

      if (!request) {
        setRequestStatus('not_found');
        toast.error('Request not found');
        return;
      }

      setRequestStatus(request.status);

      // If we're in "booking only" mode (already accepted), ignore the accepted status
      if (isAlreadyAccepted && request.status === 'accepted') {
          console.log('✅ Request is already accepted and we are in booking mode - skipping error toast');
        return;
      }

      // Check if request has expired
      if (request.status === 'pending' && request.expires_at && new Date(request.expires_at) < new Date()) {
        setRequestStatus('expired');
        toast.error('This request has expired');
      } else if (request.status !== 'pending') {
        const statusMessages: Record<string, string> = {
          'accepted': 'This request has already been accepted',
          'declined': 'This request has already been declined',
          'expired': 'This request has expired',
          'cancelled': 'This request has been cancelled'
        };
        toast.error(statusMessages[request.status] || 'This request is no longer available');
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    } finally {
      setCheckingRequestStatus(false);
    }
  }, [requestId, recipientId, isAlreadyAccepted]);

  // Load requester's services
  useEffect(() => {
    if (open && requesterId) {
      console.log('📦 Loading services for requester:', requesterId);
      loadServices();
      loadCreditBalance();
    } else if (open && !requesterId) {
      console.error('❌ Modal opened but requesterId is missing!');
    }
  }, [open, requesterId]);

  // Calculate credit cost when service is selected
  useEffect(() => {
    if (selectedService) {
      calculateCreditCost();
    } else {
      setCreditCost(null);
    }
  }, [selectedService]);

  // Fetch available time slots when date or service changes
  useEffect(() => {
    if (reciprocalBookingDate && selectedService) {
      fetchAvailableTimeSlots();
    } else {
      setAvailableTimeSlots([]);
      setReciprocalBookingTime('');
    }
  }, [reciprocalBookingDate, selectedService]);

  // Real-time subscription for availability changes
  useEffect(() => {
    if (!requesterId || !reciprocalBookingDate || !open) return;

    const channel = supabase
      .channel(`availability-acceptance-${requesterId}-${reciprocalBookingDate}`)
      // Listen to postgres_changes for calendar_events (blocked time)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${requesterId}`
        },
        (payload: any) => {
          const newEventType = payload.new?.event_type;
          const oldEventType = payload.old?.event_type;
          if (newEventType === 'block' || newEventType === 'unavailable' || 
              oldEventType === 'block' || oldEventType === 'unavailable') {
            const eventDate = payload.new?.start_time || payload.old?.start_time;
            // Check if the event date matches the selected date (handle both ISO format and date string)
            const eventDateStr = eventDate ? new Date(eventDate).toISOString().split('T')[0] : '';
            const isRelevantDate = eventDateStr === reciprocalBookingDate || 
                                   (typeof eventDate === 'string' && eventDate.startsWith(reciprocalBookingDate));
            
            console.log('🔄 Real-time blocked time update:', {
              eventType: newEventType || oldEventType,
              eventDate,
              eventDateStr,
              reciprocalBookingDate,
              isRelevantDate,
              willRefresh: isRelevantDate
            });
            
            if (isRelevantDate) {
              console.log('🔄 Refreshing available time slots due to blocked time change');
              fetchAvailableTimeSlots();
            }
          }
        }
      )
      // Listen to postgres_changes for client_sessions (bookings)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `therapist_id=eq.${requesterId}`
        },
        (payload: any) => {
          const sessionDate = payload.new?.session_date || payload.old?.session_date;
          if (sessionDate === reciprocalBookingDate) {
            fetchAvailableTimeSlots();
          }
        }
      )
      // Listen to postgres_changes for practitioner_availability
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioner_availability',
          filter: `user_id=eq.${requesterId}`
        },
        () => {
          // Always refresh if availability changes
          fetchAvailableTimeSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requesterId, reciprocalBookingDate, open]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const result = await getPractitionerProducts(requesterId, false);
      if (result.success && result.products) {
        setServices(result.products);
        
        // Auto-select first service if available
        if (result.products.length > 0) {
          setSelectedService(result.products[0]);
        }
      } else {
        console.error('Error loading products:', result.error);
        toast.error('Failed to load services');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', recipientId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading credit balance:', error);
        return;
      }

      setCreditBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading credit balance:', error);
    }
  };

  const calculateCreditCost = async () => {
    if (!selectedService) return;

    try {
      setCheckingCredits(true);
      // Credit cost = duration_minutes (1 credit per minute)
      // Use same fallback logic as backend: minimum 1 credit if duration is 0 or null
      const duration = selectedService.duration_minutes || 60;
      const cost = duration > 0 ? duration : 1; // Minimum 1 credit
      setCreditCost(cost);
    } catch (error) {
      console.error('Error calculating credit cost:', error);
      toast.error('Failed to calculate credit cost');
    } finally {
      setCheckingCredits(false);
    }
  };

  const fetchAvailableTimeSlots = async () => {
    if (!reciprocalBookingDate || !selectedService) {
      setAvailableTimeSlots([]);
      return;
    }

    setLoadingTimeSlots(true);
    try {
      const serviceDuration = selectedService.duration_minutes || 60;
      const serviceDurationHours = serviceDuration / 60;

      // Get requester's availability (they're providing the service)
      const { data: availability, error: availabilityError } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', requesterId)
        .maybeSingle();

      if (availabilityError) {
        console.error('Error fetching practitioner availability:', availabilityError);
        await generateDefaultTimeSlots(serviceDuration);
        return;
      }

      // If no availability data, use default hours
      if (!availability) {
        await generateDefaultTimeSlots(serviceDuration);
        return;
      }

      // Get existing bookings for the selected date
      // IMPORTANT: Only check therapist_id (requester providing service), not client_id
      // This ensures we're checking the correct practitioner's calendar
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', requesterId) // Requester is providing the service
        .eq('session_date', reciprocalBookingDate)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (bookingsError) throw bookingsError;

      // Get blocked/unavailable time for this date
      // CRITICAL: Must fetch blocks before filtering slots
      let blocks = await getBlocksForDate(requesterId, reciprocalBookingDate);
      
      // Validate blocks were fetched correctly - fallback to empty array
      if (!Array.isArray(blocks)) {
        console.error('[BLOCKED TIME ERROR] Blocks is not an array!', typeof blocks, blocks);
        blocks = []; // Fallback to empty array to prevent errors
      }
      
      // Log blocks found for debugging
      if (blocks.length > 0) {
        console.error('[BLOCKED TIME] *** FOUND', blocks.length, 'BLOCKS FOR', reciprocalBookingDate, '***');
      }

      // Get day of week for the selected date
      const selectedDate = new Date(reciprocalBookingDate);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Get working hours for this day
      const daySchedule = availability.working_hours[dayOfWeek];
      
      if (!daySchedule || !daySchedule.enabled || !daySchedule.hours || daySchedule.hours.length === 0) {
        setAvailableTimeSlots([]);
        return;
      }

      // Generate time slots with 15-minute intervals
      const { generate15MinuteSlots } = await import('@/lib/slot-generation-utils');
      const timeSlots: string[] = [];
      
      for (const timeBlock of daySchedule.hours) {
        const slots = generate15MinuteSlots(
          timeBlock.start,
          timeBlock.end,
          serviceDuration,
          existingBookings || [],
          blocks,
          reciprocalBookingDate
        );
        timeSlots.push(...slots);
      }

      setAvailableTimeSlots(timeSlots);
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      toast.error('Failed to load available times');
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const generateDefaultTimeSlots = async (serviceDuration: number = 60) => {
    try {
      // Get existing bookings for the selected date
      const { data: existingBookings, error } = await supabase
        .from('client_sessions')
        .select('start_time, duration_minutes, status, expires_at')
        .eq('therapist_id', requesterId)
        .eq('session_date', reciprocalBookingDate)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment']);

      if (error) throw error;

      // Get blocked/unavailable time for this date
      const blocks = await getBlocksForDate(requesterId, reciprocalBookingDate);

      // Use 15-minute interval slot generation with buffer enforcement
      const { generateDefault15MinuteSlots } = await import('@/lib/slot-generation-utils');
      const timeSlots = generateDefault15MinuteSlots(
        serviceDuration,
        existingBookings || [],
        blocks,
        reciprocalBookingDate
      );

      setAvailableTimeSlots(timeSlots);
    } catch (error) {
      console.error('Error generating default time slots:', error);
      setAvailableTimeSlots([]);
    }
  };

  const handleAccept = async () => {
    // First, verify request is still pending (unless we're just booking return session)
    if (!isAlreadyAccepted && requestStatus !== 'pending') {
      // Re-check status in case it changed
      await checkRequestStatus();
      if (requestStatus !== 'pending') {
        toast.error('This request is no longer available. Please refresh the page.');
        return;
      }
    }

    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }

    if (creditCost === null) {
      toast.error('Calculating credit cost...');
      return;
    }

    // Check credit balance
    if (creditBalance < creditCost) {
      toast.error(`Insufficient credits. You have ${creditBalance} credits but need ${creditCost}.`);
      return;
    }

    // Validate date/time selection BEFORE accepting
    if (!reciprocalBookingDate || !reciprocalBookingTime) {
      toast.error('Please select a date and time for your treatment');
      return;
    }

    // Validate that selected time slot is in the future
    const selectedDateTime = new Date(`${reciprocalBookingDate}T${reciprocalBookingTime}`);
    const now = new Date();
    if (selectedDateTime <= now) {
      toast.error('Please select a future date and time for your treatment');
      return;
    }

    // Validate that selected time slot is still available
    if (!availableTimeSlots.includes(reciprocalBookingTime)) {
      toast.error('The selected time slot is no longer available. Please select another time.');
      return;
    }

    try {
      setLoading(true);

      // Only accept if not already accepted
      if (!isAlreadyAccepted) {
        // First, accept the exchange request
        await TreatmentExchangeService.acceptExchangeRequest(
          requestId,
          recipientId
        );

        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Re-validate availability before booking (race condition protection)
      // Convert time to HH:mm:ss format for comparison (database stores TIME as HH:mm:ss)
      const startTimeForCheck = reciprocalBookingTime.includes(':') && reciprocalBookingTime.split(':').length === 2
        ? `${reciprocalBookingTime}:00` // Convert HH:mm to HH:mm:ss
        : reciprocalBookingTime; // Already in HH:mm:ss format
      
      const { data: lastMinuteCheck } = await supabase
        .from('client_sessions')
        .select('id')
        .eq('session_date', reciprocalBookingDate)
        .eq('start_time', startTimeForCheck)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
        .or(`therapist_id.eq.${requesterId},client_id.eq.${requesterId}`)
        .limit(1);

      if (lastMinuteCheck && lastMinuteCheck.length > 0) {
        toast.error('This time slot was just booked by someone else. Please select another time.');
        return;
      }

      // Calculate duration BEFORE using it in getOverlappingBlocks
      const duration = selectedService.duration_minutes || 60;

      // Check for blocked/unavailable time on requester's calendar (they're providing the service)
      const blocks = await getOverlappingBlocks(
        requesterId,
        reciprocalBookingDate,
        reciprocalBookingTime,
        duration
      );

      if (blocks.length > 0) {
        const blockType = blocks[0].event_type === 'block' ? 'blocked' : 'unavailable';
        const blockMessage = blocks[0].title 
          ? `This time slot is ${blockType}: ${blocks[0].title}. Please select another time.`
          : `This time slot is ${blockType}. Please select another time.`;
        toast.error(blockMessage);
        return;
      }

      // Then, create reciprocal booking with SELECTED date/time (not requested session date/time)
      // Calculate end time for reciprocal booking - ensure consistent format (HH:mm:ss)
      // duration is already declared above
      const startTime = new Date(`${reciprocalBookingDate}T${reciprocalBookingTime}`);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      const endTimeString = format(endTime, 'HH:mm:ss');
      
      // Ensure start_time is in HH:mm:ss format for consistency
      const startTimeString = reciprocalBookingTime.includes(':') && reciprocalBookingTime.split(':').length === 2
        ? `${reciprocalBookingTime}:00` // Convert HH:mm to HH:mm:ss
        : reciprocalBookingTime; // Already in HH:mm:ss format

      // Create reciprocal booking with recipient's selected date/time
      await TreatmentExchangeService.bookReciprocalExchange(
        requestId,
        recipientId,
        {
          session_date: reciprocalBookingDate, // Use selected date, not requested date
          start_time: startTimeString,        // Use consistent HH:mm:ss format
          end_time: endTimeString,            // Use consistent HH:mm:ss format
          duration_minutes: duration > 0 ? duration : 60, // Consistent fallback
          session_type: selectedService.name,
          notes: `Treatment exchange - ${selectedService.name}`
        }
      );

      toast.success(isAlreadyAccepted ? 'Return session booked successfully!' : 'Treatment exchange accepted! Reciprocal booking created.');
      onAccepted();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error accepting exchange:', error);
      toast.error(error?.message || 'Failed to accept exchange request');
    } finally {
      setLoading(false);
    }
  };

  const hasSufficientCredits = creditCost !== null && creditBalance >= creditCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAlreadyAccepted ? 'Book Your Return Session' : 'Accept Treatment Exchange Request'}</DialogTitle>
          <DialogDescription>
            {isAlreadyAccepted 
              ? `The exchange request has been accepted. Choose when you'd like to receive your treatment from ${requesterName}. You can select any available date and time that works for you.`
              : `Select a service from ${requesterName} to complete the exchange. Credits will be deducted when both sessions are confirmed.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Request Status Warning */}
          {checkingRequestStatus && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                <span className="text-sm text-yellow-900 dark:text-yellow-100">Checking request status...</span>
              </div>
            </div>
          )}
          {/* Show error only if NOT in booking mode OR if there's a real problem */}
          {/* Hide error if: already accepted AND status is accepted (regardless of reciprocal booking status) */}
          {(() => {
            const shouldShowError = requestStatus && requestStatus !== 'pending' && !checkingRequestStatus && 
             !(isAlreadyAccepted && requestStatus === 'accepted');
            console.log('🔍 Error banner condition:', {
              requestStatus,
              checkingRequestStatus,
              isAlreadyAccepted,
              shouldShowError,
              condition: !(isAlreadyAccepted && requestStatus === 'accepted')
            });
            return shouldShowError;
          })() && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div className="text-sm text-red-900 dark:text-red-100">
                  <p className="font-medium">This request is no longer available</p>
                  <p className="text-xs mt-1">
                    {requestStatus === 'declined' && 'This request has already been declined.'}
                    {requestStatus === 'expired' && 'This request has expired.'}
                    {requestStatus === 'cancelled' && 'This request has been cancelled.'}
                    {requestStatus === 'not_found' && 'This request could not be found.'}
                    {!['declined', 'expired', 'cancelled', 'not_found'].includes(requestStatus) && `Request status: ${requestStatus}`}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Show success message if reciprocal booking is already done */}
          {isAlreadyAccepted && requestStatus === 'accepted' && hasReciprocalBooking === true && !checkingReciprocalBooking && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="text-sm text-green-900 dark:text-green-100">
                  <p className="font-medium">Return Session Already Booked ✓</p>
                  <p className="text-xs mt-1">
                    Your return session has already been booked. The exchange is now fully confirmed.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Show info message if accepted but reciprocal booking not done yet */}
          {isAlreadyAccepted && requestStatus === 'accepted' && hasReciprocalBooking === false && !checkingReciprocalBooking && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium">Ready to Book Your Return Session</p>
                  <p className="text-xs mt-1">
                    The exchange has been accepted. Select a service, date, and time below when you're ready. You can close this and return later if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Request Details */}
          {isAlreadyAccepted ? (
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Original Request</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    {requesterName} requested a {requestedDuration}-minute session with you on:
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(requestedSessionDate), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${requestedStartTime}`), 'h:mm a')}
                      </span>
                    </div>
                    <div>
                      Duration: {requestedDuration} minutes
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Requested Session</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(requestedSessionDate), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${requestedStartTime}`), 'h:mm a')}
                    </span>
                  </div>
                  <div>
                    Duration: {requestedDuration} minutes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Select Service *</Label>
            {loadingServices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading services...</span>
              </div>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {requesterName} has no active services available.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can still accept the request, but you'll need to book a service later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Select
                value={selectedService?.id || ''}
                onValueChange={(value) => {
                  const service = services.find(s => s.id === value);
                  setSelectedService(service || null);
                }}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{service.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {service.duration_minutes || 60} min
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reciprocal Booking Date/Time Selection */}
          {selectedService && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reciprocal-date">Select Date for Your Treatment *</Label>
                <Input
                  id="reciprocal-date"
                  type="date"
                  value={reciprocalBookingDate}
                  onChange={(e) => setReciprocalBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isAlreadyAccepted 
                    ? `Choose any date that works for you. This is when you'll receive your treatment from ${requesterName}.`
                    : `Select when you'd like to receive your treatment from ${requesterName}`}
                </p>
              </div>

              {reciprocalBookingDate && (
                <div>
                  <Label htmlFor="reciprocal-time">Select Time *</Label>
                  {loadingTimeSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading available times...</span>
                    </div>
                  ) : availableTimeSlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">
                      No available times for this date. Please select another date.
                    </div>
                  ) : (
                    <Select
                      value={reciprocalBookingTime}
                      onValueChange={setReciprocalBookingTime}
                    >
                      <SelectTrigger id="reciprocal-time" className="mt-1">
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected Service Details */}
          {selectedService && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedService.name}</h3>
                      {selectedService.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedService.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {selectedService.duration_minutes || 60} min
                    </Badge>
                  </div>

                  {/* Credit Cost Display */}
                  {checkingCredits ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Calculating credit cost...</span>
                    </div>
                  ) : creditCost !== null && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Credit Cost:</span>
                        <span className="font-semibold">{creditCost} credits</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Your Balance:</span>
                        <span className="font-semibold">{creditBalance} credits</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-muted-foreground">After Exchange:</span>
                        <span className={`font-semibold ${hasSufficientCredits ? 'text-green-600' : 'text-red-600'}`}>
                          {creditBalance - creditCost} credits
                        </span>
                      </div>
                      {!hasSufficientCredits && (
                        <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>Insufficient credits. You need {creditCost - creditBalance} more credits.</span>
                        </div>
                      )}
                      {hasSufficientCredits && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>You have sufficient credits for this exchange.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How Treatment Exchange Works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Credits are only deducted when both practitioners have confirmed their sessions</li>
                  <li>You're booking a {selectedService?.duration_minutes || requestedDuration}-minute session with {requesterName}</li>
                  <li>They've requested a {requestedDuration}-minute session with you on {format(new Date(requestedSessionDate), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${requestedStartTime}`), 'h:mm a')}</li>
                  <li>{isAlreadyAccepted ? 'Choose any date and time that works for you (doesn\'t have to be the same day as the original request)' : 'Select when you\'d like to receive your treatment (doesn\'t have to be the same day)'}</li>
                  <li>{isAlreadyAccepted ? 'Your return session will be scheduled when you confirm below' : 'Both sessions will be scheduled once you accept'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={loading || checkingRequestStatus || checkingReciprocalBooking || (!isAlreadyAccepted && requestStatus !== 'pending') || (isAlreadyAccepted && hasReciprocalBooking === true) || !selectedService || !hasSufficientCredits || checkingCredits || !reciprocalBookingDate || !reciprocalBookingTime}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isAlreadyAccepted ? 'Booking...' : 'Accepting...'}
              </>
            ) : (
              isAlreadyAccepted ? 'Confirm Return Session Booking' : 'Accept & Book Service'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

