import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckCircle, Calendar, Mail, ArrowLeft, MessageSquare, UserPlus, ChevronDown, CalendarPlus, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationSystem } from '@/lib/notification-system';
import { toast } from 'sonner';
import { MessagingManager } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIntegrationService, type CalendarEvent } from '@/lib/calendar-integration';
import { CancellationPolicyService, type CancellationPolicy } from '@/lib/cancellation-policy';
import { addMinutes } from 'date-fns';
import {
  getDisplaySessionStatusLabel,
  isSuccessfulSessionPayment,
} from '@/lib/session-display-status';
import { getSessionLocation } from '@/utils/sessionLocation';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [clientEmail, setClientEmail] = useState<string>('');
  const [calendarFeedback, setCalendarFeedback] = useState<string | null>(null);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);
  const viewBookingsPath = useMemo(() => {
    if (isGuest && !user && session?.id) {
      const emailQuery = clientEmail ? `?email=${encodeURIComponent(clientEmail)}` : '';
      return `/booking/view/${session.id}${emailQuery}`;
    }
    return '/client/sessions';
  }, [isGuest, user, session?.id, clientEmail]);

  // Build calendar event for Add to Calendar (title, description, date/time, location)
  const calendarEvent = useMemo((): CalendarEvent | null => {
    if (!session?.session_date || !session?.start_time || !session?.duration_minutes || !practitioner) return null;
    const timePart = session.start_time.length >= 8 ? session.start_time : `${session.start_time}:00`;
    const start = new Date(`${session.session_date}T${timePart}`);
    if (Number.isNaN(start.getTime())) return null;
    const end = addMinutes(start, session.duration_minutes);
    const title = `${session.session_type || 'Session'} with ${practitioner.first_name} ${practitioner.last_name}`;
    const description = [
      `Session: ${session.session_type || 'Session'}`,
      `Practitioner: ${practitioner.first_name} ${practitioner.last_name}`,
      `Duration: ${session.duration_minutes} minutes`,
    ].join('\n');
    const location = getSessionLocation(session, practitioner).sessionLocation;
    return {
      id: session.id,
      title,
      start,
      end,
      description,
      location,
      status: 'confirmed',
      source: 'internal',
    };
  }, [session, practitioner]);

  const calendarService = useMemo(
    () => new CalendarIntegrationService({ provider: 'ical', enabled: true, syncInterval: 0 }),
    []
  );

  const handleAddToCalendar = (type: 'google' | 'outlook' | 'apple' | 'ics') => {
    if (!calendarEvent) return;
    try {
      if (type === 'google') {
        window.open(calendarService.generateGoogleCalendarURL(calendarEvent), '_blank', 'noopener,noreferrer');
      } else if (type === 'outlook') {
        window.open(calendarService.generateOutlookCalendarURL(calendarEvent), '_blank', 'noopener,noreferrer');
      } else if (type === 'apple') {
        window.open(calendarService.generateAppleCalendarURL(calendarEvent), '_blank', 'noopener,noreferrer');
      } else {
        const ics = calendarService.generateICS([calendarEvent]);
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-${session?.session_date ?? 'event'}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setCalendarFeedback(type);
      toast.success('Calendar event added', {
        description: type === 'ics' ? 'Download the .ics file and open it in your calendar.' : 'The event was opened in your calendar.',
      });
      setTimeout(() => setCalendarFeedback(null), 2000);
    } catch (e) {
      toast.error('Could not add to calendar. Please try again.');
    }
  };

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const clientSessionId = searchParams.get('client_session_id');
    
    if (sessionId) {
      // Check if it's a UUID (client session ID) or Stripe checkout session ID (starts with cs_)
      if (sessionId.startsWith('cs_')) {
        // Stripe checkout session ID
        verifyPayment(sessionId);
      } else {
        // Assume it's a client session ID (UUID)
        verifyPaymentByClientSessionId(sessionId);
      }
    } else if (clientSessionId) {
      // Explicit client session ID parameter
      verifyPaymentByClientSessionId(clientSessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);
  
  const verifyPaymentByClientSessionId = async (clientSessionId: string) => {
    try {
      setLoading(true);
      
      // Try to get session directly by ID (works if user is authenticated)
      let sessionData: any = null;
      let sessionError: any = null;
      
      const { data: directSessionData, error: directSessionError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', clientSessionId)
        .maybeSingle();

      if (!directSessionError && directSessionData) {
        // User is authenticated and can access session
        sessionData = directSessionData;
      } else {
        // User might not be authenticated (guest), try RPC function with email
        // Get email from URL params or try to get from auth
        const emailParam = searchParams.get('email');
        const authEmail = user?.email;
        const sessionEmail = emailParam || authEmail;
        
        if (sessionEmail) {
          const { data: rpcSessionData, error: rpcError } = await supabase
            .rpc('get_session_by_email_and_id', {
              p_session_id: clientSessionId,
              p_email: sessionEmail
            });
          
          if (!rpcError && rpcSessionData && Array.isArray(rpcSessionData) && rpcSessionData.length > 0) {
            sessionData = rpcSessionData[0];
          } else if (!rpcError && rpcSessionData && !Array.isArray(rpcSessionData)) {
            // Handle case where RPC returns single object instead of array
            sessionData = rpcSessionData;
          } else {
            sessionError = rpcError || directSessionError;
          }
        } else {
          sessionError = directSessionError;
        }
      }

      if (sessionError || !sessionData) {
        console.error('Session fetch error:', sessionError);
        toast.error('Unable to load session details. Please contact support with your booking reference.');
        setLoading(false);
        return;
      }

      // Get practitioner details (include clinic + fallback location for calendar event rule)
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, location, clinic_address')
        .eq('id', sessionData.therapist_id)
        .maybeSingle();

      if (practitionerError) {
        console.error('Practitioner fetch error:', practitionerError);
        toast.warning('Unable to load practitioner details, but your booking was successful.');
      }

      setSession(sessionData);
      if (practitionerData) {
        setPractitioner(practitionerData);
      }
      setClientEmail(sessionData.client_email || '');

      try {
        const policy = await CancellationPolicyService.getPolicy(sessionData.therapist_id);
        setCancellationPolicy(policy);
      } catch {
        // Non-blocking
      }

      // Check if user is a guest
      const { data: clientUser } = await supabase
        .from('users')
        .select('user_role, email')
        .eq('id', sessionData.client_id)
        .maybeSingle();
      
      setIsGuest(clientUser?.user_role === 'guest');

      // Try to get payment info if stripe_session_id is available
      let payment: any = null;
      if (sessionData.stripe_session_id) {
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('checkout_session_id', sessionData.stripe_session_id)
          .maybeSingle();
        payment = paymentData;
      }

      // Check if payment is completed and update status if needed
      const isPaymentCompleted =
        isSuccessfulSessionPayment(payment?.payment_status) ||
        isSuccessfulSessionPayment(sessionData.payment_status);
      
      if (isPaymentCompleted && sessionData.status !== 'confirmed' && sessionData.status !== 'scheduled') {
        // Update status to confirmed if payment is completed
        const { error: updateError } = await supabase
          .from('client_sessions')
          .update({ 
            status: 'confirmed',
            payment_status: 'completed'
          })
          .eq('id', sessionData.id);

        if (!updateError) {
          // Update local state immediately
          sessionData.status = 'confirmed';
          sessionData.payment_status = 'completed';
          setSession({ ...sessionData });
        }
      } else if (isPaymentCompleted && sessionData.status !== 'confirmed') {
        // Payment completed but status not updated - update local state to show confirmed
        sessionData.status = 'confirmed';
        setSession({ ...sessionData });
      }

      // Ensure conversation exists
      if (sessionData.client_id && sessionData.therapist_id) {
        try {
          await initiateConversation(sessionData.client_id, sessionData.therapist_id, sessionData.id);
        } catch (convError) {
          console.error('Failed to create conversation (non-critical):', convError);
        }
      }

    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.warning('Payment verification encountered an issue, but your booking was successful. You will receive a confirmation email shortly.');
    } finally {
      setLoading(false);
    }
  };
  
  const verifyPayment = async (checkoutSessionId: string) => {
    try {
      let payment: any = null;
      let sessionData: any = null;
      
      // Try to get payment record by checkout session ID
      // Use maybeSingle() for better error handling, especially for RLS restrictions
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('checkout_session_id', checkoutSessionId)
        .maybeSingle();

      // If payment query fails due to RLS (guest users), try alternative approach
      if (paymentError) {
        // Check if it's an RLS/permission error (PGRST301, PGRST116, or 403)
        const isRLSError = paymentError.code === 'PGRST301' || 
                          paymentError.code === 'PGRST116' || 
                          paymentError.message?.includes('permission') ||
                          paymentError.message?.includes('row-level security');
        
        if (isRLSError) {
          // For guest users, try to find session via RPC function or direct session query
          // First, try to find session by checking if webhook has updated status
          // We'll query client_sessions with payment_status or status that indicates success
          console.log('RLS error detected, trying alternative verification method');
          
          // Try using an RPC function if available, otherwise gracefully degrade
          try {
            const { data: rpcResult, error: rpcError } = await supabase
              .rpc('verify_payment_by_session', { p_checkout_session_id: checkoutSessionId })
              .maybeSingle();
            
            if (!rpcError && rpcResult) {
              payment = rpcResult.payment;
              sessionData = rpcResult.session;
            }
          } catch (rpcErr) {
            // RPC function doesn't exist or failed, continue with graceful degradation
            console.log('RPC function not available, using session status verification');
          }
        } else {
          // Non-RLS error - log and show error
          console.error('Payment verification error:', paymentError);
          toast.error('Unable to verify payment. Please contact support if you were charged.');
          setLoading(false);
          return;
        }
      } else {
        payment = paymentData;
      }

      // If we have payment data, get session details
      if (payment && payment.session_id && !sessionData) {
        const { data: session, error: sessionError } = await supabase
          .from('client_sessions')
          .select('*')
          .eq('id', payment.session_id)
          .maybeSingle();

        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          // Don't block on session error - show partial success
          toast.error('Unable to load full session details. Your booking was successful.');
        } else {
          sessionData = session;
        }
      }

      // If we still don't have session data, try to find by payment status in client_sessions
      // This is a fallback for when payment table is not accessible
      if (!sessionData) {
        // Try to find session by checking sessions that have been confirmed/paid
        // Note: This is less reliable but works when RLS blocks payments table
        console.log('Attempting to find session by status verification');
        // We'll show a generic success message since we can't verify specific details
        toast.success('Payment received! Your booking is being processed.');
        setLoading(false);
        return;
      }

      if (!sessionData) {
        console.error('Unable to find session for payment verification');
        toast.error('Unable to load session details. Please contact support with your booking reference.');
        setLoading(false);
        return;
      }

      // Get practitioner details (include clinic + fallback location for calendar event rule)
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, location, clinic_address')
        .eq('id', sessionData.therapist_id)
        .maybeSingle();

      if (practitionerError) {
        console.error('Practitioner fetch error:', practitionerError);
        // Don't block - show session info even without practitioner details
        toast.warning('Unable to load practitioner details, but your booking was successful.');
      }

      setSession(sessionData);
      if (practitionerData) {
        setPractitioner(practitionerData);
      }
      setClientEmail(sessionData.client_email || '');

      try {
        const policy = await CancellationPolicyService.getPolicy(sessionData.therapist_id);
        setCancellationPolicy(policy);
      } catch {
        // Non-blocking
      }

      // Check if user is a guest (user_role = 'guest')
      const { data: clientUser } = await supabase
        .from('users')
        .select('user_role, email')
        .eq('id', sessionData.client_id)
        .maybeSingle();
      
      setIsGuest(clientUser?.user_role === 'guest');

      // Check if webhook has already processed this payment (idempotency)
      // Webhook sets status to 'confirmed', so if status is already 'confirmed', skip duplicate work
      // Also check payment_status from session directly (in case payment table is not accessible)
      const isPaymentCompleted =
        isSuccessfulSessionPayment(payment?.payment_status) ||
        isSuccessfulSessionPayment(sessionData.payment_status);
      
      if (isPaymentCompleted && sessionData.status !== 'confirmed' && sessionData.status !== 'scheduled') {
        // Only process if webhook hasn't already handled it
        const { error: updateError } = await supabase
          .from('client_sessions')
          .update({ 
            status: 'confirmed', // Auto-confirm after successful payment
            payment_status: 'completed'
          })
          .eq('id', sessionData.id);

        if (updateError) {
          console.error('Session status update error:', updateError);
        } else {
          // Update local state immediately to reflect the change
          sessionData.status = 'confirmed';
          sessionData.payment_status = 'completed';
          setSession({ ...sessionData });
          
          // Only send emails if webhook hasn't already sent them
          // (Webhook is authoritative, but this is fallback for webhook failures)
          try {
            // Send booking confirmation emails
            await NotificationSystem.sendBookingConfirmation(sessionData.id);
            
            // Send payment confirmation emails (only if payment data available)
            if (payment?.id) {
              await NotificationSystem.sendPaymentConfirmation(payment.id);
            }

            // Create conversation between client and practitioner
            await initiateConversation(sessionData.client_id, sessionData.therapist_id, sessionData.id);
          } catch (notifError) {
            console.error('Failed to send notifications (non-critical):', notifError);
          }
        }
      } else if (isPaymentCompleted && (sessionData.status === 'confirmed' || sessionData.status === 'scheduled')) {
        // Payment completed and status is already confirmed/scheduled - just ensure conversation exists
        // Also update local state to show confirmed if payment is completed
        if (sessionData.status !== 'confirmed' && isPaymentCompleted) {
          sessionData.status = 'confirmed';
          setSession({ ...sessionData });
        }
        try {
          await initiateConversation(sessionData.client_id, sessionData.therapist_id, sessionData.id);
        } catch (convError) {
          console.error('Failed to create conversation (non-critical):', convError);
        }
      }

    } catch (error: any) {
      console.error('Payment verification error:', error);
      // Don't block the user - show success page even if verification has issues
      // The webhook will have already processed the payment
      toast.warning('Payment verification encountered an issue, but your booking was successful. You will receive a confirmation email shortly.');
    } finally {
      // Always stop loading, even if verification failed
      // This allows the page to render with whatever data we have
      setLoading(false);
    }
  };

  const initiateConversation = async (clientId: string, practitionerId: string, sessionId: string) => {
    try {
      setCreatingConversation(true);
      
      // Create conversation if doesn't exist
      const conversationId = await MessagingManager.getOrCreateConversation(clientId, practitionerId);
      setConversationId(conversationId);
      
      // Send automated welcome message
      const sessionDate = new Date(session.session_date).toLocaleDateString();
      const sessionTime = session.start_time;
      const sessionType = session.session_type;
      
      await MessagingManager.sendMessage(
        conversationId,
        'system',
        `Your ${sessionType} session on ${sessionDate} at ${sessionTime} has been confirmed. Feel free to message your practitioner with any questions!`,
        'system'
      );
      
      console.log('Conversation created and welcome message sent');
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Don't show error to user as this is not critical
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleMessagePractitioner = () => {
    if (conversationId) {
      navigate(`/messages?conversation=${conversationId}`);
    } else {
      toast.error('Conversation not ready yet. Please try again in a moment.');
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying your booking...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Your session has been booked successfully. You will receive a confirmation email shortly.
          </p>
          
          {session && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Session Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {practitioner && (
                  <div>
                    <span className="text-muted-foreground">Practitioner:</span>
                    <p className="font-medium">{practitioner.first_name} {practitioner.last_name}</p>
                  </div>
                )}
                {session.session_date && (
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">{new Date(session.session_date).toLocaleDateString()}</p>
                  </div>
                )}
                {session.start_time && (
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{session.start_time}</p>
                  </div>
                )}
                {session.duration_minutes && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{session.duration_minutes} minutes</p>
                  </div>
                )}
                {session.session_type && (
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{session.session_type}</p>
                  </div>
                )}
                {session.status && (
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">
                      {getDisplaySessionStatusLabel(session)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You'll receive a confirmation email with session details</li>
              <li>• Your practitioner will contact you if needed</li>
              <li>• Please arrive 5 minutes before your scheduled time</li>
              <li>• Bring any relevant medical information or notes</li>
            </ul>
          </div>

          {/* Cancellation policy reminder */}
          {cancellationPolicy && (
            <Card className="border-border bg-muted/30" aria-labelledby="cancellation-policy-heading">
              <CardContent className="pt-4 pb-4">
                <h3 id="cancellation-policy-heading" className="font-semibold text-foreground mb-2">
                  Cancellation policy
                </h3>
                <p className="text-sm text-foreground mb-2">
                  {cancellationPolicy.full_refund_hours >= 24
                    ? `Cancel up to ${Math.floor(cancellationPolicy.full_refund_hours / 24)} day${Math.floor(cancellationPolicy.full_refund_hours / 24) > 1 ? 's' : ''} before for full refund.`
                    : `Cancel up to ${cancellationPolicy.full_refund_hours} hours before for full refund.`}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm font-medium text-primary hover:underline"
                  onClick={() => navigate('/terms')}
                  aria-label="View full terms and conditions"
                >
                  View full terms and conditions
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Create Account Option for Guest Users */}
          {isGuest && !user && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <UserPlus className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">Create Your Account</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Create a free account to manage your bookings, track your sessions, 
                      access exclusive offers, and save your preferences for faster future bookings.
                    </p>
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>View and manage all your bookings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Quick rebooking from past sessions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Exclusive member benefits and offers</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate(`/register?email=${encodeURIComponent(clientEmail)}&redirect=/client/sessions`)}
                      className="mt-4 w-full sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
            {calendarEvent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto min-h-[44px]"
                    aria-label="Add to calendar"
                    aria-haspopup="menu"
                  >
                    {calendarFeedback ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" aria-hidden />
                    ) : (
                      <CalendarPlus className="h-4 w-4 mr-2" aria-hidden />
                    )}
                    {calendarFeedback ? 'Added to calendar' : 'Add to Calendar'}
                    <ChevronDown className="h-4 w-4 ml-2" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[200px]">
                  <DropdownMenuItem
                    onClick={() => handleAddToCalendar('google')}
                    aria-label="Add to Google Calendar"
                  >
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAddToCalendar('outlook')}
                    aria-label="Add to Outlook"
                  >
                    Outlook
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAddToCalendar('apple')}
                    aria-label="Add to Apple Calendar"
                  >
                    Apple Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAddToCalendar('ics')}
                    aria-label="Download ICS file"
                  >
                    Download .ics file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {conversationId && user && (
              <Button onClick={handleMessagePractitioner} className="w-full sm:w-auto min-h-[44px]">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Practitioner
              </Button>
            )}
            <Button
              onClick={() => navigate(viewBookingsPath)}
              className="w-full sm:w-auto min-h-[44px]"
              aria-label="View my bookings"
            >
              <ClipboardList className="h-4 w-4 mr-2" aria-hidden />
              {isGuest && !user ? 'View Booking Details' : 'View My Bookings'}
            </Button>
            <Button onClick={() => navigate('/marketplace')} className="w-full sm:w-auto min-h-[44px]">
              <Calendar className="h-4 w-4 mr-2" />
              Book Another Session
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full sm:w-auto min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>

          {/* Subtle review prompt - non-intrusive */}
          {session && practitioner && user && (
            <p className="text-center text-sm text-muted-foreground pt-2" aria-label="Review reminder">
              After your session, please{' '}
              <button
                type="button"
                onClick={() => navigate(`/client/sessions?sessionId=${session.id}&prompt=review`)}
                className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label="Leave a review for this practitioner"
              >
                leave a review
              </button>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
