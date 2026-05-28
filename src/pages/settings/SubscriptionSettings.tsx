import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  createCustomerPortalSession,
  fetchLatestSubscription,
  formatBillingCycle,
  formatPlanLabel,
  formatSubscriptionStatus,
} from "@/lib/subscription";

const PRACTITIONER_ROLES = new Set([
  "sports_therapist",
  "massage_therapist",
  "osteopath",
]);

const SubscriptionSettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const isPractitioner =
    !!userProfile?.user_role && PRACTITIONER_ROLES.has(userProfile.user_role);
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cycle, setCycle] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || !isPractitioner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await fetchLatestSubscription(user.id);
    const sub = data?.subscription;
    setPlan(sub ? formatPlanLabel(sub.plan) : null);
    setStatus(sub ? formatSubscriptionStatus(sub.status) : null);
    setCycle(sub ? formatBillingCycle(sub.billing_cycle) : null);
    setLoading(false);
  }, [user?.id, isPractitioner]);

  useEffect(() => {
    void load();
  }, [load]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await createCustomerPortalSession();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.url;
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Subscription & billing"
        description="Manage your Theramate practitioner plan via Stripe."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      {!isPractitioner ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Platform subscriptions apply to practitioner accounts.{" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/pricing">View plans & fees</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : plan ? (
              <p className="text-sm flex flex-wrap gap-2 items-center">
                <Badge>{plan}</Badge>
                <span>{status}</span>
                {cycle ? (
                  <span className="text-muted-foreground">· {cycle}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No subscription record found. Complete onboarding or contact
                support.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void openPortal()}
                disabled={portalLoading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {portalLoading ? "Opening…" : "Stripe billing portal"}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/practice/billing">Practice payouts</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/pricing">Plans & fees</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionSettings;
