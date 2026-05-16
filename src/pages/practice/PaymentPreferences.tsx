import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Banknote, CreditCard } from "lucide-react";

const PaymentPreferences: React.FC = () => {
  const { user } = useAuth();
  const [acceptInPerson, setAcceptInPerson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("accept_in_person_payment")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setAcceptInPerson(data?.accept_in_person_payment ?? false);
      } catch (err) {
        console.error("Error loading preferences:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ accept_in_person_payment: checked })
        .eq("id", user.id);
      if (error) throw error;
      setAcceptInPerson(checked);
      toast.success(
        checked
          ? "In-person payments enabled. Clients can now choose to pay at your clinic."
          : "In-person payments disabled. Clients must pay online.",
      );
    } catch (err) {
      console.error("Error saving preference:", err);
      toast.error("Failed to update preference");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Please log in to manage preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Payment Preferences"
        description="Control how clients can pay for sessions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Payments", href: "/payments" },
          { label: "Preferences" },
        ]}
        backTo="/payments"
      />

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              In-Person Payments
            </CardTitle>
            <CardDescription>
              Allow clients to book and pay at your clinic with cash or card
              terminal instead of paying online. No platform commission is
              charged on in-person payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-6 w-32 bg-muted rounded" />
            ) : (
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="in-person-toggle"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  Accept pay-at-clinic bookings
                </Label>
                <Switch
                  id="in-person-toggle"
                  checked={acceptInPerson}
                  onCheckedChange={handleToggle}
                  disabled={saving}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Online Payments
            </CardTitle>
            <CardDescription>
              Online payments via Stripe are always available. A small platform
              fee applies to online bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To manage your Stripe Connect account or view online payment
              settings, visit the{" "}
              <a href="/payments" className="text-primary underline">
                Payments
              </a>{" "}
              page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPreferences;
