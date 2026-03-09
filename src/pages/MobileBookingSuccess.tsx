import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { NotificationSystem } from '@/lib/notification-system';
import { useAuth } from '@/contexts/AuthContext';

type ConfirmState = 'loading' | 'success' | 'error';

export default function MobileBookingSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [state, setState] = useState<ConfirmState>('loading');
  const [message, setMessage] = useState('Finalizing your mobile booking request...');
  const [guestEmail, setGuestEmail] = useState(searchParams.get('email') ?? '');

  const requestId = searchParams.get('mobile_request_id') ?? '';
  const checkoutSessionId = searchParams.get('mobile_checkout_session_id') ?? '';

  useEffect(() => {
    let cancelled = false;

    const getNotificationContext = async () => {
      const contextRaw = localStorage.getItem(`mobile_checkout_context_${requestId}`);
      if (contextRaw) {
        try {
          return JSON.parse(contextRaw) as {
            requestId: string;
            practitionerId: string;
            clientName: string;
            clientEmail?: string;
            serviceType: string;
            requestedDate: string;
            requestedTime: string;
            clientAddress: string;
            distanceKm?: number;
            price?: number;
          };
        } catch {
          // Fall through to DB lookup
        }
      }

      const { data: requestRow } = await supabase
        .from('mobile_booking_requests')
        .select(`
          id,
          practitioner_id,
          requested_date,
          requested_start_time,
          client_address,
          total_price_pence,
          product:practitioner_products(name),
          client:users!mobile_booking_requests_client_id_fkey(first_name,last_name,email)
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (!requestRow) return null;

      const productName = Array.isArray(requestRow.product)
        ? requestRow.product[0]?.name
        : (requestRow.product as { name?: string } | null)?.name;
      const clientUser = Array.isArray(requestRow.client)
        ? requestRow.client[0]
        : (requestRow.client as { first_name?: string; last_name?: string; email?: string } | null);
      const clientName = `${clientUser?.first_name || ''} ${clientUser?.last_name || ''}`.trim() || 'Client';

      return {
        requestId: requestRow.id,
        practitionerId: requestRow.practitioner_id,
        clientName,
        clientEmail: clientUser?.email || undefined,
        serviceType: productName || 'Mobile Service',
        requestedDate: requestRow.requested_date,
        requestedTime: requestRow.requested_start_time,
        clientAddress: requestRow.client_address,
        price: requestRow.total_price_pence,
      };
    };

    const finalize = async () => {
      if (!requestId || !checkoutSessionId) {
        setState('error');
        setMessage('Missing checkout details. Please try booking again.');
        return;
      }

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      try {
        let confirmed = false;
        let finalErrorMessage = 'Unable to confirm mobile payment authorization';

        for (let attempt = 0; attempt < 5 && !confirmed; attempt += 1) {
          const { data, error } = await supabase.functions.invoke('mobile-payment', {
            body: {
              action: 'confirm-mobile-checkout-session',
              request_id: requestId,
              checkout_session_id: checkoutSessionId,
            },
          });

          if (!error && data?.success) {
            confirmed = true;
            break;
          }

          let retryable = false;
          let responseMessage = '';

          if (data && typeof data === 'object') {
            const payload = data as { error?: string; details?: unknown; retryable?: boolean };
            responseMessage = payload.error || (typeof payload.details === 'string' ? payload.details : '');
            retryable = payload.retryable === true;
          }

          if (error) {
            const maybeContext = (error as any)?.context;
            if (maybeContext?.status === 409) retryable = true;
            finalErrorMessage = responseMessage || (error as Error).message || finalErrorMessage;
          } else if (responseMessage) {
            finalErrorMessage = responseMessage;
          }

          const lowerMessage = (responseMessage || finalErrorMessage || '').toLowerCase();
          if (
            lowerMessage.includes('not ready') ||
            lowerMessage.includes('not paid') ||
            lowerMessage.includes('payment is not ready')
          ) {
            retryable = true;
          }

          if (!retryable || attempt === 4) {
            throw new Error(finalErrorMessage);
          }

          await sleep(1200 * (attempt + 1));
        }

        if (!confirmed) {
          throw new Error(finalErrorMessage);
        }

        // Send practitioner email after hold confirmation.
        try {
          const context = await getNotificationContext();
          if (context) {
            if (!user && context.clientEmail) {
              setGuestEmail(context.clientEmail);
            }
            await NotificationSystem.sendMobileBookingRequestNotification(context.practitionerId, {
              requestId: context.requestId,
              clientName: context.clientName,
              serviceType: context.serviceType,
              requestedDate: context.requestedDate,
              requestedTime: context.requestedTime,
              clientAddress: context.clientAddress,
              distanceKm: context.distanceKm,
              price: context.price,
            });
          }
        } finally {
          localStorage.removeItem(`mobile_checkout_context_${requestId}`);
        }

        if (!cancelled) {
          setState('success');
          setMessage('Your mobile booking request has been submitted. Payment is held until the practitioner accepts.');
        }
      } catch (error: any) {
        if (!cancelled) {
          setState('error');
          setMessage(error?.message || 'Failed to finalize your mobile booking request.');
        }
      }
    };

    finalize();
    return () => {
      cancelled = true;
    };
  }, [requestId, checkoutSessionId]);

  const secondaryHref = useMemo(() => {
    if (user) return '/client/mobile-requests';
    if (guestEmail) {
      return `/guest/mobile-requests?email=${encodeURIComponent(guestEmail)}${requestId ? `&requestId=${requestId}` : ''}`;
    }
    return '/marketplace';
  }, [user, guestEmail, requestId]);

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === 'loading' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Finalizing booking
              </>
            ) : state === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Mobile booking request submitted
              </>
            ) : (
              'Something needs attention'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/marketplace">Back to Marketplace</Link>
            </Button>
            {state !== 'loading' && (
              <Button asChild variant="outline">
                <Link to={secondaryHref}>
                  {user ? 'View My Mobile Requests' : guestEmail ? 'Track My Request' : 'Browse Practitioners'}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
