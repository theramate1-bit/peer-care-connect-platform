import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CancellationPolicyService, CancellationPolicy } from '@/lib/cancellation-policy';
import { IntakeFormData, IntakeFormService } from '@/lib/intake-form-service';
import {
  Calendar,
  Clock,
  Timer,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentIntegration } from '@/lib/payment-integration';
import { SessionNotifications } from '@/lib/session-notifications';
import { getOverlappingBlocks } from '@/lib/block-time-utils';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';
import { BookingExpirationTimer } from '@/components/booking/BookingExpirationTimer';
import { PreAssessmentForm } from '@/components/forms/PreAssessmentForm';
import { PreAssessmentService } from '@/lib/pre-assessment-service';
import { formValidation } from '@/lib/form-utils';
import { handleApiError } from '@/lib/error-handling';
import { logger } from '@/lib/logger';
import { getSessionLocation } from '@/utils/sessionLocation';
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
  name: string;
  description: string;
  duration_minutes: number;
  price_amount: number; // in pence
  service_type?: 'clinic' | 'mobile' | 'both' | null;
}

interface ProductDuration {
  id: string;
  service_id: string;
  duration_minutes: number;
  price_amount: number;
  is_active: boolean;
}

interface GuestBookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: Practitioner;
  /** When set, closing due to mobile-only practitioner will call this to open the mobile flow instead. */
  onRedirectToMobile?: () => void;
  initialServiceId?: string; // optional preselect service
}

export const GuestBookingFlow: React.FC<GuestBookingFlowProps> = ({
  open,
  onOpenChange,
  practitioner,
  onRedirectToMobile,
  initialServiceId
}) => {
  const [loading, setLoading] = useState(false);

  // Enforce correct booking path: mobile-only must use MobileBookingRequestFlow, not clinic flow.
  useEffect(() => {
    if (!open || !practitioner || practitioner.therapist_type !== 'mobile') return;

    let cancelled = false;
    const ensureMobileFlowIsActuallyBookable = async () => {
      if (canRequestMobile(practitioner)) {
        if (cancelled) return;
        onOpenChange(false);
        toast.error('This practitioner travels to you.', {
          description: "Please use 'Request Visit to My Location' or 'Request Mobile Session' to book.",
        });
        onRedirectToMobile?.();
        return;
      }

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
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 60,
    session_type: '',
    notes: '',
    location: '',
    payment_method: 'card'
  });

  const [guestData, setGuestData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [emailError, setEmailError] = useState<string>('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bookingExpiresAt, setBookingExpiresAt] = useState<string | null>(null);
  const [slotUnavailableReturned, setSlotUnavailableReturned] = useState(false);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [intakeFormData, setIntakeFormData] = useState<IntakeFormData | null>(null);
  const [preAssessmentCompleted, setPreAssessmentCompleted] = useState(false);
  const [preAssessmentRequired, setPreAssessmentRequired] = useState(true);
  const [preAssessmentCanSkip, setPreAssessmentCanSkip] = useState(false);

  const [services, setServices] = useState<PractitionerProduct[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [durations, setDurations] = useState<ProductDuration[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      const { data } = await supabase
        .from('practitioner_products')
        .select('*')
        .eq('practitioner_id', practitioner.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      const clinicCompatible = (data || []).filter((p: PractitionerProduct) =>
        isProductClinicBookable(practitioner.therapist_type ?? null, p)
      );
      setServices(clinicCompatible);
      // Set default service selection
      if (clinicCompatible.length > 0) {
        setSelectedServiceId(clinicCompatible[0].id);
      } else {
        setSelectedServiceId('');
      }

      // Load cancellation policy
      const policy = await CancellationPolicyService.getPolicy(practitioner.user_id);
      setCancellationPolicy(policy);
    };
    if (open) loadServices();
  }, [open, practitioner.user_id, practitioner.therapist_type]);

  // Apply initialServiceId when services load
  useEffect(() => {
    if (initialServiceId) {
      const svc = services.find(s => s.id === initialServiceId);
      if (svc) {
        setSelectedServiceId(initialServiceId);
        setBookingData(prev => ({ ...prev, duration_minutes: svc.duration_minutes, session_type: svc.name }));
      }
    }
  }, [initialServiceId, services]);

  // Load durations when service changes
  useEffect(() => {
    const loadDurations = async () => {
      if (!selectedServiceId) {
        setDurations([]);
        setSelectedDuration(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('practitioner_product_durations')
          .select('id, service_id, duration_minutes, price_amount, is_active')
          .eq('service_id', selectedServiceId)
          .eq('is_active', true)
          .order('duration_minutes', { ascending: true });

        if (error) {
          const svc = services.find(s => s.id === selectedServiceId);
          if (svc && svc.duration_minutes) {
            setDurations([]);
            setSelectedDuration(svc.duration_minutes);
            setBookingData(prev => ({ ...prev, duration_minutes: svc.duration_minutes }));
          }
          return;
        }

        setDurations(data || []);
        if (data && data.length > 0) {
          setSelectedDuration(data[0].duration_minutes);
          setBookingData(prev => ({ ...prev, duration_minutes: data[0].duration_minutes }));
        } else {
          const svc = services.find(s => s.id === selectedServiceId);
          if (svc && svc.duration_minutes) {
            setSelectedDuration(svc.duration_minutes);
            setBookingData(prev => ({ ...prev, duration_minutes: svc.duration_minutes }));
          }
        }
      } catch (error) {
        handleApiError(error, 'loading services');
        const svc = services.find(s => s.id === selectedServiceId);
        if (svc && svc.duration_minutes) {
          setDurations([]);
          setSelectedDuration(svc.duration_minutes);
          setBookingData(prev => ({ ...prev, duration_minutes: svc.duration_minutes }));
        }
      }
    };
    loadDurations();
  }, [selectedServiceId, services]);

  const validateBookingData = () => {
    const errors: string[] = [];

    // Date validation
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

    // Time validation
    if (!bookingData.start_time) {
      errors.push('Please select a start time');
    }

    // Service validation
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
      const svc = services.find(s => s.id === selectedServiceId);
      if (svc) {
        setBookingData(prev => ({
          ...prev,
          duration_minutes: selectedDuration || svc.duration_minutes || prev.duration_minutes,
          session_type: svc.name || prev.session_type
        }));
      }
      
      const validationErrors = validateBookingData();
      if (validationErrors.length > 0) {
        toast.error(validationErrors[0]);
        return;
      }
      setSlotUnavailableReturned(false);
    }

    setStep(step + 1);
  };

  const handleBack = async () => {
    const newStep = step - 1;
    
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
        logger.error('Error validating time slot:', error);
        // Continue anyway - don't block navigation on validation error
      }
    }
    
    setStep(newStep);
  };

  const handleBooking = async () => {
    if (!policyAccepted) {
      toast.error('Please accept the cancellation policy to continue');
      return;
    }

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
    const durationRow = durations.find(d => d.duration_minutes === (selectedDuration ?? bookingData.duration_minutes));
    const priceMinor = durationRow ? durationRow.price_amount : svc.price_amount;
    const computedPrice = Math.round(priceMinor) / 100;

    try {
      setLoading(true);

      const { data: guestUserData, error: guestError } = await supabase
        .rpc('upsert_guest_user', {
          p_email: guestData.email,
          p_first_name: guestData.first_name || '',
          p_last_name: guestData.last_name || '',
          p_phone: guestData.phone || ''
        })
        .maybeSingle();

      if (guestError) throw guestError;
      if (!guestUserData || !guestUserData.id) throw new Error('Failed to create guest user');

      const guestUser = {
        id: guestUserData.id,
        email: guestUserData.email,
        first_name: guestUserData.first_name,
        last_name: guestUserData.last_name
      };

      // Store guest user ID for later use in payment creation
      setGuestUserId(guestUser.id);

      const idempotencyKey = `${guestUser.id}-${practitioner.user_id}-${bookingData.session_date}-${bookingData.start_time}-${Date.now()}`;

      // RPC creates clinic-only sessions (no appointment_type/visit_address). Mobile bookings use create_session_from_mobile_request. See docs/product/ENGINEERING_BACKLOG_EMAIL_LOCATION.md.
      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('create_booking_with_validation', {
          p_therapist_id: practitioner.user_id,
          p_client_id: guestUser.id,
          p_client_name: `${guestData.first_name || 'Guest'} ${guestData.last_name || 'User'}`.trim(),
          p_client_email: guestData.email,
          p_session_date: bookingData.session_date,
          p_start_time: bookingData.start_time,
          p_duration_minutes: bookingData.duration_minutes,
          p_session_type: bookingData.session_type || services.find(s => s.id === selectedServiceId)?.name || 'Session',
          p_price: computedPrice,
          p_client_phone: guestData.phone || null,
          p_notes: bookingData.notes ? `${bookingData.notes}\n\nService: ${services.find(s => s.id === selectedServiceId)?.name || selectedServiceId}` : `Service: ${services.find(s => s.id === selectedServiceId)?.name || selectedServiceId}`,
          p_payment_status: 'pending',
          p_status: 'pending_payment',
          p_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          p_idempotency_key: idempotencyKey,
          p_is_guest_booking: true,
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
        
        if (errorCode === 'RATING_TIER_MISMATCH') {
          toast.error(errorMessage, {
            duration: 8000, // Show longer for important messages
            description: 'This restriction only applies to peer bookings between practitioners.'
          });
          return;
        }
        
        toast.error(errorMessage);
        if (errorCode === 'CONFLICT_BOOKING') {
          setBookingData(prev => ({ ...prev, session_date: '', start_time: '' }));
          setSlotUnavailableReturned(true);
          setStep(1);
        }
        return;
      }

      const sessionId = result.session_id;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      setSessionId(sessionId);
      setBookingExpiresAt(expiresAt);

      // Check if pre-assessment is required (repeat guest with same practitioner → optional)
      const formRequirement = await PreAssessmentService.checkFormRequirement(sessionId, guestUser.id);
      setPreAssessmentRequired(formRequirement.required);
      setPreAssessmentCanSkip(formRequirement.canSkip);
      await supabase
        .from('client_sessions')
        .update({
          pre_assessment_required: formRequirement.required
        })
        .eq('id', sessionId);

      if (intakeFormData) {
        await IntakeFormService.submitIntakeForm(
          sessionId,
          intakeFormData,
          IntakeFormService.getFormTemplate(bookingData.session_type || 'general')
        );
      }

      // Move to step 3 (pre-assessment form; required or optional based on repeat guest)
      setStep(3);
      // Non-critical side effects should not block transition to pre-assessment.
      void (async () => {
        try {
          if (marketingConsent) {
            const { data: currentUser } = await supabase
              .from('users')
              .select('preferences')
              .eq('id', guestUser.id)
              .single();

            await supabase
              .from('users')
              .update({
                preferences: {
                  ...currentUser?.preferences,
                  marketing_consent: true,
                  marketing_consent_date: new Date().toISOString(),
                  marketing_consent_source: 'guest_booking'
                }
              })
              .eq('id', guestUser.id);
          }

          const { data: createdSession } = await supabase
            .from('client_sessions')
            .select('appointment_type, visit_address')
            .eq('id', sessionId)
            .single();

          const locationResult = createdSession
            ? getSessionLocation(createdSession, practitioner)
            : null;
          const sessionLocation = locationResult?.sessionLocation ?? undefined;
          const sessionLocationLabel =
            locationResult?.locationLabel === 'Visit address' ? 'visit' as const : 'session' as const;

          await SessionNotifications.sendNotification({
            trigger: 'booking_created',
            sessionId,
            clientId: guestUser.id,
            practitionerId: practitioner.user_id,
            sessionDate: bookingData.session_date,
            sessionTime: bookingData.start_time,
            sessionType: bookingData.session_type,
            practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
            clientName: `${guestData.first_name} ${guestData.last_name}`,
            sessionLocation: sessionLocation || undefined,
            sessionLocationLabel: sessionLocation ? sessionLocationLabel : undefined
          });
        } catch (sideEffectError) {
          logger.warn('Post-booking async side effects failed', { sideEffectError });
        }
      })();
      setLoading(false);
      return;

    } catch (error) {
      handleApiError(error, 'booking session');
    } finally {
      setLoading(false);
    }
  };

  const handlePreAssessmentComplete = async (formId: string) => {
    setPreAssessmentCompleted(true);
    setLoading(true);
    
    try {
      // After form completion, create payment and redirect
      if (!sessionId) {
        toast.error('Session not found');
        return;
      }

      const { data: session } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        toast.error('Session not found');
        return;
      }
      const isSameDayBooking =
        Boolean(session.requires_approval) && session.status === 'pending_approval';

      const svc = services.find(s => s.id === selectedServiceId);
      const durationRow = durations.find(d => d.duration_minutes === (selectedDuration ?? bookingData.duration_minutes));
      const priceMinor = durationRow ? durationRow.price_amount : (svc?.price_amount || 0);
      const resolvedSessionType = bookingData.session_type || svc?.name || 'Session';

      // Ensure we have a valid client ID - use stored guest user ID or session client_id
      const clientId = guestUserId || session.client_id;
      if (!clientId) {
        toast.error('Client ID not found. Please try booking again.');
        return;
      }

      const paymentResult = await PaymentIntegration.createSessionPayment({
        sessionId: session.id,
        amount: priceMinor,
        currency: 'gbp',
        clientEmail: guestData.email,
        clientName: `${guestData.first_name} ${guestData.last_name}`,
        practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
        sessionDate: bookingData.session_date,
        sessionTime: bookingData.start_time,
        sessionType: resolvedSessionType,
        practitionerId: practitioner.user_id,
        clientId: clientId,
        description: `${resolvedSessionType} session with ${practitioner.first_name} ${practitioner.last_name}`
      });

      if (paymentResult.success && paymentResult.checkoutUrl) {
        await supabase
          .from('client_sessions')
          .update({
            stripe_session_id: paymentResult.checkoutSessionId || null,
            stripe_payment_intent_id: paymentResult.paymentIntentId || null,
            payment_status: isSameDayBooking ? 'held' : 'pending'
          })
          .eq('id', session.id);

        if (isSameDayBooking) {
          toast.info('This same-day booking needs practitioner approval. Payment is authorized now and captured only if accepted.');
        }

        window.location.href = paymentResult.checkoutUrl;
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error) {
      handleApiError(error, 'payment creation', () => handlePreAssessmentComplete(''));
    } finally {
      setLoading(false);
    }
  };

  /** Proceed to payment when returning user skips the pre-assessment form */
  const handlePreAssessmentSkip = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await PreAssessmentService.skipForm(sessionId);
      await handlePreAssessmentComplete('');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingExpired = () => {
    setBookingData(prev => ({ ...prev, session_date: '', start_time: '' }));
    setSlotUnavailableReturned(true);
    setStep(1);
    setSessionId(null);
    setBookingExpiresAt(null);
    toast.error('Your booking reservation has expired.', {
      description: 'Please select a new time slot and try again.',
      duration: 6000,
    });
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Select Service';
      case 2: return 'Your Information';
      case 3: return preAssessmentRequired && !preAssessmentCanSkip
        ? 'Pre-Assessment Form – required for new clients'
        : 'Pre-Assessment Form';
      default: return 'Book Session';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Choose your service and preferred time';
      case 2: return 'Please provide your contact information';
      case 3: return preAssessmentRequired && !preAssessmentCanSkip
        ? 'As a first-time client, we need your GP and health information before your appointment.'
        : 'Help your practitioner prepare by completing this form';
      default: return 'Complete your booking details';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:mx-4 pb-10 [&_.leaflet-pane]:z-auto [&_.leaflet-control]:z-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 py-4">
          {['Service & Time', 'Info', 'Pre-Assessment'].map((label, index) => {
            const stepNumber = index + 1;
            return (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-[background-color,transform] duration-200 ease-out ${step >= stepNumber
                    ? 'bg-primary text-primary-foreground scale-110'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                  {stepNumber}
                </div>
                <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                  {label}
                </span>
                {stepNumber < 3 && (
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-[background-color] duration-200 ease-out ${step > stepNumber ? 'bg-primary' : 'bg-muted'
                    }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Booking expiration timer when on pre-assessment (step 3) */}
        {step === 3 && sessionId && bookingExpiresAt && (
          <BookingExpirationTimer
            expiresAt={bookingExpiresAt}
            onExpired={handleBookingExpired}
            className="mb-4"
          />
        )}

        {/* Step 1: Service & Date/Time Selection (Combined) */}
        {step === 1 && (
          <div className="space-y-6">
            {slotUnavailableReturned && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Time no longer available</AlertTitle>
                <AlertDescription>
                  The selected time is no longer available. Please choose a new date and time below.
                </AlertDescription>
              </Alert>
            )}

            {/* Service Selection and Map - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Service Selection Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <Card className="border-2 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {services.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {services.map((svc, index) => (
                          <motion.div
                            key={svc.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Card
                              className={`cursor-pointer transition-[border-color,background-color] duration-200 ease-out h-full ${
                                selectedServiceId === svc.id
                                  ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                  : 'border-border hover:border-primary/50'
                              }`}
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
                                        {svc.duration_minutes}m
                                      </span>
                                      <span className="font-semibold text-primary">
                                        £{(svc.price_amount / 100).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
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

              {/* Map Card - Right Side */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="w-full"
              >
                <Card className="border-2 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {practitioner.therapist_type === 'mobile'
                        ? 'Travels to you'
                        : practitioner.therapist_type === 'hybrid'
                          ? 'Session at clinic'
                          : 'Location'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        {practitioner.therapist_type === 'mobile' ? (
                          <p className="text-sm px-2">
                            This practitioner travels to your location. You&apos;ll be asked for your address when you request a mobile session.
                          </p>
                        ) : (
                          <>
                            <p className="text-sm">
                              {(practitioner.clinic_address || practitioner.location || 'Location information').trim()}
                            </p>
                            {practitioner.therapist_type === 'hybrid' && (
                              <p className="text-xs mt-1">Book at clinic or request a visit to your location.</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

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

        {/* Step 2: Guest Information */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Booking Summary - Compact */}
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
                      <div className="font-semibold text-base">
                      £{(
                        (durations.find(d => d.duration_minutes === (selectedDuration ?? bookingData.duration_minutes))?.price_amount
                          ?? services.find(s => s.id === selectedServiceId)?.price_amount
                          ?? 0) / 100
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Contact Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name *</Label>
                  <Input
                    id="first-name"
                    value={guestData.first_name}
                    onChange={(e) => setGuestData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={guestData.last_name}
                    onChange={(e) => setGuestData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestData.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    setGuestData(prev => ({ ...prev, email }));
                    // Clear error when user starts typing
                    if (emailError) {
                      setEmailError('');
                    }
                  }}
                  onBlur={(e) => {
                    const email = e.target.value.trim();
                    if (email && !formValidation.isValidEmail(email)) {
                      setEmailError('Please enter a valid email address');
                    } else {
                      setEmailError('');
                    }
                  }}
                  placeholder="your.email@example.com"
                  className={emailError ? "mt-1 border-destructive" : "mt-1"}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && (
                  <p id="email-error" className="text-xs text-destructive mt-1">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={guestData.phone}
                  onChange={(e) => setGuestData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                If you create an account later using this email, this booking will appear under My Sessions.
              </p>
            </div>

            {/* Cancellation Policy - Compact */}
            {cancellationPolicy && (
              <div className="pt-3 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="policy-acceptance"
                      checked={policyAccepted}
                      onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="policy-acceptance" className="text-xs font-medium cursor-pointer leading-tight">
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pre-Assessment Form (Mandatory for Guests) */}
        {step === 3 && sessionId && (
          <PreAssessmentForm
            sessionId={sessionId}
            clientId={guestUserId ?? undefined}
            clientEmail={guestData.email}
            clientName={`${guestData.first_name} ${guestData.last_name}`}
            isGuest={true}
            isInitialSession={preAssessmentRequired && !preAssessmentCanSkip}
            onComplete={handlePreAssessmentComplete}
            onSkip={preAssessmentCanSkip ? handlePreAssessmentSkip : undefined}
            onBack={handleBack}
            canSkip={preAssessmentCanSkip}
          />
        )}

        {/* Action Buttons - Hide for step 3 (form has its own buttons) */}
        {step !== 3 && (
        <div key="guest-booking-nav-buttons" className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-4">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={step === 2 ? handleBooking : handleNext}
            disabled={loading || (step === 1 && (!selectedServiceId || !bookingData.session_date || !bookingData.start_time)) || (step === 2 && (!policyAccepted || !guestData.first_name || !guestData.last_name || !guestData.email || !guestData.phone || !!emailError || !formValidation.isValidEmail(guestData.email)))}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Timer className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
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
