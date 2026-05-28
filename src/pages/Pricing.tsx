import { useEffect, useRef, useState } from "react";
import { HeaderClean } from "@/components/landing/HeaderClean";
import { FooterClean } from "@/components/FooterClean";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import MetaTags from "@/components/SEO/MetaTags";
import { supabase } from "@/integrations/supabase/client";
import { TheraMatePricingGrid } from "@/components/pricing/TheraMatePricingGrid";
import { PricingEnterpriseBlock } from "@/components/pricing/PricingEnterpriseBlock";
import type { PlanId } from "@/config/pricing-display";
import {
  clearPendingPractitionerCheckout,
  getPendingPractitionerCheckout,
  setPendingPractitionerCheckout,
} from "@/lib/pricing-checkout-intent";

function planLabel(tier: string | null): string {
  if (!tier) return "";
  const t = tier.toLowerCase();
  if (t === "practitioner" || t === "professional") return "Starter";
  if (t === "pro" || t === "professional_pro") return "Pro";
  return tier;
}

const Pricing = () => {
  const { subscribed, subscriptionTier, subscriptionEnd, loading, checkSubscription, manageSubscription, createCheckout } = useSubscription();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resumeCheckoutOnce = useRef(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "enterprise") {
      const el = document.getElementById("enterprise-pricing");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && userProfile) {
      const isPractitioner = ["sports_therapist", "massage_therapist", "osteopath"].includes(
        userProfile.user_role
      );
      if (isPractitioner) {
        checkSubscription(true);
      }
    }
  }, [user?.id, userProfile?.id]);

  useEffect(() => {
    if (!user || !userProfile) return;

    const isPractitioner = ["sports_therapist", "massage_therapist", "osteopath"].includes(
      userProfile.user_role
    );
    const needsOnboarding =
      userProfile.onboarding_status !== "completed" || !userProfile.profile_completed;

    if (isPractitioner && needsOnboarding) {
      navigate("/onboarding", {
        replace: true,
        state: {
          message: "Complete onboarding to continue setup.",
          from: "/pricing",
        },
      });
    }
  }, [
    user?.id,
    userProfile?.id,
    userProfile?.user_role,
    userProfile?.onboarding_status,
    userProfile?.profile_completed,
    navigate,
  ]);

  useEffect(() => {
    if (!loading && subscribed && userProfile) {
      const isPractitioner = ["sports_therapist", "massage_therapist", "osteopath"].includes(
        userProfile.user_role
      );
      if (isPractitioner && userProfile.onboarding_status === "completed") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [loading, subscribed, userProfile?.id, userProfile?.user_role, userProfile?.onboarding_status, navigate]);

  /** After sign-up and practitioner onboarding, continue to Stripe for the plan chosen on the pricing page. */
  useEffect(() => {
    if (!user || !userProfile || loading) return;
    if (resumeCheckoutOnce.current) return;
    const isPractitioner = ["sports_therapist", "massage_therapist", "osteopath"].includes(
      userProfile.user_role
    );
    if (!isPractitioner || userProfile.onboarding_status !== "completed" || subscribed) {
      if (subscribed) clearPendingPractitionerCheckout();
      return;
    }
    const pending = getPendingPractitionerCheckout();
    if (!pending) return;
    resumeCheckoutOnce.current = true;
    (async () => {
      try {
        await createCheckout(pending.plan, pending.billing);
        clearPendingPractitionerCheckout();
      } catch {
        resumeCheckoutOnce.current = false;
        setPendingPractitionerCheckout(pending.plan, pending.billing);
      }
    })();
  }, [user, userProfile, loading, subscribed, createCheckout]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePlanSelect = async (planId: PlanId, billing: "monthly" | "yearly") => {
    if (!user) {
      setPendingPractitionerCheckout(planId, billing);
      const q = new URLSearchParams({
        from: "pricing",
        plan: planId,
        billing,
      });
      navigate(`/register?${q.toString()}`);
      return;
    }

    await createCheckout(planId, billing);
  };

  const handleCustomPricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const customPricingData = {
        first_name: formData.get("firstName"),
        last_name: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        company: formData.get("company"),
        organization_type: formData.get("organizationType"),
        team_size: formData.get("teamSize"),
        message: formData.get("message"),
        type: "custom_pricing",
        status: "new",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("contact_messages").insert([customPricingData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Message sent",
        description: "We'll get back to you within one business day.",
      });

      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error submitting custom pricing form:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <MetaTags
        title="Pricing Plans | TheraMate - Professional Plans for Healthcare Practitioners"
        description="Transparent pricing for healthcare practitioners. Starter and Pro from £30/month. Grow your practice with TheraMate."
        keywords="therapy pricing, healthcare professional plans, sports therapy cost, massage therapy rates, osteopathy pricing, therapy platform pricing, practitioner plans"
        canonicalUrl="https://theramate.com/pricing"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Pricing Plans | TheraMate",
          description: "Professional plans for healthcare practitioners starting at £30/month.",
          url: "https://theramate.com/pricing",
          mainEntity: {
            "@type": "ItemList",
            name: "Healthcare Professional Plans",
            description: "Pricing plans for healthcare professional subscriptions",
            itemListElement: [
              {
                "@type": "Offer",
                name: "Starter Plan",
                description: "Complete platform access for licensed healthcare professionals",
                price: "30",
                priceCurrency: "GBP",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: "30",
                  priceCurrency: "GBP",
                  unitText: "per month",
                },
              },
              {
                "@type": "Offer",
                name: "Pro Plan",
                description: "Enhanced features for growing practices",
                price: "50",
                priceCurrency: "GBP",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: "50",
                  priceCurrency: "GBP",
                  unitText: "per month",
                },
              },
            ],
          },
        }}
      />
      <div className="flex min-h-screen flex-col bg-background">
        <HeaderClean />

        <main className="mt-16 flex-1">
          {user && (
            <section className="border-b border-border/60 bg-muted/20 py-8">
              <div className="container mx-auto max-w-4xl px-4">
                <Card className="border-border/80 shadow-[var(--shadow-soft)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Settings className="h-5 w-5 text-primary" />
                        Your subscription
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => checkSubscription(true)} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        {subscribed ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Active</Badge>
                              <span className="font-medium">{planLabel(subscriptionTier)} plan</span>
                            </div>
                            {subscriptionEnd && (
                              <p className="text-sm text-muted-foreground">Renews {formatDate(subscriptionEnd)}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="outline">No active plan</Badge>
                            <p className="text-sm text-muted-foreground">Pick a plan below to subscribe.</p>
                          </div>
                        )}
                      </div>

                      {subscribed && (
                        <Button onClick={manageSubscription} variant="outline">
                          Manage billing
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          <section className="py-16 md:py-20">
            <div className="container mx-auto max-w-5xl px-4">
              <header className="mb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Pricing</h1>
                <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                  Per-practitioner plans. Clear fees on paid bookings.{" "}
                  <a href="#enterprise-pricing" className="font-medium text-primary underline-offset-4 hover:underline">
                    Need a team or clinic rollout?
                  </a>
                </p>
              </header>

              <TheraMatePricingGrid
                subscribed={subscribed}
                subscriptionTier={subscriptionTier}
                onCheckout={handlePlanSelect}
              />

              <div className="mt-16 border-t border-border pt-16">
                <PricingEnterpriseBlock onSubmit={handleCustomPricingSubmit} isSubmitting={isSubmitting} />
              </div>
            </div>
          </section>
        </main>

        <FooterClean />
      </div>
    </>
  );
};

export default Pricing;
