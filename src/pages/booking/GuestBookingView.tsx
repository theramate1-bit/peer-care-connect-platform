import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const [data, setData] = useState<GuestSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !token) {
      setError('Invalid link. Please use the link from your booking confirmation email.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_session_by_guest_token', {
          p_session_id: sessionId,
          p_token: token,
        });
        if (rpcError) {
          setError('This link is invalid or has expired. Please contact your practitioner or support.');
          setData(null);
          return;
        }
        if (result && typeof result === 'object') {
          setData(result as GuestSessionData);
        } else {
          setError('Booking not found. Please use the link from your confirmation email.');
        }
      } catch {
        setError('Unable to load booking details. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, token]);

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
            <Button asChild variant="outline">
              <Link to="/marketplace">Browse practitioners</Link>
            </Button>
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
    <div className="max-w-lg mx-auto py-8 px-4">
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

          <p className="text-sm text-muted-foreground pt-2">
            Need to change or cancel? Contact your practitioner or use the link in your confirmation email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
