import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencyFromPence } from "@/lib/utils";
import {
  acceptMobileBookingRequest,
  declineMobileBookingRequest,
  fetchPractitionerMobileRequests,
  type PractitionerMobileRequestRow,
} from "@/lib/practitionerMobileRequests";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: null, label: "All" },
] as const;

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function statusBadge(status: string | null) {
  switch (status) {
    case "accepted":
      return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
    case "declined":
      return <Badge className="bg-gray-100 text-gray-700">Declined</Badge>;
    case "cancelled":
      return <Badge className="bg-gray-100 text-gray-700">Cancelled</Badge>;
    case "expired":
      return <Badge className="bg-gray-100 text-gray-700">Expired</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-900">Pending</Badge>;
  }
}

/**
 * Practitioner mobile request inbox — parity with app `mobile-requests/*`.
 */
export default function PractitionerMobileRequestsInbox() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedId = searchParams.get("requestId") ?? searchParams.get("id");
  const [statusFilter, setStatusFilter] = useState<string | null>("pending");
  const [rows, setRows] = useState<PractitionerMobileRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchPractitionerMobileRequests(
        user.id,
        statusFilter,
      );
      if (error) throw error;
      setRows(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load mobile requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusedId || rows.length === 0) return;
    const el = document.getElementById(
      `practitioner-mobile-request-${focusedId}`,
    );
    if (el) {
      setTimeout(
        () => el.scrollIntoView({ behavior: "smooth", block: "center" }),
        150,
      );
    }
  }, [focusedId, rows]);

  const onAccept = async (req: PractitionerMobileRequestRow) => {
    const pi = req.stripe_payment_intent_id?.trim();
    if (!pi) {
      toast.error("Payment hold missing — cannot accept yet.");
      return;
    }
    if (!window.confirm("Capture payment and create this session?")) return;

    setBusyId(req.id);
    try {
      const res = await acceptMobileBookingRequest({
        requestId: req.id,
        stripePaymentIntentId: pi,
      });
      if (!res.ok) {
        toast.error(res.error || "Could not accept request");
        return;
      }
      toast.success(
        res.transferWarning
          ? `Session created. ${res.transferWarning}`
          : "Request accepted — session created.",
      );
      if (res.sessionId) {
        setSearchParams({ requestId: req.id });
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (req: PractitionerMobileRequestRow) => {
    if (!window.confirm("Release the payment hold and notify the client?"))
      return;

    setBusyId(req.id);
    try {
      const res = await declineMobileBookingRequest({
        requestId: req.id,
        stripePaymentIntentId: req.stripe_payment_intent_id,
        declineReason: declineReason.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error || "Could not decline request");
        return;
      }
      toast.success("Request declined — client will be notified.");
      setDeclineReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Mobile visit requests"
        description="Review pending mobile bookings, capture payment on accept, and release holds on decline."
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

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">
          Loading requests…
        </p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No {statusFilter ?? ""} mobile requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((req) => (
            <Card
              key={req.id}
              id={`practitioner-mobile-request-${req.id}`}
              className={
                focusedId === req.id ? "ring-2 ring-primary/40" : undefined
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      {req.client_name || "Client"}
                    </CardTitle>
                    <CardDescription>
                      {req.product_name} · {req.client_email}
                    </CardDescription>
                  </div>
                  {statusBadge(req.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      When
                    </Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(
                        req.requested_date,
                      ).toLocaleDateString()} at{" "}
                      {formatTime(req.requested_start_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Duration
                    </Label>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {req.duration_minutes ?? "—"} min
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Address
                    </Label>
                    <p className="font-medium flex items-start gap-1">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      {req.client_address || "—"}
                    </p>
                  </div>
                  {req.total_price_pence != null ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Total
                      </Label>
                      <p className="font-medium">
                        {formatCurrencyFromPence(req.total_price_pence)}
                      </p>
                    </div>
                  ) : null}
                  {req.distance_from_base_km != null ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Distance
                      </Label>
                      <p className="font-medium">
                        {req.distance_from_base_km} km
                      </p>
                    </div>
                  ) : null}
                </div>

                {req.client_notes ? (
                  <p className="text-sm text-muted-foreground border-t pt-3">
                    <span className="font-medium text-foreground">Notes: </span>
                    {req.client_notes}
                  </p>
                ) : null}

                {req.status === "pending" ? (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <Label htmlFor={`decline-${req.id}`} className="text-xs">
                        Decline reason (optional)
                      </Label>
                      <Input
                        id={`decline-${req.id}`}
                        className="mt-1"
                        value={focusedId === req.id ? declineReason : ""}
                        onChange={(e) => {
                          setSearchParams({ requestId: req.id });
                          setDeclineReason(e.target.value);
                        }}
                        placeholder="e.g. Not available at this time"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busyId === req.id}
                        onClick={() => void onAccept(req)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busyId === req.id}
                        onClick={() => void onDecline(req)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payment: {req.payment_status || "unknown"}
                      {req.stripe_payment_intent_id
                        ? " · hold active"
                        : " · no PI"}
                    </p>
                  </div>
                ) : req.session_id ? (
                  <p className="text-sm text-muted-foreground border-t pt-3">
                    Session ID:{" "}
                    <code className="text-xs">{req.session_id}</code>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
