import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, ExternalLink, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GuestSessionData {
  id: string;
  client_email: string | null;
  client_name: string | null;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number | null;
  status: string;
  appointment_type?: string | null;
  visit_address?: string | null;
  practitioner: {
    first_name: string | null;
    last_name: string | null;
    location: string | null;
    clinic_address?: string | null;
  } | null;
}

function buildDirectionsUrl(address: string | null | undefined): string | undefined {
  if (!address || typeof address !== 'string' || !address.trim()) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
}

export default function GuestBookingView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [data, setData] = useState<GuestSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!sessionId || (!token && !email)) {
      setError('Invalid link. Please use the link from your booking confirmation email.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Token-based access (preferred when available)
        if (token) {
          const { data: result, error: rpcError } = await supabase.rpc('get_session_by_guest_token', {
            p_session_id: sessionId,
            p_token: token,
          });
          if (!rpcError && result && typeof result === 'object') {
            setData(result as GuestSessionData);
          } else {
            setError('This link is invalid or has expired. Please contact your practitioner or support.');
          }
          return;
        }

        // Email-based access (for links without token, e.g. from reminders/reschedule)
        if (email) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_session_by_email_and_id', {
            p_session_id: sessionId,
            p_email: email,
          });
          if (rpcError || !rpcData) {
            setError(rpcError ? 'This link is invalid or has expired. Please contact your practitioner or support.' : 'Booking not found.');
            setData(null);
            return;
          }
          const sessionRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          if (!sessionRow) {
            setError('Booking not found. Please use the link from your confirmation email.');
            return;
          }
          // Fetch practitioner for display
          const { data: practitionerData } = await supabase
            .from('users')
            .select('first_name, last_name, location, clinic_address')
            .eq('id', sessionRow.therapist_id)
            .maybeSingle();
          const sessionLocation = (sessionRow as any).location;
          // If location looks like an address (contains comma or is substantial), treat as visit address (mobile)
          const isMobile = sessionLocation && typeof sessionLocation === 'string' && (sessionLocation.includes(',') || sessionLocation.length > 30);
          setData({
            id: sessionRow.id,
            client_email: sessionRow.client_email,
            client_name: sessionRow.client_name,
            session_date: sessionRow.session_date,
            start_time: sessionRow.start_time,
            duration_minutes: sessionRow.duration_minutes,
            session_type: sessionRow.session_type || 'Session',
            price: sessionRow.price,
            status: sessionRow.status,
            appointment_type: isMobile ? 'mobile' : null,
            visit_address: isMobile ? sessionLocation : null,
            practitioner: practitionerData ? {
              first_name: practitionerData.first_name,
              last_name: practitionerData.last_name,
              location: practitionerData.location,
              clinic_address: practitionerData.clinic_address,
            } : null,
          } as GuestSessionData);
        }
      } catch {
        setError('Unable to load booking details. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, token, email]);

  const isCancellable = data?.status === 'confirmed' && (() => {
    if (!data?.session_date || !data?.start_time) return false;
    const sessionDt = new Date(`${data.session_date}T${data.start_time}`);
    return sessionDt > new Date();
  })();

  const handleCancel = async () => {
    if (!data?.id || !data?.client_email) return;
    const emailParam = email || new URLSearchParams(window.location.search).get('email');
    const verifyEmail = emailParam || data.client_email;
    if (!verifyEmail) return;
    setCancelling(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('guest-cancel-session', {
        body: { session_id: data.id, email: verifyEmail },
      });
      if (fnError) throw fnError;
      if (result?.success !== true) throw new Error(result?.error || 'Failed to cancel');
      setData((prev) => prev ? { ...prev, status: 'cancelled' } : null);
      setShowCancelDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted-foreground">Loading your booking...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Unable to show booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/booking/find">Find my booking</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/marketplace">Browse practitioners</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const practitionerName = data.practitioner
    ? [data.practitioner.first_name, data.practitioner.last_name].filter(Boolean).join(' ') || 'Practitioner'
    : 'Practitioner';
  // Booking record first: appointment_type + visit_address (mobile) vs practitioner clinic/location (clinic)
  const isMobile = data.appointment_type === 'mobile' && data.visit_address?.trim();
  const location = isMobile
    ? data.visit_address!.trim()
    : (data.practitioner?.clinic_address?.trim() || data.practitioner?.location?.trim() || null);
  const directionsUrl = isMobile ? undefined : buildDirectionsUrl(location);
  const locationLabel = isMobile ? 'Your address' : 'Location';
  const sessionDateFormatted = data.session_date
    ? new Date(data.session_date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Don&apos;t share this link – anyone with it can view your booking details.
      </div>
      <Card>
        <CardHeader className="pb-2">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 w-fit">
            <Link to="/marketplace">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to marketplace
            </Link>
          </Button>
          <CardTitle>Your booking details</CardTitle>
          <p className="text-sm text-muted-foreground">View-only. No sign-in required.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>{sessionDateFormatted}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>
                {data.start_time}
                {data.duration_minutes ? ` (${data.duration_minutes} min)` : ''}
              </span>
            </div>
            <p>
              <strong>Session:</strong> {data.session_type || 'Session'}
            </p>
            <p>
              <strong>Practitioner:</strong> {practitionerName}
            </p>
            {data.price != null && (
              <p>
                <strong>Price:</strong> £
                {Number.isInteger(data.price) && data.price >= 100
                  ? (Number(data.price) / 100).toFixed(2)
                  : Number(data.price).toFixed(2)}
              </p>
            )}
          </div>

          {location && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">{locationLabel}</p>
                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {location}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground">{location}</p>
                  )}
                  {directionsUrl && (
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                        Get directions
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {data.status === 'cancelled' ? (
            <p className="text-sm text-muted-foreground pt-2">This booking has been cancelled.</p>
          ) : isCancellable ? (
            <div className="pt-2 space-y-2">
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="w-full sm:w-auto"
              >
                Cancel booking
              </Button>
              <p className="text-sm text-muted-foreground">
                Need to reschedule? Contact your practitioner or use the link in your confirmation email.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-2">
              Need to change or cancel? Contact your practitioner or use the link in your confirmation email.
            </p>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel your session. Refund will be applied according to the cancellation policy
            (typically full refund with 24+ hours notice, 50% with 12–24 hours).
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : 'Yes, cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
