import React, { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  canRequestMobile,
  type PractitionerForBookingFlow,
} from "@/lib/booking-flow-type";
import { filterMobileBookableProducts } from "@/lib/bookingProducts";
import {
  createMobileRequestAndOpenCheckout,
  fetchAvailableStartTimes,
  fetchPractitionerProducts,
  type PractitionerProductRow,
} from "@/lib/clientMarketplaceBooking";
import { geocodeClientAddress } from "@/lib/geocodeClientAddress";

export type MobileBookingPractitioner = {
  id: string;
  first_name: string;
  last_name: string;
  therapist_type?: string | null;
  mobile_service_radius_km?: number | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  products?: Array<{
    id?: string;
    name?: string;
    is_active?: boolean;
    service_type?: string | null;
  }>;
};

type MobileBookingRequestFlowProps = {
  practitioner: MobileBookingPractitioner | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
  guestMode?: boolean;
  embedded?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
};

function formatPricePence(pence: number, currency = "gbp"): string {
  const symbol = currency.toLowerCase() === "gbp" ? "£" : "";
  return `${symbol}${(pence / 100).toFixed(2)}`;
}

function MobileBookingRequestForm({
  practitioner,
  initialDate,
  initialTime,
  guestMode = false,
  onComplete,
  onCancel,
}: Omit<MobileBookingRequestFlowProps, "open" | "onOpenChange" | "embedded"> & {
  practitioner: MobileBookingPractitioner;
}) {
  const { user } = useAuth();
  const practitionerId = practitioner.id;
  const therapistType = practitioner.therapist_type ?? null;

  const bookingProfile: PractitionerForBookingFlow = useMemo(
    () => ({
      therapist_type: therapistType,
      mobile_service_radius_km: practitioner.mobile_service_radius_km ?? null,
      base_latitude: practitioner.base_latitude ?? null,
      base_longitude: practitioner.base_longitude ?? null,
      products: (practitioner.products ?? []).map((p) => ({
        is_active: p.is_active !== false,
        service_type: p.service_type,
      })),
    }),
    [practitioner, therapistType],
  );

  const mobileReady = canRequestMobile(bookingProfile);

  const [products, setProducts] = useState<PractitionerProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] =
    useState<PractitionerProductRow | null>(null);
  const [sessionDate, setSessionDate] = useState(
    initialDate || format(new Date(), "yyyy-MM-dd"),
  );
  const [startTime, setStartTime] = useState(initialTime || "10:00");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const d = addDays(new Date(), i);
        return {
          value: format(d, "yyyy-MM-dd"),
          label: format(d, "EEE d MMM"),
        };
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      const { data, error } = await fetchPractitionerProducts(practitionerId);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setProducts([]);
      } else {
        setProducts(filterMobileBookableProducts(therapistType, data));
      }
      setLoadingProducts(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [practitionerId, therapistType]);

  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;
    (async () => {
      setLoadingTimes(true);
      const { data, error } = await fetchAvailableStartTimes({
        practitionerId,
        date: sessionDate,
        durationMinutes: selectedProduct.duration_minutes ?? 60,
      });
      if (cancelled) return;
      if (error) {
        setAvailableTimes([]);
      } else {
        setAvailableTimes(data);
        if (data.length > 0 && !data.includes(startTime)) {
          setStartTime(data[0]);
        }
      }
      setLoadingTimes(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [practitionerId, selectedProduct, sessionDate, startTime]);

  const handleSubmit = async () => {
    if (!mobileReady) {
      toast.error(
        "This practitioner is not set up for mobile visits yet (base address and service area required).",
      );
      return;
    }
    if (!selectedProduct || !address.trim() || !startTime) {
      toast.error("Please complete service, date, time, and visit address.");
      return;
    }

    setSubmitting(true);
    try {
      const coords = await geocodeClientAddress(address);
      if (!coords) {
        toast.error(
          "Could not verify this address. Please refine it and try again.",
        );
        return;
      }

      let clientId: string;
      let clientEmail: string;

      if (guestMode) {
        if (!guestName.trim() || !guestEmail.trim()) {
          toast.error("Name and email are required.");
          return;
        }
        const { data: guestId, error: guestError } = await supabase.rpc(
          "ensure_guest_user_for_booking",
          { p_email: guestEmail.trim(), p_name: guestName.trim() },
        );
        if (guestError) throw guestError;
        if (!guestId) throw new Error("Failed to resolve guest user");
        clientId = guestId as string;
        clientEmail = guestEmail.trim();
      } else {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !authUser?.email) {
          throw new Error("Please sign in to request a mobile visit.");
        }
        clientId = authUser.id;
        clientEmail = authUser.email;
      }

      const result = await createMobileRequestAndOpenCheckout({
        practitionerId,
        clientId,
        clientEmail,
        product: selectedProduct,
        requestedDate: sessionDate,
        requestedStartTime: startTime,
        clientAddress: address.trim(),
        clientLatitude: coords.lat,
        clientLongitude: coords.lng,
        clientNotes: notes.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onComplete?.();
      window.location.href = result.checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const practitionerName = `${practitioner.first_name} ${practitioner.last_name}`;

  const formBody = (
    <div className="space-y-4">
      {!mobileReady ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
          Practitioner must set a base address and mobile service radius before
          accepting mobile requests.
        </p>
      ) : null}

      {loadingProducts ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No mobile bookable services are available for this practitioner.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Service</Label>
            <Select
              value={selectedProduct?.id ?? ""}
              onValueChange={(id) => {
                const p = products.find((x) => x.id === id) ?? null;
                setSelectedProduct(p);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} —{" "}
                    {formatPricePence(p.price_amount, p.currency ?? "gbp")}
                    {p.duration_minutes ? ` (${p.duration_minutes} min)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred date</Label>
              <Select value={sessionDate} onValueChange={setSessionDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred time</Label>
              {loadingTimes ? (
                <div className="flex items-center h-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading times…
                </div>
              ) : availableTimes.length > 0 ? (
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Visit address (required)
            </Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address where the therapist should visit"
              rows={2}
            />
          </div>

          {guestMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Your name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : !user ? (
            <p className="text-sm text-muted-foreground">
              Sign in to continue, or add{" "}
              <code className="text-xs">?guest=1</code> to book as a guest.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access instructions, parking, etc."
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Payment is authorised at checkout and captured when the practitioner
            accepts your request.
          </p>

          <Button
            className="w-full"
            disabled={
              submitting ||
              !mobileReady ||
              !selectedProduct ||
              (!guestMode && !user)
            }
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting checkout…
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>
        </>
      )}
    </div>
  );

  if (onCancel) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Request mobile visit</CardTitle>
            <p className="text-sm text-muted-foreground">{practitionerName}</p>
          </CardHeader>
          <CardContent>{formBody}</CardContent>
        </Card>
      </div>
    );
  }

  return formBody;
}

export function MobileBookingRequestFlow({
  practitioner,
  open,
  onOpenChange,
  initialDate,
  initialTime,
  guestMode,
  embedded,
  onComplete,
  onCancel,
}: MobileBookingRequestFlowProps) {
  if (!practitioner) return null;

  if (embedded || onCancel) {
    return (
      <MobileBookingRequestForm
        practitioner={practitioner}
        initialDate={initialDate}
        initialTime={initialTime}
        guestMode={guestMode}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request mobile visit</DialogTitle>
          <DialogDescription>
            {practitioner.first_name} {practitioner.last_name} — visit at your
            address
          </DialogDescription>
        </DialogHeader>
        <MobileBookingRequestForm
          practitioner={practitioner}
          initialDate={initialDate}
          initialTime={initialTime}
          guestMode={guestMode}
          onComplete={() => {
            onComplete?.();
            onOpenChange?.(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
