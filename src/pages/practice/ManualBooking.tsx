import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  Banknote,
  Mail,
  AlertTriangle,
  Info,
} from "lucide-react";

interface KnownClient {
  client_id: string;
  client_name: string;
  client_email: string | null;
  last_session_date: string | null;
}

type Mode = "existing" | "new";

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

/**
 * Manual booking — practitioner schedules a future session directly.
 * v1 scope: pay-at-clinic only (reuses the same guards as client-initiated in-person bookings).
 */
const ManualBooking: React.FC = () => {
  const { user } = useAuth();
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState<boolean | null>(null);
  const [knownClients, setKnownClients] = useState<KnownClient[]>([]);
  const [mode, setMode] = useState<Mode>("existing");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [sessionType, setSessionType] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadPreferences = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingPrefs(true);
      const { data, error } = await supabase
        .from("users")
        .select("accept_in_person_payment")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      setAcceptsInPerson(Boolean(data?.accept_in_person_payment));
    } catch (err) {
      console.error("Could not load payment preferences:", err);
      setAcceptsInPerson(false);
    } finally {
      setLoadingPrefs(false);
    }
  }, [user]);

  const loadClients = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingClients(true);
      /** Distinct clients from this practitioner's past/current sessions. */
      const { data, error } = await supabase
        .from("client_sessions")
        .select("client_id, client_name, client_email, session_date")
        .eq("therapist_id", user.id)
        .not("client_id", "is", null)
        .order("session_date", { ascending: false })
        .limit(500);
      if (error) throw error;

      const seen = new Map<string, KnownClient>();
      for (const row of data || []) {
        if (!row.client_id) continue;
        if (seen.has(row.client_id)) continue;
        seen.set(row.client_id, {
          client_id: row.client_id,
          client_name: (row.client_name || "").trim() || "Client",
          client_email: row.client_email,
          last_session_date: row.session_date,
        });
      }
      setKnownClients([...seen.values()]);
    } catch (err) {
      console.error("Could not load clients:", err);
      toast.error("Could not load client list");
    } finally {
      setLoadingClients(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
    loadClients();
  }, [loadPreferences, loadClients]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return knownClients;
    return knownClients.filter((c) =>
      `${c.client_name} ${c.client_email || ""}`.toLowerCase().includes(q),
    );
  }, [clientSearch, knownClients]);

  const selectedClient = useMemo(
    () => knownClients.find((c) => c.client_id === selectedClientId) || null,
    [knownClients, selectedClientId],
  );

  const validate = (): string | null => {
    if (mode === "existing" && !selectedClientId)
      return "Please select a client.";
    if (mode === "new") {
      if (!newName.trim()) return "Please enter the client\u2019s name.";
      if (!newEmail.trim()) return "Please enter the client\u2019s email.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()))
        return "Please enter a valid email.";
    }
    if (!sessionType.trim()) return "Please enter a session type.";
    if (!sessionDate) return "Please choose a date.";
    if (!startTime) return "Please choose a start time.";
    if (sessionDate < todayIso) return "Date must be today or later.";
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0)
      return "Please enter a valid price.";
    return null;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (acceptsInPerson !== true) {
      toast.error(
        "Enable \u201cAccept in-person payments\u201d in Payment Preferences first.",
      );
      return;
    }

    setSubmitting(true);
    try {
      let clientId: string;
      let clientName: string;
      let clientEmail: string;
      let clientPhone: string | null;
      let isGuest: boolean;

      if (mode === "existing" && selectedClient) {
        clientId = selectedClient.client_id;
        clientName = selectedClient.client_name;
        clientEmail = selectedClient.client_email || "";
        clientPhone = null;
        isGuest = false;
      } else {
        const { data: guestId, error: guestErr } = await supabase.rpc(
          "ensure_guest_user_for_booking",
          { p_email: newEmail.trim(), p_name: newName.trim() || "Guest" },
        );
        if (guestErr) throw guestErr;
        if (!guestId) throw new Error("Could not create guest contact");
        clientId = guestId as string;
        clientName = newName.trim();
        clientEmail = newEmail.trim();
        clientPhone = newPhone.trim() || null;
        isGuest = true;
      }

      const { data: result, error: rpcErr } = await supabase.rpc(
        "create_booking_with_validation",
        {
          p_therapist_id: user.id,
          p_client_id: clientId,
          p_client_name: clientName,
          p_client_email: clientEmail || null,
          p_session_date: sessionDate,
          p_start_time: startTime,
          p_duration_minutes: duration,
          p_session_type: sessionType.trim(),
          p_price: Number(price),
          p_client_phone: clientPhone,
          p_notes: notes.trim() || null,
          p_payment_collection: "in_person",
          p_is_guest_booking: isGuest,
          p_appointment_type: "clinic",
        },
      );

      if (rpcErr) throw rpcErr;
      const payload = result as {
        success?: boolean;
        session_id?: string;
        error_code?: string;
        error_message?: string;
      };
      if (!payload?.success) {
        const code = payload?.error_code;
        const msg =
          code === "CONFLICT_BOOKING"
            ? "That time is already booked or too close to another session."
            : code === "IN_PERSON_NOT_ACCEPTED"
              ? "In-person payments are not enabled on your profile."
              : code === "INVALID_TIME"
                ? "Selected time is outside your working hours."
                : payload?.error_message || "Could not create booking.";
        throw new Error(msg);
      }

      const newSessionId = payload.session_id!;

      if (notifyClient && clientEmail) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              emailType: "booking_confirmation_client",
              recipientEmail: clientEmail,
              recipientName: clientName,
              data: { sessionId: newSessionId },
            },
          });
        } catch (notifyErr) {
          console.warn("Confirmation email failed", notifyErr);
          toast.message(
            "Booking created. Confirmation email could not be sent.",
          );
        }
      }

      toast.success(
        notifyClient && clientEmail
          ? "Manual booking created. Confirmation email sent."
          : "Manual booking created.",
      );

      setSessionType("");
      setSessionDate("");
      setStartTime("");
      setDuration(60);
      setPrice("");
      setNotes("");
      if (mode === "new") {
        setNewName("");
        setNewEmail("");
        setNewPhone("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create booking";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Please log in to create manual bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="New manual booking"
        description="Schedule a pay-at-clinic session for a walk-in or phone booking."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sessions", href: "/practice/upcoming-sessions" },
          { label: "New booking" },
        ]}
        backTo="/practice/upcoming-sessions"
      />

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {!loadingPrefs && acceptsInPerson === false && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">
                  In-person payments are disabled on your profile.
                </p>
                <p className="mt-1">
                  Manual bookings are pay-at-clinic only. Enable the toggle in{" "}
                  <a
                    href="/practice/payment-preferences"
                    className="underline font-medium"
                  >
                    Payment Preferences
                  </a>{" "}
                  to continue.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Client
            </CardTitle>
            <CardDescription>
              Pick an existing client or add a new contact. New contacts receive
              a guest profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("existing")}
              >
                Existing client
              </Button>
              <Button
                type="button"
                variant={mode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("new")}
              >
                New contact
              </Button>
            </div>

            {mode === "existing" ? (
              <div className="space-y-2">
                <Label htmlFor="client-search">Search your clients</Label>
                <Input
                  id="client-search"
                  placeholder="Search by name or email"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <div className="border rounded-md max-h-64 overflow-y-auto">
                  {loadingClients ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Loading clients…
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      {knownClients.length === 0
                        ? "No clients yet. Use \u201cNew contact\u201d to add one."
                        : "No clients match your search."}
                    </div>
                  ) : (
                    filteredClients.slice(0, 100).map((c) => (
                      <button
                        key={c.client_id}
                        type="button"
                        onClick={() => setSelectedClientId(c.client_id)}
                        className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted/50 ${
                          selectedClientId === c.client_id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {c.client_name}
                            </div>
                            {c.client_email && (
                              <div className="text-xs text-muted-foreground">
                                {c.client_email}
                              </div>
                            )}
                          </div>
                          {c.last_session_date && (
                            <Badge variant="outline" className="text-xs">
                              Last: {c.last_session_date}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="new-name">Name *</Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-email">Email *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-phone">Phone (optional)</Label>
                  <Input
                    id="new-phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="07…"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Session details
            </CardTitle>
            <CardDescription>
              All manual bookings are pay-at-clinic. Mark them paid from the
              session list after the appointment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="session-type">Session type *</Label>
              <Input
                id="session-type"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                placeholder="e.g. Sports massage, Initial consultation"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="session-date">Date *</Label>
                <Input
                  id="session-date"
                  type="date"
                  min={todayIso}
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="start-time">Start time *</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 max-w-xs">
              <Label htmlFor="price" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" /> Price (GBP) *
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="60.00"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Visible to you. Helpful for prep or follow-up."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Confirmation email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={(e) => setNotifyClient(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                <span className="font-medium">
                  Send a confirmation email to the client
                </span>
                <span className="block text-muted-foreground text-xs mt-0.5">
                  Includes the session details and a note that payment is due at
                  the appointment.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="border-muted bg-muted/30">
          <CardContent className="pt-6 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">No platform commission</span> is
                charged on pay-at-clinic bookings. Your new session appears in
                your upcoming sessions list immediately.
              </p>
              <p>
                Conflicts, working hours, and session overlaps are checked
                automatically before the booking is saved.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.history.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || acceptsInPerson === false}
            className="gap-1"
          >
            <Clock className="h-4 w-4" />
            {submitting ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualBooking;
