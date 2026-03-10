import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  User as UserIcon, 
  MapPin, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Star, 
  Timer 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentIntegration } from '@/lib/payment-integration';
import { NotificationSystem } from '@/lib/notification-system';
import { SessionNotifications } from '@/lib/session-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { validateData, sessionSchema } from '@/lib/validators';
import { RebookingData, NextAvailableSlot } from '@/lib/rebooking-service';
import { CancellationPolicyService, CancellationPolicy } from '@/lib/cancellation-policy';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IntakeForm } from '@/components/booking/IntakeForm';
import { IntakeFormData, IntakeFormService } from '@/lib/intake-form-service';
import { getOverlappingBlocks } from '@/lib/block-time-utils';
import { ServiceRecommendationCard } from '@/components/booking/ServiceRecommendationCard';
import { PricingTransparencyCard } from '@/components/booking/PricingTransparencyCard';
import { FlowExplanationCard } from '@/components/booking/FlowExplanationCard';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';
import { BookingExpirationTimer } from '@/components/booking/BookingExpirationTimer';
import { PreAssessmentForm } from '@/components/forms/PreAssessmentForm';
import { PreAssessmentService } from '@/lib/pre-assessment-service';
import { handleApiError } from '@/lib/error-handling';
import { logger } from '@/lib/logger';
import { canRequestMobile, isProductClinicBookable } from '@/lib/booking-flow-type';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  hourly_rate: number;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  average_rating: number;
  total_sessions: number;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  clinic_address?: string | null;
  mobile_service_radius_km?: number | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  products?: Array<{
    is_active: boolean;
    service_type?: 'clinic' | 'mobile' | 'both' | null;
  }>;
}

interface PractitionerProduct {
  id: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
  name: string;
  description?: string;
  price_amount: number; // in pence
  duration_minutes?: number;
  is_active: boolean;
  practitioner_id: string;
  currency: string;
  popularity_score?: number;
  pricing_rationale?: string;
  created_at?: string;
  service_type?: 'clinic' | 'mobile' | 'both' | null;
}

interface BookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: Practitioner;
  /** When set, closing due to mobile-only practitioner will call this to open the mobile flow instead. */
  onRedirectToMobile?: () => void;
  initialRebookingData?: {
    rebookingData: RebookingData;
    nextSlot: NextAvailableSlot | null;
  };
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  open,
  onOpenChange,
  practitioner,
  onRedirectToMobile,
  initialRebookingData
}) => {
  const { user, userProfile } = useAuth();

  // Enforce correct booking path: mobile-only must use MobileBookingRequestFlow, not clinic flow.
  useEffect(() => {
    if (!open || !practitioner || practitioner.therapist_type !== 'mobile') return;

    let cancelled = false;
    const ensureMobileFlowIsActuallyBookable = async () => {
      // First pass: use currently provided practitioner payload.
      if (canRequestMobile(practitioner)) {
        if (cancelled) return;
        onOpenChange(false);
        toast.error('This practitioner travels to you.', {
          description: "Please use 'Request Visit to My Location' or 'Request Mobile Session' to book.",
        });
        onRedirectToMobile?.();
        return;
      }

      // Fallback: refresh minimal fields from DB in case the card payload is stale/incomplete.
      try {
        const [{ data: productsData }, { data: userData }] = await Promise.all([
          supabase
            .from('practitioner_products')
            .select('is_active, service_type')
            .eq('practitioner_id', practitioner.user_id)
            .eq('is_active', true),
          supabase
            .from('users')
            .select('therapist_type, mobile_service_radius_km, base_latitude, base_longitude')
            .eq('id', practitioner.user_id)
            .maybeSingle(),
        ]);

        const refreshed = {
          therapist_type: userData?.therapist_type ?? practitioner.therapist_type ?? null,
          mobile_service_radius_km: userData?.mobile_service_radius_km ?? practitioner.mobile_service_radius_km ?? null,
          base_latitude: userData?.base_latitude ?? practitioner.base_latitude ?? null,
          base_longitude: userData?.base_longitude ?? practitioner.base_longitude ?? null,
          products: (productsData as Array<{ is_active: boolean; service_type?: 'clinic' | 'mobile' | 'both' | null }> | null) ?? practitioner.products ?? [],
        };

        if (canRequestMobile(refreshed)) {
          if (cancelled) return;
          onOpenChange(false);
          toast.error('This practitioner travels to you.', {
            description: "Please use 'Request Visit to My Location' or 'Request Mobile Session' to book.",
          });
          onRedirectToMobile?.();
          return;
        }
      } catch (e) {
        console.error('Failed to validate mobile booking configuration:', e);
      }

      if (cancelled) return;
      onOpenChange(false);
      toast.error('Mobile booking is not available for this practitioner yet.', {
        description: 'No active mobile service package is currently configured.',
      });
    };

    ensureMobileFlowIsActuallyBookable();
    return () => {
      cancelled = true;
    };
  }, [open, practitioner, onOpenChange, onRedirectToMobile]);
  const isClient = userProfile?.user_role === 'client';
  const totalSteps = isClient ? 3 : 5; // Added step for pre-assessment form
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bookingExpiresAt, setBookingExpiresAt] = useState<string | null>(null);
  const [preAssessmentRequired, setPreAssessmentRequired] = useState(false);
  const [preAssessmentCanSkip, setPreAssessmentCanSkip] = useState(false);
  const [preAssessmentCompleted, setPreAssessmentCompleted] = useState(false);
  const [isRebooking, setIsRebooking] = useState(false);
  const [suggestedSlot, setSuggestedSlot] = useState<NextAvailableSlot | null>(null);
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 60,
    session_type: '',
    notes: '',
    payment_method: 'card'
  });

  const [services, setServices] = useState<PractitionerProduct[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [intakeFormData, setIntakeFormData] = useState<IntakeFormData | null>(null);
  const [slotUnavailableReturned, setSlotUnavailableReturned] = useState(false);

  // Auto-set duration when a service is selected
  useEffect(() => {
    if (selectedServiceId) {
      const svc = services.find(s => s.id === selectedServiceId);
      if (svc && svc.duration_minutes) {
        setBookingData(prev => ({ 
          ...prev, 
          duration_minutes: svc.duration_minutes || 60,
          session_type: svc.name || prev.session_type
        }));
      }
    }
  }, [selectedServiceId, services]);

  useEffect(() => {
    const loadServices = async () => {
      const { data: productsData } = await supabase
        .from('practitioner_products')
        .select('*')
        .eq('practitioner_id', practitioner.user_id)
        .eq('is_active', true)
        .order('popularity_score', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });

      const clinicCompatible = (productsData || []).filter((p: PractitionerProduct) =>
        isProductClinicBookable(practitioner.therapist_type ?? null, p)
      );

      const sortedServices = clinicCompatible.sort((a: PractitionerProduct, b: PractitionerProduct) => {
        const aScore = a.popularity_score || 0;
        const bScore = b.popularity_score || 0;
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      setServices(sortedServices);
      
      const policy = await CancellationPolicyService.getPolicy(practitioner.user_id);
      setCancellationPolicy(policy);
      
      if (initialRebookingData?.rebookingData) {
        setIsRebooking(true);
        const rebooking = initialRebookingData.rebookingData;
        setSuggestedSlot(initialRebookingData.nextSlot);
        
        setBookingData(prev => ({
          ...prev,
          duration_minutes: rebooking.durationMinutes,
          session_type: rebooking.sessionType,
          notes: rebooking.notes || prev.notes,
          session_date: initialRebookingData.nextSlot?.date || '',
          start_time: initialRebookingData.nextSlot?.time || rebooking.preferredTime || ''
        }));

        if (rebooking.serviceId) {
          const serviceExists = sortedServices.some((p: PractitionerProduct) => p.id === rebooking.serviceId);
          setSelectedServiceId(serviceExists ? rebooking.serviceId : (sortedServices[0]?.id || ''));
        } else {
          setSelectedServiceId(sortedServices[0]?.id || '');
        }
      } else {
        if (sortedServices.length > 0) {
          setSelectedServiceId(sortedServices[0].id);
        }
      }
    };
    if (open) loadServices();
  }, [open, practitioner.user_id, practitioner.therapist_type, initialRebookingData]);

  const validateBookingData = () => {
    const errors: string[] = [];

    if (!bookingData.session_date) {
      errors.push('Please select a session date');
    } else {
      const selectedDate = new Date(bookingData.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.push('Cannot book sessions in the past');
      }
    }

    if (!bookingData.start_time) {
      errors.push('Please select a start time');
    }

    if (!selectedServiceId) {
      errors.push('Please select a service package');
    }

    return errors;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedServiceId) {
        toast.error('Please select a service package');
        return;
      }
      const validationErrors = validateBookingData();
      if (validationErrors.length > 0) {
        toast.error(validationErrors[0]);
        return;
      }
      setSlotUnavailableReturned(false);
      if (isClient) {
        setStep(2);
        return;
      }
    } else if (step === 2 && !isClient) {
      if (!policyAccepted) {
        toast.error('Please accept the cancellation policy to continue');
        return;
      }
      setStep(3);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = async () => {
    let newStep: number;
    
    if (isClient && step === 2) {
      newStep = 1;
    } else if (isClient && step === 3) {
      // From pre-assessment form back to review
      newStep = 2;
    } else if (step === 4) {
      newStep = isClient ? 1 : 3;
    } else if (step === 3 && !isClient) {
      newStep = 2;
    } else {
      newStep = step - 1;
    }
    
    // If going back to step 1 (time selection), validate the selected time is still available
    if (newStep === 1 && bookingData.session_date && bookingData.start_time) {
      try {
        const blocks = await getOverlappingBlocks(
          practitioner.user_id,
          bookingData.session_date,
          bookingData.start_time,
          bookingData.duration_minutes || 60
        );

        if (blocks.length > 0) {
          const blockType = blocks[0].event_type === 'block' ? 'blocked' : 'unavailable';
          const blockTitle = blocks[0].title ? `: ${blocks[0].title}` : '';
          toast.error(`The selected time slot is now ${blockType}${blockTitle}. Please select another time.`, {
            duration: 5000
          });
          // Clear the selected time
          setBookingData(prev => ({ ...prev, start_time: '' }));
        }
      } catch (error) {
        handleApiError(error, 'time slot validation');
        // Continue anyway - don't block navigation on validation error
      }
    }
    
    setStep(newStep);
  };

  const handlePreAssessmentComplete = async (formId: string) => {
    setPreAssessmentCompleted(true);
    // After form completion, proceed to payment
    if (sessionId && user && userProfile) {
      setLoading(true);
      try {
        // Ensure we have a valid client ID
        if (!user.id) {
          toast.error('User ID not found. Please sign in again.');
          return;
        }

        const svc = services.find(s => s.id === selectedServiceId);
        const priceMinor = svc?.price_amount || 0;
        const resolvedSessionType = bookingData.session_type || 'Session';
        
        const payment = await PaymentIntegration.createSessionPayment({
          sessionId: sessionId,
          practitionerId: practitioner.user_id,
          clientId: user.id,
          clientEmail: user.email,
          clientName: `${userProfile.first_name} ${userProfile.last_name}`,
          practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
          sessionDate: bookingData.session_date,
          sessionTime: bookingData.start_time,
          sessionType: resolvedSessionType,
          amount: priceMinor,
          currency: 'gbp',
          description: `${resolvedSessionType} on ${bookingData.session_date} at ${bookingData.start_time}`
        });

        if (payment.success && payment.checkoutUrl) {
          await supabase
            .from('client_sessions')
            .update({
              stripe_session_id: payment.checkoutSessionId || null,
              stripe_payment_intent_id: payment.paymentIntentId || null
            })
            .eq('id', sessionId);

          window.location.href = payment.checkoutUrl;
        } else {
          throw new Error(payment.error || 'Payment failed');
        }
      } catch (error) {
        handleApiError(error, 'payment creation', () => handleBooking());
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkipPreAssessment = async () => {
    // Skip form and proceed to payment
    if (sessionId && user && userProfile) {
      setLoading(true);
      try {
        // Ensure we have a valid client ID
        if (!user.id) {
          toast.error('User ID not found. Please sign in again.');
          return;
        }

        // Mark form as skipped in database
        await PreAssessmentService.skipForm(sessionId);
        
        const svc = services.find(s => s.id === selectedServiceId);
        const priceMinor = svc?.price_amount || 0;
        const resolvedSessionType = bookingData.session_type || 'Session';
        
        const payment = await PaymentIntegration.createSessionPayment({
          sessionId: sessionId,
          practitionerId: practitioner.user_id,
          clientId: user.id,
          clientEmail: user.email,
          clientName: `${userProfile.first_name} ${userProfile.last_name}`,
          practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
          sessionDate: bookingData.session_date,
          sessionTime: bookingData.start_time,
          sessionType: resolvedSessionType,
          amount: priceMinor,
          currency: 'gbp',
          description: `${resolvedSessionType} on ${bookingData.session_date} at ${bookingData.start_time}`
        });

        if (payment.success && payment.checkoutUrl) {
          await supabase
            .from('client_sessions')
            .update({
              stripe_session_id: payment.checkoutSessionId || null,
              stripe_payment_intent_id: payment.paymentIntentId || null
            })
            .eq('id', sessionId);

          window.location.href = payment.checkoutUrl;
        } else {
          throw new Error(payment.error || 'Payment failed');
        }
      } catch (error) {
        handleApiError(error, 'payment creation', () => handleSkipPreAssessment());
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBooking = async () => {
    if (!user || !userProfile) {
      toast.error('Please sign in to book a session');
      return;
    }

    const bookingValidation = validateData(sessionSchema, {
      client_email: user.email || '',
      client_name: `${userProfile.first_name} ${userProfile.last_name}`,
      session_date: bookingData.session_date,
      start_time: bookingData.start_time,
      duration_minutes: bookingData.duration_minutes,
      price: 0,
      session_type: bookingData.session_type || 'Session'
    });

    if (!bookingValidation.success) {
      bookingValidation.errors?.forEach(err => toast.error(err));
      return;
    }

    try {
      setLoading(true);

      if (!selectedServiceId) {
        toast.error('Please select a service package');
        setStep(1);
        return;
      }
      const svc = services.find(s => s.id === selectedServiceId);
      if (!svc) {
        toast.error('Selected service not found');
        setStep(1);
        return;
      }
      const priceMinor = svc.price_amount;
      const price = Math.round(priceMinor) / 100;

      if (!policyAccepted) {
        toast.error('Please accept the cancellation policy to continue');
        return;
      }

      if (!isClient && !intakeFormData) {
        toast.error('Please complete the intake form to continue');
        setStep(3);
        return;
      }

      const idempotencyKey = `${user.id}-${practitioner.user_id}-${bookingData.session_date}-${bookingData.start_time}`;

      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('create_booking_with_validation', {
          p_therapist_id: practitioner.user_id,
          p_client_id: user.id,
          p_client_name: `${userProfile.first_name} ${userProfile.last_name}`,
          p_client_email: user.email,
          p_session_date: bookingData.session_date,
          p_start_time: bookingData.start_time,
          p_duration_minutes: bookingData.duration_minutes,
          p_session_type: bookingData.session_type,
          p_price: price,
          p_client_phone: userProfile.phone || null,
          p_notes: bookingData.notes || null,
          p_payment_status: 'pending',
          p_status: 'pending_payment',
          p_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          p_idempotency_key: idempotencyKey,
          p_is_guest_booking: false,
          p_appointment_type: 'clinic',
          p_visit_address: null
        });

      if (rpcError) throw rpcError;

      interface BookingResult {
        success: boolean;
        session_id?: string;
        error_code?: string;
        error_message?: string;
      }
      const result = bookingResult as BookingResult;
      if (!result || !result.success) {
        const errorCode = result?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = result?.error_message || 'Failed to create booking';
        
        if (errorCode === 'CONFLICT_BOOKING' || errorCode === 'CONFLICT_BLOCKED') {
          toast.error(errorMessage);
          setBookingData(prev => ({ ...prev, session_date: '', start_time: '' }));
          setSlotUnavailableReturned(true);
          setStep(1);
          setLoading(false);
          return;
        }
        
        if (errorCode === 'RATING_TIER_MISMATCH') {
          toast.error(errorMessage, {
            duration: 8000, // Show longer for important messages
            description: 'This restriction only applies to peer bookings between practitioners.'
          });
          setLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const sessionId = result.session_id;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      setSessionId(sessionId);
      setBookingExpiresAt(expiresAt);

      // Check if this is a same-day booking requiring approval
      const { data: sessionData } = await supabase
        .from('client_sessions')
        .select('status, requires_approval, approval_expires_at')
        .eq('id', sessionId)
        .single();

      const isSameDayBooking = sessionData?.requires_approval && sessionData?.status === 'pending_approval';

      if (intakeFormData) {
        await IntakeFormService.submitIntakeForm(
          sessionId,
          intakeFormData,
          IntakeFormService.getFormTemplate(bookingData.session_type || 'general')
        );
      }

      // Check if pre-assessment form is required (for clients only)
      if (isClient && user) {
        const formRequirement = await PreAssessmentService.checkFormRequirement(sessionId, user.id);
        setPreAssessmentRequired(formRequirement.required);
        setPreAssessmentCanSkip(formRequirement.canSkip);
        
        // Update session with requirement status
        await supabase
          .from('client_sessions')
          .update({
            pre_assessment_required: formRequirement.required
          })
          .eq('id', sessionId);
        
        if (formRequirement.required && !formRequirement.canSkip) {
          // Mandatory form - move to pre-assessment step
          setStep(3);
          setLoading(false);
          return;
        } else if (formRequirement.canSkip) {
          // Optional form - show prompt but allow skip
          // Move to pre-assessment step but allow skip
          setStep(3);
          setLoading(false);
          return;
        }
      }

      const resolvedSessionType = bookingData.session_type || 'Session';
      
      // Ensure we have a valid client ID
      if (!user.id) {
        toast.error('User ID not found. Please sign in again.');
        setLoading(false);
        return;
      }
      
      try {
        const payment = await PaymentIntegration.createSessionPayment({
          sessionId,
          practitionerId: practitioner.user_id,
          clientId: user.id,
          clientEmail: user.email,
          clientName: `${userProfile.first_name} ${userProfile.last_name}`,
          practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
          sessionDate: bookingData.session_date,
          sessionTime: bookingData.start_time,
          sessionType: resolvedSessionType,
          amount: priceMinor,
          currency: 'gbp',
          description: `${resolvedSessionType} on ${bookingData.session_date} at ${bookingData.start_time}`
        });

        if (payment.success) {
          await supabase
            .from('client_sessions')
            .update({
              stripe_session_id: payment.checkoutSessionId || null,
              stripe_payment_intent_id: payment.paymentIntentId || null,
              payment_status: isSameDayBooking ? 'held' : 'pending'
            })
            .eq('id', sessionId);

          // For same-day bookings, show approval pending message instead of redirecting
          if (isSameDayBooking && payment.checkoutUrl) {
            // Payment authorization has been held, but we still redirect to checkout for authorization
            // The payment will be captured only after practitioner approval
            window.location.href = payment.checkoutUrl;
            return;
          } else if (payment.checkoutUrl) {
            // Normal advance booking - redirect to checkout
            window.location.href = payment.checkoutUrl;
            return;
          } else if (!payment.success) {
            throw new Error(payment.error || 'Failed to create payment');
          }
        } else if (!payment.success) {
          throw new Error(payment.error || 'Failed to create payment');
        }
      } catch (piError) {
        logger.error('Payment error:', piError);
        toast.error('Payment setup failed. Please contact support or try again.');
      }
      
      setStep(1);
      setSessionId(null);
      setBookingExpiresAt(null);
      setIsRebooking(false);
      setSuggestedSlot(null);
      setPolicyAccepted(false);
      setIntakeFormData(null);
      setBookingData({
        session_date: '',
        start_time: '',
        duration_minutes: 60,
        session_type: '',
        notes: '',
        payment_method: 'card'
      });
    } catch (error) {
      handleApiError(error, 'booking session');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const timeWithoutSeconds = timeString?.includes(':') && timeString.split(':').length === 3
      ? timeString.substring(0, 5)
      : timeString;
    return new Date(`2000-01-01T${timeWithoutSeconds}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculatePrice = () => {
    const svc = selectedServiceId ? services.find(s => s.id === selectedServiceId) : undefined;
    if (svc) return Math.round(svc.price_amount) / 100;
    return 0;
  };

  const getStepTitle = () => {
    if (isClient) {
      switch (step) {
        case 1: return 'Select Service';
        case 2: return 'Confirm & pay';
        default: return 'Book Session';
      }
    }
    return isRebooking ? 'Book Again' : 'Book Session';
  };

  const getStepDescription = () => {
    if (isClient) {
      switch (step) {
        case 1: return 'Choose your service and preferred time';
        case 2: return "We'll use your account details. Review and complete your booking.";
        default: return '';
      }
    }
    return isRebooking && suggestedSlot
      ? `Suggested slot: ${new Date(suggestedSlot.date).toLocaleDateString()} at ${suggestedSlot.time}`
      : 'Complete your booking in a few simple steps';
  };

  const handleBookingExpired = () => {
    setBookingData(prev => ({ ...prev, session_date: '', start_time: '' }));
    setSlotUnavailableReturned(true);
    setStep(1);
    setSessionId(null);
    setBookingExpiresAt(null);
    setPreAssessmentRequired(false);
    setPreAssessmentCanSkip(false);
    setPreAssessmentCompleted(false);
    toast.error('Your booking reservation has expired.', {
      description: 'Please select a new time slot and try again.',
      duration: 6000,
    });
  };

  const showExpirationTimer = bookingExpiresAt && ((isClient && step === 3) || step === 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:mx-4 pb-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isClient ? getStepTitle() : `${isRebooking ? 'Book Again' : 'Book Session'} with ${practitioner.first_name} ${practitioner.last_name}`}
          </DialogTitle>
          <DialogDescription>
            {isClient ? getStepDescription() : (
              isRebooking && suggestedSlot ? (
                <span className="text-green-600 font-medium">
                  Suggested slot: {new Date(suggestedSlot.date).toLocaleDateString()} at {suggestedSlot.time}
                </span>
              ) : (
                'Complete your booking in a few simple steps'
              )
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - same 2-step style as guest for clients */}
        {loading ? (
          <div className="flex items-center justify-center space-x-2 py-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium bg-primary text-primary-foreground">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            </div>
            <span className="text-sm sm:text-base font-medium text-primary">Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 py-4">
            {isClient ? (
              ['Service & Time', 'Confirm'].map((label, index) => {
                const stepNumber = index + 1;
                return (
                  <div key={stepNumber} className="flex items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-[background-color,transform] duration-200 ease-out ${step >= stepNumber ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'}`}>
                      {stepNumber}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{label}</span>
                    {stepNumber < 2 && (
                      <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-[background-color] duration-200 ease-out ${step > stepNumber ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>
                );
              })
            ) : (
              (() => {
                const stepLabels = ['Service & Time', 'Review', 'Intake', 'Payment'];
                const internalSteps = [1, 2, 3, 4];
                return stepLabels.map((label, index) => {
                  const internalStep = internalSteps[index];
                  const isActive = step >= internalStep;
                  const isCompleted = step > internalStep;
                  return (
                    <div key={internalStep} className="flex items-center">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-[background-color,transform] duration-200 ease-out ${isActive ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'}`}>
                        {index + 1}
                      </div>
                      <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{label}</span>
                      {index < stepLabels.length - 1 && (
                        <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-[background-color] duration-200 ease-out ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* Flow Explanation - hidden for clients (match guest flow) */}
        {!isClient && (
          <FlowExplanationCard
            currentStep={step}
            totalSteps={totalSteps}
            isClient={isClient}
          />
        )}

        {/* Booking expiration timer when reservation is held (client step 3 or practitioner step 4) */}
        {showExpirationTimer && bookingExpiresAt && (
          <BookingExpirationTimer
            expiresAt={bookingExpiresAt}
            onExpired={handleBookingExpired}
            className="mb-4"
          />
        )}

        {/* Step 1: Service & Date/Time Selection (Combined) - same style as guest for clients */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Service Selection - guest-style cards for clients, ServiceRecommendationCard for practitioners */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Service</CardTitle>
                </CardHeader>
                <CardContent>
                  {services.length > 0 ? (
                    <div className={cn('grid gap-3', isClient ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
                      {services.map((svc, index) => {
                        if (isClient) {
                          return (
                            <motion.div
                              key={svc.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card
                                className={cn(
                                  'cursor-pointer transition-[border-color,background-color] duration-200 ease-out h-full',
                                  selectedServiceId === svc.id
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-border hover:border-primary/50'
                                )}
                                onClick={() => setSelectedServiceId(svc.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm">{svc.name}</h4>
                                        {selectedServiceId === svc.id && (
                                          <CheckCircle className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Timer className="h-3 w-3" />
                                          {(svc.duration_minutes ?? 60)}m
                                        </span>
                                        <span className="font-semibold text-primary">
                                          £{((svc.price_amount ?? 0) / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        }
                        const isRecommended = index === 0 && (svc.popularity_score || 0) > 0;
                        return (
                          <motion.div
                            key={svc.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <ServiceRecommendationCard
                              service={svc}
                              isRecommended={isRecommended}
                              allServices={services}
                              onClick={() => setSelectedServiceId(svc.id)}
                              className={selectedServiceId === svc.id ? 'ring-2 ring-primary' : ''}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        No clinic booking services are currently available for this practitioner.
                      </p>
                      {canRequestMobile(practitioner) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onOpenChange(false);
                              onRedirectToMobile?.();
                            }}
                          >
                            Request Visit to My Location
                          </Button>
                          {!onRedirectToMobile && (
                            <p className="text-xs text-muted-foreground">
                              Mobile request is available from the practitioner profile.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Please contact the practitioner directly or check back later.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Inline message when returned to step 1 due to slot no longer available (NNG error recovery) */}
            {slotUnavailableReturned && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Time no longer available</AlertTitle>
                <AlertDescription>
                  The selected time is no longer available. Please choose a new date and time below.
                </AlertDescription>
              </Alert>
            )}

            {/* Date/Time Selection with Enhanced Calendar */}
            <AnimatePresence>
              {selectedServiceId && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <CalendarTimeSelector
                    key={`calendar-client-${practitioner.user_id}-${slotUnavailableReturned ? 'expired' : bookingData.session_date || 'none'}`}
                    therapistId={practitioner.user_id}
                    duration={bookingData.duration_minutes}
                    requestedAppointmentType="clinic"
                    therapistType={practitioner.therapist_type ?? null}
                    selectedDate={bookingData.session_date}
                    selectedTime={bookingData.start_time}
                    onDateTimeSelect={(date, time) => {
                      setBookingData(prev => ({ ...prev, session_date: date, start_time: time }));
                      setSlotUnavailableReturned(false);
                    }}
                  />
                  
                  {bookingData.session_date && bookingData.start_time && (
                    <div className="mt-4 bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center gap-2 text-sm justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Selected: <span className="font-semibold">{new Date(bookingData.session_date).toLocaleDateString()} at {bookingData.start_time}</span></span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Step 2: Confirm & pay (client only - same style as guest, account recognised) */}
        {isClient && step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Service</div>
                    <div className="font-medium text-sm">
                      {services.find(s => s.id === selectedServiceId)?.name || 'Service'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Duration</div>
                    <div className="font-medium text-sm">{bookingData.duration_minutes} min</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Date</div>
                    <div className="font-medium text-sm">{bookingData.session_date}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Time</div>
                    <div className="font-medium text-sm">{bookingData.start_time}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <div className="text-muted-foreground text-xs">Price</div>
                      <div className="font-semibold text-base">£{calculatePrice().toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium text-muted-foreground">Booking as</p>
              <p className="text-sm font-semibold">
                {userProfile?.first_name} {userProfile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {userProfile?.phone && (
                <p className="text-xs text-muted-foreground">{userProfile.phone}</p>
              )}
            </div>
            {cancellationPolicy && (
              <div className="pt-3 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="policy-acceptance-client"
                      checked={policyAccepted}
                      onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="policy-acceptance-client" className="text-xs font-medium cursor-pointer leading-tight">
                        I have read and agree to the cancellation policy <span className="text-red-600">*</span>
                      </Label>
                      <div className="mt-2 p-2 bg-white rounded-md border border-green-200">
                        <p className="text-xs font-medium mb-1 text-gray-700">Cancellation Policy:</p>
                        <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                          {cancellationPolicy.full_refund_hours >= 24 ? (
                            <>
                              <li>Cancellations made {Math.floor(cancellationPolicy.full_refund_hours / 24)}+ days in advance: Full refund</li>
                              {cancellationPolicy.partial_refund_hours > 0 && (
                                <li>Cancellations made {Math.floor(cancellationPolicy.partial_refund_hours / 24)}-{Math.floor(cancellationPolicy.full_refund_hours / 24)} days in advance: {cancellationPolicy.partial_refund_percent}% refund</li>
                              )}
                              {cancellationPolicy.no_refund_hours > 0 && (
                                <li>Cancellations made less than {Math.floor(cancellationPolicy.no_refund_hours / 24)} days before session: No refund</li>
                              )}
                            </>
                          ) : (
                            <>
                              <li>Cancellations made {cancellationPolicy.full_refund_hours}+ hours in advance: Full refund</li>
                              {cancellationPolicy.partial_refund_hours > 0 && (
                                <li>Cancellations made {cancellationPolicy.partial_refund_hours}-{cancellationPolicy.full_refund_hours} hours in advance: {cancellationPolicy.partial_refund_percent}% refund</li>
                              )}
                              {cancellationPolicy.no_refund_hours > 0 && (
                                <li>Cancellations made less than {cancellationPolicy.no_refund_hours} hours before session: No refund</li>
                              )}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pre-Assessment Form (Clients only) */}
        {isClient && step === 3 && sessionId && user && userProfile && (
          <PreAssessmentForm
            sessionId={sessionId}
            clientId={user.id}
            clientEmail={user.email || ''}
            clientName={`${userProfile.first_name} ${userProfile.last_name}`}
            isGuest={false}
            isInitialSession={preAssessmentRequired && !preAssessmentCanSkip}
            onComplete={handlePreAssessmentComplete}
            onSkip={preAssessmentCanSkip ? handleSkipPreAssessment : undefined}
            canSkip={preAssessmentCanSkip}
            onBack={handleBack}
          />
        )}

        {/* Step 2: Review & Pricing (practitioner only) */}
        {step === 2 && !isClient && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Your Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Session Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(bookingData.session_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(bookingData.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.session_type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Practitioner</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{practitioner.first_name} {practitioner.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{practitioner.average_rating ? practitioner.average_rating.toFixed(1) : 'No rating'} ({practitioner.total_sessions || 0} sessions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {practitioner.therapist_type === 'hybrid'
                            ? `Session at clinic: ${(practitioner.clinic_address || practitioner.location || 'Clinic address').trim()}`
                            : (practitioner.clinic_address || practitioner.location)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {practitioner.specializations.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {bookingData.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {bookingData.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedServiceId && (() => {
              const selectedService = services.find(s => s.id === selectedServiceId);
              return selectedService ? (
                <PricingTransparencyCard
                  servicePrice={selectedService.price_amount}
                  platformFeePercentage={2}
                  practitionerReceives={Math.round(selectedService.price_amount * 0.98)}
                  pricingRationale={selectedService.pricing_rationale}
                />
              ) : null;
            })()}

            {/* Policy Acceptance Checkbox - Required for clients to proceed */}
            {cancellationPolicy && (
              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="policy-acceptance-step2"
                  checked={policyAccepted}
                  onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="policy-acceptance-step2" className="text-sm font-medium cursor-pointer">
                    I agree to the cancellation policy *
                  </Label>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    {cancellationPolicy.full_refund_hours >= 24 ? (
                      <>
                        <div>{Math.floor(cancellationPolicy.full_refund_hours / 24)}+ days notice: Full refund</div>
                        <div>{cancellationPolicy.partial_refund_hours >= 24 ? Math.floor(cancellationPolicy.partial_refund_hours / 24) : cancellationPolicy.partial_refund_hours}-{cancellationPolicy.full_refund_hours >= 24 ? Math.floor(cancellationPolicy.full_refund_hours / 24) : cancellationPolicy.full_refund_hours} {cancellationPolicy.partial_refund_hours >= 24 ? 'days' : 'hours'} notice: {cancellationPolicy.partial_refund_percent}% refund</div>
                        <div>Less than {cancellationPolicy.no_refund_hours >= 24 ? Math.floor(cancellationPolicy.no_refund_hours / 24) : cancellationPolicy.no_refund_hours} {cancellationPolicy.no_refund_hours >= 24 ? 'days' : 'hours'} notice: No refund</div>
                      </>
                    ) : (
                      <>
                        <div>{cancellationPolicy.full_refund_hours}+ hours notice: Full refund</div>
                        <div>{cancellationPolicy.partial_refund_hours}-{cancellationPolicy.full_refund_hours} hours notice: {cancellationPolicy.partial_refund_percent}% refund</div>
                        <div>Less than {cancellationPolicy.no_refund_hours} hours notice: No refund</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Intake Form (skipped for clients) */}
        {step === 3 && !isClient && (
          <div className="space-y-6">
            <IntakeForm
              serviceType={bookingData.session_type || 'general'}
              onComplete={(data) => {
                setIntakeFormData(data);
                setStep(4); // Move to payment step
              }}
              onBack={() => setStep(2)}
            />
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Payment Processing</h3>
                  <p className="text-muted-foreground mb-4">
                    Payment will be processed after your session is completed.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-lg font-bold">£{calculatePrice()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Policy Acceptance */}
            {cancellationPolicy && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="policy-acceptance"
                      checked={policyAccepted}
                      onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="policy-acceptance" className="text-sm font-medium cursor-pointer">
                        I have read and agree to the cancellation policy
                      </Label>
                      <div className="mt-2 p-3 bg-white rounded-md border border-green-200">
                        <p className="text-xs text-gray-700 mb-2 font-medium">Cancellation Policy:</p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          {cancellationPolicy.full_refund_hours >= 24 ? (
                            <>
                              <li>Cancellations made {Math.floor(cancellationPolicy.full_refund_hours / 24)}+ days in advance: Full refund</li>
                              {cancellationPolicy.partial_refund_hours > 0 && (
                                <li>Cancellations made {Math.floor(cancellationPolicy.partial_refund_hours / 24)}-{Math.floor(cancellationPolicy.full_refund_hours / 24)} days in advance: {cancellationPolicy.partial_refund_percent}% refund</li>
                              )}
                              {cancellationPolicy.no_refund_hours > 0 && (
                                cancellationPolicy.no_refund_hours >= 24 ? (
                                  <li>Cancellations made less than {Math.floor(cancellationPolicy.no_refund_hours / 24)} days before session: No refund</li>
                                ) : (
                                  <li>Cancellations made less than {cancellationPolicy.no_refund_hours} hours before session: No refund</li>
                                )
                              )}
                            </>
                          ) : (
                            <>
                              <li>Cancellations made {cancellationPolicy.full_refund_hours}+ hours in advance: Full refund</li>
                              {cancellationPolicy.partial_refund_hours > 0 && (
                                <li>Cancellations made {cancellationPolicy.partial_refund_hours}-{cancellationPolicy.full_refund_hours} hours in advance: {cancellationPolicy.partial_refund_percent}% refund</li>
                              )}
                              {cancellationPolicy.no_refund_hours > 0 && (
                                <li>Cancellations made less than {cancellationPolicy.no_refund_hours} hours before session: No refund</li>
                              )}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Navigation Buttons - same layout as guest for clients */}
        {/* Hide buttons for client step 3 (pre-assessment form has its own buttons) */}
        {!(isClient && step === 3) && (
          <div key="booking-flow-nav-buttons" className={cn('pt-6 border-t', isClient ? 'flex flex-col sm:flex-row justify-between gap-3 pb-4' : 'flex justify-between')}>
            <Button
              variant="outline"
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
              disabled={loading}
              className={isClient ? 'w-full sm:w-auto' : ''}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={(isClient && step === 2) || step === 4 ? handleBooking : handleNext}
              disabled={
                loading ||
                (step === 1 && (!selectedServiceId || !bookingData.session_date || !bookingData.start_time)) ||
                (step === 2 && !isClient && !policyAccepted) ||
                (isClient && step === 2 && !policyAccepted) ||
                (step === 4 && (!policyAccepted || (!isClient && !intakeFormData)))
              }
              className={isClient ? 'w-full sm:w-auto min-w-[100px]' : 'min-w-[100px]'}
            >
              {loading ? (
                <>
                  <Timer className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : step === 4 || (!isClient && step === 3) ? (
                'Complete Booking'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
