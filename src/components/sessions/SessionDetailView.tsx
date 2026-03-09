import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Star, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  X,
  Heart,
  Activity,
  Bone,
  MessageSquare,
  Download,
  Target,
  FileText,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { RescheduleBooking } from '@/components/booking/RescheduleBooking';
import { usePlan } from '@/contexts/PlanContext';
import { MessagingManager } from '@/lib/messaging';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { CancellationPolicyService } from '@/lib/cancellation-policy';
import { RefundService } from '@/lib/refund-service';
import { parseISO, isPast, isBefore, addMinutes } from 'date-fns';
import { PreAssessmentStatus } from '@/components/forms/PreAssessmentStatus';
import { getDisplaySessionStatus, getDisplaySessionStatusLabel, isPractitionerSessionVisible } from '@/lib/session-display-status';
import { createInAppNotification } from '@/lib/notification-utils';

interface Session {
  id: string;
  session_date: string;
  session_time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  session_type: string;
  focus_area: string;
  preparation_notes?: string;
  what_to_bring?: string[];
  location?: string;
  directionsUrl?: string;
  appointment_type?: string;
  visit_address?: string;
  price?: number;
  payment_status?: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  credit_cost?: number;
  therapist_id: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_attended?: boolean;
  is_peer_booking?: boolean;
  pre_assessment_required?: boolean;
  pre_assessment_completed?: boolean;
  pre_assessment_form_id?: string | null;
  therapist: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    bio?: string;
    specialties?: string[];
    rating?: number;
    review_count?: number;
    phone?: string;
    email?: string;
    profile_photo_url?: string;
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    profile_photo_url?: string;
  };
}

interface MutualExchangeSession {
  id: string;
  conversation_id: string | null;
  practitioner_a_id: string;
  practitioner_b_id: string;
  practitioner_a_booked: boolean;
  practitioner_b_booked: boolean;
  credits_deducted: boolean;
  credits_exchanged: number;
}

interface SessionDetailViewProps {
  sessionId?: string;
  onBack?: () => void;
  className?: string;
}

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  sessionId: propSessionId,
  onBack: propOnBack,
  className
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  
  // Get sessionId from route params or prop
  const sessionId = propSessionId || params.sessionId;
  
  // Use prop onBack or default navigate back
  const onBack = propOnBack || (() => navigate(-1));
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const { isPro } = usePlan();
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<{start: string, end: string}[]>([]);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundCalculation, setRefundCalculation] = useState<any>(null);
  const [processingCancellation, setProcessingCancellation] = useState(false);
  const [mutualExchangeSession, setMutualExchangeSession] = useState<MutualExchangeSession | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  useEffect(() => {
    if (sessionId && user?.id) {
      // Wait for userProfile to load before fetching session details
      if (userProfile !== undefined) {
      fetchSessionDetails();
      }
    } else {
      setLoading(false);
      if (!sessionId) {
      toast({
        title: "Error",
        description: "Session ID is required",
        variant: "destructive"
      });
    }
    }
  }, [sessionId, user?.id, userProfile]);

  // Extract location from notes if present (format: "Location: ...")
  const extractLocation = (notes: string | null): string | undefined => {
    if (!notes) return undefined;
    const locationMatch = notes.match(/Location:\s*(.+?)(?:\n|$)/i);
    return locationMatch ? locationMatch[1].trim() : undefined;
  };

  // Extract other notes (everything except location line)
  const extractNotes = (notes: string | null): string | undefined => {
    if (!notes) return undefined;
    const withoutLocation = notes.replace(/Location:\s*.+?(?:\n|$)/i, '').trim();
    return withoutLocation || undefined;
  };

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      if (!sessionId || sessionId === 'undefined') {
        throw new Error('Invalid session ID');
      }

      // Check if user is a practitioner based on their role
      const isPractitioner = userProfile?.user_role && 
        ['sports_therapist', 'massage_therapist', 'osteopath', 'practitioner'].includes(userProfile.user_role);

      console.log('SessionDetailView: Fetching session', {
        sessionId,
        userId: user.id,
        userRole: userProfile?.user_role,
        isPractitioner
      });

      // Try both client_id and therapist_id queries
      // First try based on role, then fallback to the other
      const selectQuery = `
          id,
          session_date,
          start_time,
          duration_minutes,
          status,
          session_type,
          notes,
          price,
          payment_status,
          stripe_payment_intent_id,
          credit_cost,
          is_peer_booking,
        client_id,
        client_name,
        client_email,
        client_phone,
        client_attended,
        therapist_id,
        pre_assessment_required,
        pre_assessment_completed,
        pre_assessment_form_id,
        appointment_type,
        visit_address,
          therapist:users!client_sessions_therapist_id_fkey (
            id,
            first_name,
            last_name,
            user_role,
            phone,
            email,
            location,
            clinic_address,
            profile_photo_url
        ),
        client:users!client_sessions_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          profile_photo_url
          )
      `;

      // Try practitioner query first if user is a practitioner, otherwise try client query
      let query = supabase
        .from('client_sessions')
        .select(selectQuery)
        .eq('id', sessionId);

      if (isPractitioner) {
        query = query.eq('therapist_id', user.id);
      } else {
        query = query.eq('client_id', user.id);
      }

      let { data: raw, error } = await query.maybeSingle();

      // If no result, try the opposite query as fallback
      if (!raw && !error) {
        console.log('SessionDetailView: Primary query returned no results, trying fallback');
        const fallbackQuery = supabase
          .from('client_sessions')
          .select(selectQuery)
          .eq('id', sessionId);

        if (isPractitioner) {
          // Already tried therapist_id, try client_id
          fallbackQuery.eq('client_id', user.id);
        } else {
          // Already tried client_id, try therapist_id
          fallbackQuery.eq('therapist_id', user.id);
        }
        
        const fallbackResult = await fallbackQuery.maybeSingle();
        if (fallbackResult.data) {
          raw = fallbackResult.data;
          console.log('SessionDetailView: Fallback query succeeded');
        } else if (fallbackResult.error) {
          error = fallbackResult.error;
        }
      }

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      if (!raw) {
        throw new Error('Session not found or you do not have access to it');
      }

      if (isPractitioner && !isPractitionerSessionVisible(raw)) {
        throw new Error('This session is no longer active for practitioner sessions/notes views');
      }

      const notesWithoutLocation = extractNotes(raw.notes);
      // Booking record first: appointment_type + visit_address (mobile) vs practitioner clinic/location (clinic)
      const isMobile = raw.appointment_type === 'mobile' && raw.visit_address?.trim();
      const clinicAddress = raw.therapist?.clinic_address?.trim() || raw.therapist?.location?.trim();
      const location = isMobile
        ? raw.visit_address!.trim()
        : (clinicAddress || extractLocation(raw.notes) || undefined);
      const isPractitionerRole = userProfile?.user_role && ['sports_therapist', 'massage_therapist', 'osteopath', 'practitioner'].includes(userProfile.user_role);
      const directionsUrl = isMobile
        ? (isPractitionerRole && raw.visit_address
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(raw.visit_address.trim())}`
          : undefined)
        : (location ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}` : undefined);

      // Map to component Session interface
      const mapped: Session = {
        id: raw.id,
        session_date: raw.session_date,
        session_time: raw.start_time,
        duration: raw.duration_minutes,
        status: raw.status,
        session_type: raw.session_type,
        focus_area: notesWithoutLocation || undefined, // Notes without location line
        preparation_notes: undefined, // Not in database schema
        what_to_bring: undefined, // Not in database schema
        location,
        directionsUrl,
        appointment_type: raw.appointment_type,
        visit_address: raw.visit_address,
        price: raw.price || undefined,
        payment_status: raw.payment_status || undefined,
        stripe_payment_intent_id: raw.stripe_payment_intent_id || undefined,
        stripe_session_id: raw.stripe_session_id || undefined,
        credit_cost: raw.credit_cost || undefined,
        therapist_id: raw.therapist?.id || '',
        client_id: raw.client_id || undefined,
        client_name: raw.client_name || undefined,
        client_email: raw.client_email || undefined,
        client_phone: raw.client_phone || undefined,
        client_attended: raw.client_attended !== undefined ? raw.client_attended : true,
        is_peer_booking: raw.is_peer_booking || false,
        pre_assessment_required: raw.pre_assessment_required ?? false,
        pre_assessment_completed: raw.pre_assessment_completed ?? false,
        pre_assessment_form_id: raw.pre_assessment_form_id || null,
        therapist: {
          id: raw.therapist?.id || '',
          first_name: raw.therapist?.first_name || '',
          last_name: raw.therapist?.last_name || '',
          user_role: raw.therapist?.user_role || '',
          phone: raw.therapist?.phone || undefined,
          email: raw.therapist?.email || undefined,
          profile_photo_url: raw.therapist?.profile_photo_url || undefined,
          bio: undefined,
          specialties: undefined,
          rating: undefined,
          review_count: undefined,
        },
        client: raw.client ? {
          id: raw.client.id,
          first_name: raw.client.first_name || '',
          last_name: raw.client.last_name || '',
          email: raw.client.email || undefined,
          phone: raw.client.phone || undefined,
          profile_photo_url: raw.client.profile_photo_url || undefined,
        } : undefined
      };

      setSession(mapped);

      // If this is a peer booking, fetch mutual exchange session data
      if (raw.is_peer_booking) {
        try {
          // Find mutual_exchange_sessions where both practitioners match and session date matches
          const { data: mesData, error: mesError } = await supabase
            .from('mutual_exchange_sessions')
            .select('id, conversation_id, practitioner_a_id, practitioner_b_id, practitioner_a_booked, practitioner_b_booked, credits_deducted, credits_exchanged')
            .eq('session_date', raw.session_date)
            .or(`and(practitioner_a_id.eq.${raw.therapist_id},practitioner_b_id.eq.${raw.client_id}),and(practitioner_a_id.eq.${raw.client_id},practitioner_b_id.eq.${raw.therapist_id})`)
            .maybeSingle();

          if (!mesError && mesData) {
            setMutualExchangeSession(mesData as MutualExchangeSession);
          }
        } catch (error) {
          console.error('Error fetching mutual exchange session:', error);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Error fetching session details:', {
        message: errorMessage,
        error: error,
        sessionId,
        userId: user?.id
      });
      toast({
        title: "Error",
        description: errorMessage || "Failed to load session details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleRescheduleSuccess = () => {
    fetchSessionDetails(); // Refresh session data
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from('client_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled"
      });
      
      // Refresh session data
      fetchSessionDetails();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: "Failed to cancel session",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePractitionerCancel = async () => {
    if (!session) return;

    // Stricter validation to prevent scams and wrongful refunds
    if (session.status === 'cancelled') {
      toast({
        title: "Error",
        description: "This booking is already cancelled",
        variant: "destructive"
      });
      return;
    }

    if (session.status === 'completed') {
      toast({
        title: "Error",
        description: "Cannot cancel a completed session",
        variant: "destructive"
      });
      return;
    }

    // Validate session is not in the past (for peer bookings especially)
    if (session.is_peer_booking) {
      try {
        const sessionDate = session.session_date || session.sessionDate;
        const sessionTime = session.start_time || session.session_time || session.startTime;
        const durationMinutes = session.duration_minutes || session.duration || 60;
        
        if (sessionDate && sessionTime) {
          const sessionDateTime = parseISO(`${sessionDate}T${sessionTime}`);
          const sessionEndTime = addMinutes(sessionDateTime, durationMinutes);
          
          if (isPast(sessionEndTime)) {
            toast({
              title: "Error",
              description: "Cannot cancel a session that has already ended",
              variant: "destructive"
            });
            return;
          }

          // Check if session has already started
          const now = new Date();
          if (isBefore(sessionDateTime, now)) {
            toast({
              title: "Error",
              description: "This session has already started and cannot be cancelled",
              variant: "destructive"
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error validating session date:', error);
        toast({
          title: "Error",
          description: "Error validating session. Please try again.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Determine refund type (stripe vs credit)
      const refundType = await RefundService.getRefundType(session.id);

      // Use cancellation policy for time-based refund: 24h full, 12h half, <12h none (KAN-18)
      let refundAmount: number;
      let refundPercent: number;
      let refundTypeLabel: 'full' | 'partial' | 'none';

      if (session.is_peer_booking) {
        // Peer bookings: use policy for display; process_peer_booking_refund applies policy server-side
        const calculation = await CancellationPolicyService.calculateRefund(session.id);
        if (calculation.success && calculation.refund_amount != null && calculation.refund_percent != null) {
          refundAmount = calculation.refund_amount;
          refundPercent = calculation.refund_percent;
          refundTypeLabel = (calculation.refund_type as 'full' | 'partial' | 'none') || 'none';
        } else {
          refundAmount = session.credit_cost ?? 0;
          refundPercent = 100;
          refundTypeLabel = 'full';
        }
      } else {
        const calculation = await CancellationPolicyService.calculateRefund(session.id);
        if (calculation.success && calculation.refund_amount != null && calculation.refund_percent != null) {
          refundAmount = calculation.refund_amount;
          refundPercent = calculation.refund_percent;
          refundTypeLabel = (calculation.refund_type as 'full' | 'partial' | 'none') || 'none';
        } else {
          refundAmount = session.price || 0;
          refundPercent = 100;
          refundTypeLabel = 'full';
        }
      }

      setRefundCalculation({
        success: true,
        refund_amount: refundAmount,
        refund_percent: refundPercent,
        refund_type: refundTypeLabel,
        refund_type_method: refundType || 'unknown'
      });

      setShowCancellationDialog(true);
    } catch (error) {
      console.error('Error preparing cancellation:', error);
      toast({
        title: "Error",
        description: "Failed to prepare cancellation",
        variant: "destructive"
      });
    }
  };

  const confirmPractitionerCancellation = async () => {
    if (!session || !refundCalculation) return;

    // Additional validation before processing cancellation
    if (session.status === 'cancelled') {
      toast({
        title: "Error",
        description: "This booking is already cancelled",
        variant: "destructive"
      });
      setShowCancellationDialog(false);
      return;
    }

    if (session.status === 'completed') {
      toast({
        title: "Error",
        description: "Cannot cancel a completed session",
        variant: "destructive"
      });
      setShowCancellationDialog(false);
      return;
    }

    // Validate session is not in the past (for peer bookings especially)
    if (session.is_peer_booking) {
      try {
        const sessionDate = session.session_date || session.sessionDate;
        const sessionTime = session.start_time || session.session_time || session.startTime;
        const durationMinutes = session.duration_minutes || session.duration || 60;
        
        if (sessionDate && sessionTime) {
          const sessionDateTime = parseISO(`${sessionDate}T${sessionTime}`);
          const sessionEndTime = addMinutes(sessionDateTime, durationMinutes);
          
          if (isPast(sessionEndTime)) {
            toast({
              title: "Error",
              description: "Cannot cancel a session that has already ended",
              variant: "destructive"
            });
            setShowCancellationDialog(false);
            return;
          }

          // Check if session has already started
          const now = new Date();
          if (isBefore(sessionDateTime, now)) {
            toast({
              title: "Error",
              description: "This session has already started and cannot be cancelled",
              variant: "destructive"
            });
            setShowCancellationDialog(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error validating session date:', error);
        toast({
          title: "Error",
          description: "Error validating session. Please try again.",
          variant: "destructive"
        });
        setShowCancellationDialog(false);
        return;
      }
    }

    try {
      setProcessingCancellation(true);

      // For peer bookings (treatment exchange), use the proper refund function
      // This ensures mutual_exchange_sessions and reciprocal bookings are also cancelled
      if (session.is_peer_booking) {
        const { data: refundResult, error: refundError } = await supabase
          .rpc('process_peer_booking_refund', {
            p_session_id: session.id,
            p_cancellation_reason: cancellationReason || 'Cancelled by practitioner'
          });

        if (refundError) {
          throw new Error(refundError.message || 'Refund processing failed');
        }

        if (!refundResult || !refundResult.success) {
          throw new Error(refundResult?.error || 'Refund processing failed');
        }

        toast({
          title: "Session Cancelled",
          description: refundResult.refunded_credits && refundResult.refunded_credits > 0
            ? `Session cancelled. ${refundResult.refunded_credits} credits refunded.`
            : "Session cancelled successfully."
        });

        setShowCancellationDialog(false);
        setCancellationReason('');
        setRefundCalculation(null);
        fetchSessionDetails();
        return;
      }

      // For regular (non-peer) bookings, use the standard refund flow
      // Process refund if applicable
      if (refundCalculation.refund_amount > 0 && refundCalculation.refund_type_method !== 'unknown') {
        const refundResult = await RefundService.processRefund(
          session.id,
          refundCalculation.refund_amount,
          refundCalculation.refund_type_method as 'stripe' | 'credit',
          cancellationReason || 'Cancelled by practitioner'
        );

        if (!refundResult.success) {
          console.warn('Refund processing failed:', refundResult.error);
          // Continue with cancellation even if refund fails
        }
      }

      // Update session status
      const updateData: any = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id,
        cancellation_reason: cancellationReason || 'Cancelled by practitioner'
      };

      // Update payment status if refund was processed
      if (refundCalculation.refund_amount > 0) {
        updateData.payment_status = 'refunded';
        updateData.refund_amount = refundCalculation.refund_amount;
        updateData.refund_percentage = refundCalculation.refund_percent;
      }

      const { error } = await supabase
        .from('client_sessions')
        .update(updateData)
        .eq('id', session.id);

      if (error) throw error;

      // Send cancellation notification to client (with location/directions from central helper)
      if (session.client_email) {
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              sessionId: session.id,
              emailType: 'cancellation',
              cancellationReason: cancellationReason || 'Session cancelled by practitioner',
              refundAmount: refundCalculation.refund_amount || 0
            }
          });
        } catch (emailError) {
          console.warn('Failed to send cancellation email:', emailError);
        }
      }

      // Send in-app notification to client
      if (session.client_id) {
        try {
          const locationLine = session.location ? ` Location: ${session.location}.` : '';
          await createInAppNotification({
            recipientId: session.client_id,
            type: 'session_cancelled',
            title: 'Session Cancelled by Practitioner',
            body: `Your session on ${new Date(session.session_date).toLocaleDateString()} has been cancelled by ${session.therapist.first_name} ${session.therapist.last_name}.${locationLine}${refundCalculation.refund_amount > 0 ? ` A refund of £${refundCalculation.refund_amount.toFixed(2)} will be processed.` : ''}`,
            payload: {
              session_id: session.id,
              cancelled_by: 'practitioner',
              refund_amount: refundCalculation.refund_amount || 0
            },
            sourceType: 'session',
            sourceId: session.id
          });
        } catch (notifError) {
          console.warn('Failed to send notification:', notifError);
        }
      }

      toast({
        title: "Session Cancelled",
        description: refundCalculation.refund_amount > 0 
          ? `Session cancelled. Refund of £${refundCalculation.refund_amount.toFixed(2)} will be processed.`
          : "Session cancelled successfully."
      });

      setShowCancellationDialog(false);
      setCancellationReason('');
      setRefundCalculation(null);
      
      // Refresh session data
      fetchSessionDetails();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: "Failed to cancel session",
        variant: "destructive"
      });
    } finally {
      setProcessingCancellation(false);
    }
  };

  const handleCreateTreatmentPlan = async () => {
    if (!session || !user?.id) return;
    try {
      setCreatingPlan(true);
      // Create minimal plan and link session
      const { data: planCreate, error: planErr } = await supabase.rpc('create_treatment_plan', {
        p_practitioner_id: session.therapist_id,
        p_client_id: user.id,
        p_title: `${session.session_type} Plan (${formatDate(session.session_date)})`,
        p_goals: [],
        p_interventions: [],
        p_start_date: session.session_date,
        p_end_date: null,
        p_clinician_notes: null,
        p_attachments: []
      });
      if (planErr) throw planErr;
      if (planCreate) {
        await supabase.rpc('link_session_to_plan', {
          p_plan_id: planCreate,
          p_session_id: session.id,
          p_notes: null,
          p_adherence: null
        });
        toast({ title: 'Treatment Plan Created', description: 'Plan linked to this session.' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to create treatment plan', variant: 'destructive' });
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleMessageTherapist = async () => {
    if (!session || !user?.id) return;
    try {
      // For peer bookings, use conversation_id from mutual_exchange_sessions if available
      if (session.is_peer_booking && mutualExchangeSession?.conversation_id) {
        navigate(`/messages?conversation=${mutualExchangeSession.conversation_id}`);
        return;
      }

      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        session.therapist_id
      );
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const handleMessagePractitioner = async () => {
    if (!session || !user?.id || !session.client_id) return;
    try {
      // For peer bookings, use conversation_id from mutual_exchange_sessions if available
      if (session.is_peer_booking && mutualExchangeSession?.conversation_id) {
        navigate(`/messages?conversation=${mutualExchangeSession.conversation_id}`);
        return;
      }

      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        session.client_id
      );
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const handleSuggestNewTime = async () => {
    if (!isPro || !session) return;
    try {
      setSuggesting(true);
      const { data, error } = await supabase.rpc('suggest_slots', {
        p_practitioner_id: session.therapist_id,
        p_service_minutes: session.duration,
        p_from: new Date().toISOString(),
        p_count: 3,
        p_buffer_minutes: 10
      });
      if (error) throw error;
      setSuggested((data || []).map((s: any) => ({ start: s.slot_start, end: s.slot_end })));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to suggest times', variant: 'destructive' });
    } finally {
      setSuggesting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return <Activity className="h-5 w-5 text-blue-600" />;
      case 'massage_therapist':
        return <Heart className="h-5 w-5 text-pink-600" />;
      case 'osteopath':
        return <Bone className="h-5 w-5 text-orange-600" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Therapist';
    }
  };

  const handleAttendanceChange = async (attended: boolean) => {
    if (!session || !user || updatingAttendance) return;

    setUpdatingAttendance(true);
    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ client_attended: attended })
        .eq('id', session.id);

      if (error) throw error;

      // Update local state
      setSession(prev => prev ? { ...prev, client_attended: attended } : null);

      toast({
        title: "Attendance Updated",
        description: `Client marked as ${attended ? 'attended' : 'did not attend'}`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive"
      });
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending_payment':
      case 'pending_approval':
        return 'bg-amber-100 text-amber-800';
      case 'in-progress':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    // Strip seconds if present (HH:MM:SS -> HH:MM)
    const timeWithoutSeconds = timeString.includes(':') && timeString.split(':').length === 3
      ? timeString.substring(0, 5)
      : timeString;
    const [hours, minutes] = timeWithoutSeconds.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Session Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The session you're looking for doesn't exist or you don't have access to it.
          </p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayStatus = getDisplaySessionStatus(session);
  const displayStatusLabel = getDisplaySessionStatusLabel(session).toUpperCase();

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Session Details</h1>
            <p className="text-muted-foreground">
              {formatDate(session.session_date)} at {formatTime(session.session_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.is_peer_booking && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
              Treatment Exchange
            </Badge>
          )}
          <Badge className={getStatusColor(displayStatus)}>
            {displayStatusLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Date</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(session.session_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Time</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(session.session_time)} ({session.duration} minutes)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Session Type</div>
                    <div className="text-sm text-muted-foreground">
                      {session.session_type}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-Assessment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pre-Assessment Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PreAssessmentStatus
                sessionId={session.id}
                preAssessmentCompleted={session.pre_assessment_completed}
                preAssessmentRequired={session.pre_assessment_required}
                showViewButton={true}
              />
            </CardContent>
          </Card>

          {/* Preparation Instructions */}
          {session.preparation_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Preparation Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {session.preparation_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* What to Bring */}
          {session.what_to_bring && session.what_to_bring.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  What to Bring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.what_to_bring.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Location - booking record first (appointment_type + visit_address vs clinic) */}
          {session.location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {session.appointment_type === 'mobile' ? 'Visit address' : 'Location'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{session.location}</p>
                {session.directionsUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={session.directionsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4 mr-2" />
                      Get Directions
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Treatment Exchange Status - Only show for peer bookings */}
          {session.is_peer_booking && mutualExchangeSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Treatment Exchange Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credit Deduction</span>
                    <Badge variant={mutualExchangeSession.credits_deducted ? "default" : "secondary"}>
                      {mutualExchangeSession.credits_deducted ? "Deducted" : "Pending"}
                    </Badge>
                  </div>
                  {!mutualExchangeSession.credits_deducted && (
                    <p className="text-xs text-muted-foreground">
                      Credits will be deducted when both practitioners have booked their sessions.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="text-sm font-medium">Booking Status</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {mutualExchangeSession.practitioner_a_id === user?.id 
                          ? "You" 
                          : mutualExchangeSession.practitioner_a_id === session.therapist_id
                          ? session.therapist.first_name + " " + session.therapist.last_name
                          : session.client_name || "Practitioner A"}
                      </span>
                      <Badge variant={mutualExchangeSession.practitioner_a_booked ? "default" : "secondary"}>
                        {mutualExchangeSession.practitioner_a_booked ? "Booked" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {mutualExchangeSession.practitioner_b_id === user?.id 
                          ? "You" 
                          : mutualExchangeSession.practitioner_b_id === session.therapist_id
                          ? session.therapist.first_name + " " + session.therapist.last_name
                          : session.client_name || "Practitioner B"}
                      </span>
                      <Badge variant={mutualExchangeSession.practitioner_b_booked ? "default" : "secondary"}>
                        {mutualExchangeSession.practitioner_b_booked ? "Booked" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  {!mutualExchangeSession.practitioner_a_booked || !mutualExchangeSession.practitioner_b_booked ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      {!mutualExchangeSession.practitioner_a_booked && !mutualExchangeSession.practitioner_b_booked
                        ? "Waiting for both practitioners to book their sessions."
                        : `Waiting for ${!mutualExchangeSession.practitioner_a_booked 
                            ? (mutualExchangeSession.practitioner_a_id === session.therapist_id 
                                ? session.therapist.first_name + " " + session.therapist.last_name 
                                : session.client_name || "Practitioner A")
                            : (mutualExchangeSession.practitioner_b_id === session.therapist_id 
                                ? session.therapist.first_name + " " + session.therapist.last_name 
                                : session.client_name || "Practitioner B")} to book their session.`}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-2">
                      Both practitioners have booked. Credits will be deducted automatically.
                    </p>
                  )}
                </div>

                {session.credit_cost && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Credits Exchanged</span>
                      <span className="text-sm font-semibold">{mutualExchangeSession.credits_exchanged || session.credit_cost} credits</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conditional: Show "Your Therapist" for clients, "Your Client" for practitioners */}
          {userProfile?.user_role && ['sports_therapist', 'massage_therapist', 'osteopath', 'practitioner'].includes(userProfile.user_role) ? (
            // Practitioner View: Show Client Information
            session.client ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Your Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        {session.client.profile_photo_url ? (
                          <img 
                            src={session.client.profile_photo_url} 
                            alt={`${session.client.first_name} ${session.client.last_name}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {session.client_name || `${session.client.first_name} ${session.client.last_name}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Client
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {session.client_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{session.client_email}</span>
                        </div>
                      )}
                      {(session.client_phone || session.client.phone) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{session.client_phone || session.client.phone}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={handleMessagePractitioner}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Tracking - Only for practitioners */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Attendance Status
                    </CardTitle>
                    <CardDescription>
                      Mark whether the client attended this session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="client-attended"
                          checked={session.client_attended !== false}
                          disabled={updatingAttendance}
                          onCheckedChange={(checked) => {
                            handleAttendanceChange(checked === true);
                          }}
                        />
                        <label
                          htmlFor="client-attended"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Client Attended
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="client-not-attended"
                          checked={session.client_attended === false}
                          disabled={updatingAttendance}
                          onCheckedChange={(checked) => {
                            handleAttendanceChange(checked !== true);
                          }}
                        />
                        <label
                          htmlFor="client-not-attended"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Client Did Not Attend
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      System defaults to "Client Attended". Uncheck if client did not attend.
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null
          ) : (
            // Client View: Show Therapist Information
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getRoleIcon(session.therapist.user_role)}
                Your Therapist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  {session.therapist.profile_photo_url ? (
                    <img 
                      src={session.therapist.profile_photo_url} 
                      alt={`${session.therapist.first_name} ${session.therapist.last_name}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {session.therapist.first_name} {session.therapist.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getRoleDisplayName(session.therapist.user_role)}
                  </div>
                </div>
              </div>

              {session.therapist.rating && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {session.therapist.rating}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({session.therapist.review_count} reviews)
                  </span>
                </div>
              )}

              {session.therapist.specialties && session.therapist.specialties.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Specialties</div>
                  <div className="flex flex-wrap gap-1">
                    {session.therapist.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                {session.therapist.phone && (
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Therapist
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleMessageTherapist}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Session Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userProfile?.user_role && ['sports_therapist', 'massage_therapist', 'osteopath', 'practitioner'].includes(userProfile.user_role) ? (
                // Practitioner Actions: Only Treatment Notes and Cancel Session
                <>
                  {session.client_id && !session.is_peer_booking && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to={`/practice/clients?session=${session.id}&client=${session.client_email || ''}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Treatment Notes
                      </Link>
                    </Button>
                  )}
                  {(() => {
                    // Only show cancel button for future scheduled/confirmed sessions
                    // For peer bookings, add additional date validation
                    if (displayStatus !== 'scheduled' && displayStatus !== 'confirmed') {
                      return null;
                    }

                    // For peer bookings, validate date before showing button
                    if (session.is_peer_booking) {
                      try {
                        const sessionDate = session.session_date;
                        const sessionTime = session.session_time || session.start_time;
                        const durationMinutes = session.duration || session.duration_minutes || 60;
                        
                        if (sessionDate && sessionTime) {
                          const sessionDateTime = parseISO(`${sessionDate}T${sessionTime}`);
                          const sessionEndTime = addMinutes(sessionDateTime, durationMinutes);
                          
                          // Don't show cancel button if session is in the past
                          if (isPast(sessionEndTime)) {
                            return null;
                          }
                        }
                      } catch (e) {
                        // If date parsing fails, still show button (let backend validate)
                        console.warn('Error parsing session date for cancel button:', e);
                      }
                    }

                    return (
                      <Button 
                        onClick={handlePractitionerCancel} 
                        disabled={actionLoading}
                        variant="destructive" 
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Session
                      </Button>
                    );
                  })()}
                </>
              ) : (
                // Client Actions: Client portal links + session management
                <>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={`/client/sessions?tab=notes&sessionId=${session.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Notes
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={`/client/plans?sessionId=${session.id}`}>
                      <Target className="h-4 w-4 mr-2" />
                      View Treatment Plans
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleMessageTherapist}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Therapist
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/client/sessions">
                      <Calendar className="h-4 w-4 mr-2" />
                      View All Sessions
                    </Link>
                  </Button>
                  
                  {displayStatus === 'scheduled' && (
                <>
                  <Button 
                    onClick={handleCancel} 
                    disabled={actionLoading}
                    variant="destructive" 
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Session
                  </Button>
                  {isPro && (
                    <div className="space-y-2">
                      <Button onClick={handleSuggestNewTime} disabled={suggesting} className="w-full" variant="secondary">
                        {suggesting ? 'Suggesting…' : 'Suggest new time (Pro)'}
                      </Button>
                      {suggested.map((s, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          {new Date(s.start).toLocaleString()} – {new Date(s.end).toLocaleTimeString()}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {displayStatus === 'confirmed' && (
                <Button className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Dialog */}
      {session && session.therapist && (
        <RescheduleBooking
          booking={{
            id: session.id,
            session_date: session.session_date,
            start_time: session.session_time,
            duration_minutes: session.duration,
            session_type: session.session_type,
            therapist_id: session.therapist_id,
            therapist_name: session.therapist.first_name && session.therapist.last_name 
              ? `${session.therapist.first_name} ${session.therapist.last_name}` 
              : undefined
          }}
          practitioner={{
            ...session.therapist,
            user_id: session.therapist.id,
            average_rating: session.therapist.rating || 0,
            total_sessions: session.therapist.review_count || 0
          }}
          open={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Practitioner Cancellation Dialog */}
      <AlertDialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? The client will be notified and a full refund will be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {refundCalculation && refundCalculation.refund_amount > 0 && (
            <div className="bg-muted p-4 rounded-lg my-4">
              <p className="font-semibold mb-2">Refund Details:</p>
              <p className="text-sm">
                <strong>Refund Amount:</strong> £{refundCalculation.refund_amount.toFixed(2)}
              </p>
              <p className="text-sm">
                <strong>Refund Type:</strong> {refundCalculation.refund_type_method === 'stripe' ? 'Stripe Refund' : refundCalculation.refund_type_method === 'credit' ? 'Credit Refund' : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Refunds will be processed within 5-10 business days.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Cancellation Reason (Optional)</label>
            <Textarea
              placeholder="Enter reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancellationDialog(false);
              setCancellationReason('');
              setRefundCalculation(null);
            }}>
              Keep Session
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPractitionerCancellation}
              disabled={processingCancellation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingCancellation ? 'Cancelling...' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};



