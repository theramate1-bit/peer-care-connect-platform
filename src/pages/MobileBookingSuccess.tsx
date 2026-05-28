import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Stripe Checkout return URL for mobile booking requests.
 * Query: mobile_request_id, mobile_checkout_session_id (from stripe-payment edge).
 */
const MobileBookingSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const requestId = searchParams.get("mobile_request_id") ?? "";
  const checkoutSessionId =
    searchParams.get("mobile_checkout_session_id") ?? "";
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!requestId || !checkoutSessionId) return;

    let mounted = true;
    void (async () => {
      setVerifying(true);
      setVerificationMessage("Verifying your mobile request payment…");
      try {
        const { data, error } = await supabase.functions.invoke(
          "stripe-payment",
          {
            body: {
              action: "confirm-mobile-checkout-session",
              request_id: requestId,
              checkout_session_id: checkoutSessionId,
            },
          },
        );
        if (!mounted) return;
        if (error) {
          setVerificationMessage(
            error.message || "Could not confirm payment yet.",
          );
          return;
        }
        const payload = (data || {}) as {
          success?: boolean;
          already_confirmed?: boolean;
          status?: string;
          payment_status?: string;
          error?: string;
        };
        if (payload.success) {
          setVerificationMessage(
            payload.already_confirmed
              ? "Payment was already confirmed for this request."
              : `Mobile request confirmed (${payload.payment_status || payload.status || "held"}).`,
          );
        } else {
          setVerificationMessage(
            payload.error || "Payment confirmation is still pending.",
          );
        }
      } finally {
        if (mounted) setVerifying(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [checkoutSessionId, requestId]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <CardTitle className="text-2xl">Payment received</CardTitle>
          <p className="text-muted-foreground text-sm">
            Your mobile visit request has been submitted. The practitioner will
            review and accept or suggest another time.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationMessage ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-center flex flex-col items-center gap-2">
              {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              <span>{verificationMessage}</span>
            </div>
          ) : null}

          {user ? (
            <>
              <Button
                className="w-full"
                onClick={() => navigate("/client/sessions")}
              >
                Go to my sessions
              </Button>
              {requestId ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/client/mobile-requests?requestId=${encodeURIComponent(requestId)}`,
                    )
                  }
                >
                  View mobile request
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Track your request with the email you used at checkout.
              </p>
              {requestId ? (
                <Button className="w-full" asChild>
                  <Link
                    to={`/guest/mobile-requests?requestId=${encodeURIComponent(requestId)}`}
                  >
                    View my request
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/guest/mobile-requests">Guest mobile requests</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/booking/find">Find my booking</Link>
              </Button>
            </>
          )}

          <Button variant="ghost" className="w-full" asChild>
            <Link to="/marketplace">Browse practitioners</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileBookingSuccess;
