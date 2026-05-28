import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Stripe Checkout return for clinic bookings (`session_id` = Checkout Session id).
 * Parity with `theramate-ios-client/app/booking-success.tsx`.
 */
const BookingSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const checkoutSessionId = searchParams.get("session_id") ?? "";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!checkoutSessionId) return;

    let mounted = true;
    void (async () => {
      setLoading(true);
      setMessage("Finalizing your booking status…");
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("session_id")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          setMessage(
            error.message ||
              "Payment succeeded. Your booking will appear in sessions shortly.",
          );
          return;
        }
        const sid =
          (data as { session_id?: string } | null)?.session_id || null;
        if (sid) {
          setResolvedSessionId(sid);
          setMessage("Payment confirmed and booking created.");
        } else {
          setMessage("Payment confirmed. Booking details are syncing.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [checkoutSessionId]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <CardTitle className="text-2xl">Booking confirmed</CardTitle>
          <p className="text-muted-foreground text-sm">
            Thank you. Your payment was successful.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-center flex flex-col items-center gap-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              <span>{message}</span>
            </div>
          ) : null}

          {user ? (
            <>
              {resolvedSessionId ? (
                <Button
                  className="w-full"
                  onClick={() =>
                    navigate(`/client/sessions/${resolvedSessionId}`)
                  }
                >
                  View booking details
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => navigate("/client/sessions")}
                >
                  Go to my sessions
                </Button>
              )}
            </>
          ) : (
            <>
              {resolvedSessionId ? (
                <p className="text-sm text-muted-foreground text-center">
                  Open the secure link in your confirmation email, or search by
                  email below.
                </p>
              ) : null}
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

export default BookingSuccess;
