import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPractitionerProducts,
  fetchAvailableStartTimes,
  bookSessionAndOpenCheckout,
  type PractitionerProductRow,
} from "@/lib/clientMarketplaceBooking";
import {
  calculatePaymentBreakdown,
  formatCurrency,
  MARKETPLACE_FEE_DISPLAY,
} from "@/config/payments";

type PaymentCollection = "online" | "in_person";

function toYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface BookingFlowProps {
  practitionerId: string;
  practitionerName: string;
  practitionerType: "sports_therapist" | "massage_therapist" | "osteopath";
  acceptInPersonPayment?: boolean;
  guestMode?: boolean;
  onBookingComplete?: (sessionId: string) => void;
  onCancel?: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({
  practitionerId,
  practitionerName,
  practitionerType,
  acceptInPersonPayment = false,
  guestMode = false,
  onBookingComplete,
  onCancel,
}) => {
  const showPaymentChoice = acceptInPersonPayment && !guestMode;
  const totalSteps = showPaymentChoice ? 4 : 3;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<PractitionerProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] =
    useState<PractitionerProductRow | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [paymentCollection, setPaymentCollection] = useState<PaymentCollection>(
    guestMode ? "in_person" : "online",
  );
  const [clientInfo, setClientInfo] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [preAssessment, setPreAssessment] = useState({
    currentIssue: "",
    painLevel: "0",
    mobilityImpact: "",
    goals: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      const { data, error } = await fetchPractitionerProducts(practitionerId, {
        clinicBooking: true,
      });
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error("Failed to load services");
        setProducts([]);
      } else {
        setProducts(data);
      }
      setLoadingProducts(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [practitionerId]);

  const sessionDateStr = selectedDate ? toYyyyMmDd(selectedDate) : "";

  const loadTimes = useCallback(async () => {
    if (!practitionerId || !selectedProduct || !sessionDateStr) {
      setAvailableTimes([]);
      return;
    }
    setLoadingTimes(true);
    try {
      const { data, error } = await fetchAvailableStartTimes({
        practitionerId,
        date: sessionDateStr,
        durationMinutes: selectedProduct.duration_minutes ?? 60,
      });
      if (error) throw error;
      const times = data || [];
      setAvailableTimes(times);
      if (times.length && !times.includes(selectedTime)) {
        setSelectedTime(times[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load available times");
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  }, [practitionerId, selectedProduct, sessionDateStr, selectedTime]);

  useEffect(() => {
    void loadTimes();
  }, [loadTimes]);

  useEffect(() => {
    if (step !== 1 || !practitionerId || !selectedProduct || !sessionDateStr)
      return;
    const id = window.setInterval(() => {
      void loadTimes();
    }, 25_000);
    return () => window.clearInterval(id);
  }, [step, practitionerId, selectedProduct, sessionDateStr, loadTimes]);

  const handleBookingSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedProduct) {
      toast.error("Please complete all required fields");
      return;
    }

    if (guestMode && (!clientInfo.name || !clientInfo.email)) {
      toast.error("Name and email are required");
      return;
    }

    setLoading(true);
    try {
      const dateStr = toYyyyMmDd(selectedDate);
      const duration = selectedProduct.duration_minutes ?? 60;
      const pricePence = selectedProduct.price_amount;
      const pricePounds = Math.round(pricePence) / 100;
      const isInPerson = paymentCollection === "in_person";

      const preBlock = `Pre-assessment
Current issue: ${preAssessment.currentIssue || "Not provided"}
Pain level (0-10): ${preAssessment.painLevel || "0"}
Mobility impact: ${preAssessment.mobilityImpact || "Not provided"}
Goals: ${preAssessment.goals || "Not provided"}`;

      const notesCombined = [clientInfo.notes?.trim(), preBlock]
        .filter(Boolean)
        .join("\n\n");

      let clientId: string;
      let clientName: string;
      let clientEmail: string;
      let isGuestBooking: boolean;

      if (guestMode) {
        const { data: guestId, error: guestError } = await supabase.rpc(
          "ensure_guest_user_for_booking",
          { p_email: clientInfo.email, p_name: clientInfo.name },
        );
        if (guestError) throw guestError;
        if (!guestId) throw new Error("Failed to resolve guest user");
        clientId = guestId as string;
        clientName = clientInfo.name;
        clientEmail = clientInfo.email;
        isGuestBooking = true;
      } else {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("User not authenticated");
        }
        clientId = user.id;
        clientName =
          clientInfo.name || user.user_metadata?.full_name || "Client";
        clientEmail = clientInfo.email || user.email!;
        isGuestBooking = false;
      }

      if (isInPerson) {
        const { data: result, error: rpcError } = await supabase.rpc(
          "create_booking_with_validation",
          {
            p_therapist_id: practitionerId,
            p_client_id: clientId,
            p_client_name: clientName,
            p_client_email: clientEmail,
            p_session_date: dateStr,
            p_start_time: selectedTime,
            p_duration_minutes: duration,
            p_session_type: selectedProduct.name,
            p_price: pricePounds,
            p_client_phone: clientInfo.phone || null,
            p_notes: notesCombined || null,
            p_payment_collection: "in_person",
            p_is_guest_booking: isGuestBooking,
            p_appointment_type: "clinic",
          },
        );

        if (rpcError) throw rpcError;
        const payload = result as {
          success?: boolean;
          session_id?: string;
          error_message?: string;
        };
        if (!payload?.success) {
          throw new Error(payload?.error_message || "Failed to create booking");
        }

        // Pay-at-clinic has no Stripe webhook to fire booking confirmations, so
        // trigger them here. Non-blocking: if the email service is down we
        // still complete the booking and surface a softer notice to the user.
        try {
          await supabase.functions.invoke("send-booking-notification", {
            body: {
              emailType: "confirmation",
              sessionId: payload.session_id,
            },
          });
          toast.success(
            "Booking confirmed! Pay at the clinic on the day of your appointment.",
          );
        } catch (notifyErr) {
          console.warn("Confirmation email failed", notifyErr);
          toast.message(
            "Booking confirmed. Confirmation email could not be sent — check your practitioner dashboard.",
          );
        }
        onBookingComplete?.(payload.session_id!);
      } else {
        const res = await bookSessionAndOpenCheckout({
          therapistId: practitionerId,
          clientId,
          clientName,
          clientEmail,
          clientPhone: clientInfo.phone || null,
          sessionDate: dateStr,
          startTime: selectedTime,
          product: selectedProduct,
          notes: notesCombined || null,
          isGuestBooking,
          practitionerName,
        });

        if (!res.ok) {
          throw new Error(res.error);
        }

        window.location.href = res.checkoutUrl;
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Choose service, date & time
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="service">Service</Label>
            {loadingProducts ? (
              <p className="text-sm text-muted-foreground py-2">
                Loading services…
              </p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No bookable clinic services yet. The practitioner can add
                services under Marketplace.
              </p>
            ) : (
              <Select
                value={selectedProduct?.id ?? ""}
                onValueChange={(id) => {
                  const p = products.find((x) => x.id === id) ?? null;
                  setSelectedProduct(p);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex justify-between items-center gap-4 w-full">
                        <span>{p.name}</span>
                        <Badge variant="secondary">
                          {(p.currency || "gbp").toUpperCase()}{" "}
                          {(p.price_amount / 100).toFixed(2)} ·{" "}
                          {p.duration_minutes ?? 60} min
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Select date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setSelectedTime("");
              }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
              className="rounded-md border"
            />
          </div>

          {selectedDate && selectedProduct && (
            <div>
              <Label htmlFor="time">Available times</Label>
              {loadingTimes ? (
                <p className="text-sm text-muted-foreground py-2">
                  Loading times…
                </p>
              ) : availableTimes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No slots for this day.
                </p>
              ) : (
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {guestMode ? "Your details" : "Your details & pre-assessment"}
        </h3>
        {guestMode && (
          <p className="text-sm text-muted-foreground mb-4">
            No account needed. We&apos;ll send your booking confirmation to the
            email below.
          </p>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">
              Full Name{" "}
              {guestMode && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="name"
              value={clientInfo.name}
              onChange={(e) =>
                setClientInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter your full name"
              required={guestMode}
            />
          </div>

          <div>
            <Label htmlFor="email">
              Email {guestMode && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="email"
              type="email"
              value={clientInfo.email}
              onChange={(e) =>
                setClientInfo((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Enter your email"
              required={guestMode}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={clientInfo.phone}
              onChange={(e) =>
                setClientInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Phone number"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Pre-assessment (optional)</p>
            <div>
              <Label htmlFor="issue">Current issue</Label>
              <Textarea
                id="issue"
                value={preAssessment.currentIssue}
                onChange={(e) =>
                  setPreAssessment((p) => ({
                    ...p,
                    currentIssue: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pain">Pain level (0–10)</Label>
                <Input
                  id="pain"
                  value={preAssessment.painLevel}
                  onChange={(e) =>
                    setPreAssessment((p) => ({
                      ...p,
                      painLevel: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mobility">Mobility impact</Label>
              <Textarea
                id="mobility"
                value={preAssessment.mobilityImpact}
                onChange={(e) =>
                  setPreAssessment((p) => ({
                    ...p,
                    mobilityImpact: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                value={preAssessment.goals}
                onChange={(e) =>
                  setPreAssessment((p) => ({ ...p, goals: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes for practitioner (optional)</Label>
            <Textarea
              id="notes"
              value={clientInfo.notes}
              onChange={(e) =>
                setClientInfo((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Anything else we should know"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentChoice = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">How would you like to pay?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all ${paymentCollection === "online" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setPaymentCollection("online")}
        >
          <CardContent className="pt-6 text-center space-y-2">
            <CreditCard className="h-8 w-8 mx-auto text-primary" />
            <p className="font-semibold">Pay online</p>
            <p className="text-sm text-muted-foreground">
              Secure card payment via Stripe. Platform fee{" "}
              {MARKETPLACE_FEE_DISPLAY} applies.
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${paymentCollection === "in_person" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setPaymentCollection("in_person")}
        >
          <CardContent className="pt-6 text-center space-y-2">
            <Banknote className="h-8 w-8 mx-auto text-primary" />
            <p className="font-semibold">Pay at clinic</p>
            <p className="text-sm text-muted-foreground">
              Cash or card on the day. No platform fee.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSummary = () => {
    const pricePence = selectedProduct?.price_amount ?? 0;
    const currency = (selectedProduct?.currency || "gbp").toLowerCase();
    const paymentBreakdown = selectedProduct
      ? calculatePaymentBreakdown(pricePence)
      : null;
    const isInPerson = paymentCollection === "in_person";
    const duration = selectedProduct?.duration_minutes ?? 60;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Booking summary</h3>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{practitionerName}</span>
                  <Badge variant="outline">
                    {practitionerType.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedDate?.toLocaleDateString()} at {selectedTime}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Duration: {duration} minutes</span>
                </div>

                <div className="flex items-center gap-2">
                  {isInPerson ? (
                    <Banknote className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span>{isInPerson ? "Pay at clinic" : "Pay online"}</span>
                  {guestMode && (
                    <Badge variant="secondary" className="text-xs">
                      Guest booking
                    </Badge>
                  )}
                </div>

                {selectedProduct && paymentBreakdown && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {selectedProduct.name}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(pricePence, currency)}
                      </span>
                    </div>

                    {!isInPerson && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <div className="flex justify-between">
                          <span>Platform fee ({MARKETPLACE_FEE_DISPLAY})</span>
                          <span>
                            {formatCurrency(
                              paymentBreakdown.marketplaceFee,
                              currency,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Practitioner receives</span>
                          <span>
                            {formatCurrency(
                              paymentBreakdown.practitionerPayout,
                              currency,
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {isInPerson && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Payment collected by the practitioner at your
                        appointment.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const summaryStep = showPaymentChoice ? 4 : 3;
  const paymentChoiceStep = showPaymentChoice ? 3 : null;

  const isNextDisabled = () => {
    if (step === 1)
      return (
        !selectedDate ||
        !selectedTime ||
        !selectedProduct ||
        products.length === 0
      );
    if (step === 2) return !clientInfo.name || !clientInfo.email;
    return false;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Book session with {practitionerName}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Step {step} of {totalSteps}
            </span>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {paymentChoiceStep &&
            step === paymentChoiceStep &&
            renderPaymentChoice()}
          {step === summaryStep && renderSummary()}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={step === 1 ? onCancel : () => setStep(step - 1)}
              disabled={loading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            {step < summaryStep ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={isNextDisabled()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleBookingSubmit}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {paymentCollection === "in_person" ? (
                  <>
                    <Banknote className="h-4 w-4" />
                    {loading ? "Confirming…" : "Confirm booking"}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {loading
                      ? "Redirecting to payment…"
                      : "Continue to payment"}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingFlow;
