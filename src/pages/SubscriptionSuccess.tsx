import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { verifyPlatformSubscriptionCheckout } from "@web/lib/platformSubscriptionCheckout";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

/**
 * Post platform subscription checkout — verify-checkout first (app parity),
 * then poll get-subscription until DB shows active.
 */
export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [status, setStatus] = useState<
    "verifying" | "polling" | "active" | "timeout" | "error"
  >("verifying");
  const [message, setMessage] = useState("");
  const startTime = useRef(Date.now());

  const practitionerDashboard = () => {
    const role = userProfile?.user_role;
    return ["sports_therapist", "massage_therapist", "osteopath"].includes(
      role || "",
    )
      ? "/dashboard"
      : "/client/dashboard";
  };

  useEffect(() => {
    const sessionId = searchParams.get("session_id")?.trim() ?? "";
    if (!sessionId) {
      setStatus("error");
      setMessage(
        "Missing checkout session. Open Plans & fees to subscribe again.",
      );
      return;
    }
    if (!user) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const goActive = () => {
      setStatus("active");
      setMessage("Subscription active! Redirecting…");
      setTimeout(
        () => navigate(practitionerDashboard(), { replace: true }),
        1500,
      );
    };

    const pollSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return false;

      const { data, error } = await supabase.functions.invoke(
        "get-subscription",
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (cancelled) return false;
      if (error) {
        setStatus("error");
        setMessage(
          "Could not verify subscription status. Check subscription settings.",
        );
        return true;
      }

      if (data?.hasActiveSubscription === true) {
        goActive();
        return true;
      }

      if (Date.now() - startTime.current > POLL_TIMEOUT_MS) {
        setStatus("timeout");
        setMessage(
          "Activation is taking longer than usual. Check subscription settings in a few minutes.",
        );
        return true;
      }
      return false;
    };

    void (async () => {
      const verifyRes = await verifyPlatformSubscriptionCheckout(sessionId);
      if (cancelled) return;

      if (verifyRes.success) {
        goActive();
        return;
      }

      setStatus("polling");
      setMessage(
        verifyRes.error
          ? "Confirming with Stripe… This can take up to a minute."
          : "Setting up your subscription…",
      );
      startTime.current = Date.now();

      const done = await pollSubscription();
      if (cancelled || done) return;

      intervalId = setInterval(() => {
        void pollSubscription().then((finished) => {
          if (finished && intervalId) clearInterval(intervalId);
        });
      }, POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [searchParams, user, userProfile, navigate]);

  if (!user) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to continue.</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    status === "verifying" ||
    status === "polling" ||
    status === "active"
  ) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              {status === "active" ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
              {status === "active"
                ? "Subscription active!"
                : "Setting up your subscription…"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {status === "active"
                ? message
                : message ||
                  "Do not close this page. We’re confirming your payment with Stripe."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "timeout" || status === "error") {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              {status === "timeout"
                ? "Taking longer than usual"
                : "Verification issue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">{message}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/settings/subscription")}>
                Subscription settings
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(practitionerDashboard())}
              >
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
