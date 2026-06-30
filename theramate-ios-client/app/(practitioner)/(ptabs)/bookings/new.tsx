/**
 * Manual booking — practitioner schedules a future pay-at-clinic session.
 *
 * v1 scope:
 * - Future sessions only (date >= today)
 * - Existing client (from past sessions) OR a new guest contact (name + email)
 * - Payment collection = in_person (no online charge). Mark-as-Paid flow handles post-session payment.
 * - Optional confirmation email (default on)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";
import {
  Check,
  Banknote,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerClients } from "@/hooks/usePractitionerClients";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "existing" | "new";

export default function ManualBookingScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientIdFromLink = Array.isArray(params.clientId)
    ? params.clientId[0]
    : params.clientId;

  const { data: clientsRaw = [], isLoading: loadingClients } =
    usePractitionerClients(userId);

  /** Manual booking RPC requires a `client_id`; guest-only roster rows are new-contact flow. */
  const clients = useMemo(
    () => clientsRaw.filter((c) => c.client_id),
    [clientsRaw],
  );

  const [mode, setMode] = useState<Mode>("existing");
  const [clientId, setClientId] = useState(clientIdFromLink ?? "");
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    if (clientIdFromLink) {
      setMode("existing");
      setClientId(clientIdFromLink);
    }
  }, [clientIdFromLink]);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [sessionType, setSessionType] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [busy, setBusy] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.email || ""}`.toLowerCase().includes(q),
    );
  }, [clientSearch, clients]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.client_id === clientId) ?? null,
    [clients, clientId],
  );

  const validate = (): string | null => {
    if (mode === "existing" && !clientId) return "Pick a client to continue.";
    if (mode === "new") {
      if (!newName.trim()) return "Enter the client's name.";
      if (!newEmail.trim()) return "Enter the client's email.";
      if (!EMAIL_RE.test(newEmail.trim())) return "Enter a valid email.";
    }
    if (!sessionType.trim()) return "Enter a session type.";
    if (!ISO_DATE_RE.test(sessionDate)) return "Date must be YYYY-MM-DD.";
    if (sessionDate < todayIso) return "Date must be today or later.";
    if (!TIME_RE.test(startTime)) return "Start time must be HH:MM (24h).";
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0)
      return "Enter a valid price.";
    return null;
  };

  const onCreate = async () => {
    if (!userId) return;
    const err = validate();
    if (err) {
      Alert.alert("Check the form", err);
      return;
    }

    setBusy(true);
    try {
      let useClientId: string;
      let useName: string;
      let useEmail: string;
      let usePhone: string | null;
      let isGuest: boolean;

      if (mode === "existing" && selectedClient) {
        const cid = selectedClient.client_id;
        if (!cid) throw new Error("Selected client is missing account id");
        useClientId = cid;
        useName = selectedClient.name;
        useEmail = selectedClient.email || "";
        usePhone = null;
        isGuest = false;
      } else {
        const { data: guestId, error: guestErr } = await supabase.rpc(
          "ensure_guest_user_for_booking",
          { p_email: newEmail.trim(), p_name: newName.trim() || "Guest" },
        );
        if (guestErr) throw guestErr;
        if (!guestId) throw new Error("Could not create guest contact");
        useClientId = guestId as string;
        useName = newName.trim();
        useEmail = newEmail.trim();
        usePhone = newPhone.trim() || null;
        isGuest = true;
      }

      const { data: result, error: rpcErr } = await supabase.rpc(
        "create_booking_with_validation",
        {
          p_therapist_id: userId,
          p_client_id: useClientId,
          p_client_name: useName,
          p_client_email: useEmail || null,
          p_session_date: sessionDate,
          p_start_time: startTime,
          p_duration_minutes: duration,
          p_session_type: sessionType.trim(),
          p_price: Number(price),
          p_client_phone: usePhone,
          p_notes: notes.trim() || null,
          p_payment_collection: "in_person",
          p_is_guest_booking: isGuest,
          p_appointment_type: "clinic",
        } as Record<string, unknown>,
      );

      if (rpcErr) throw rpcErr;
      const payload = (result || {}) as {
        success?: boolean;
        session_id?: string;
        error_code?: string;
        error_message?: string;
      };
      if (!payload.success) {
        const code = payload.error_code;
        const msg =
          code === "CONFLICT_BOOKING"
            ? "That time is already booked or too close to another session."
            : code === "IN_PERSON_NOT_ACCEPTED"
              ? "Enable pay-at-clinic in your payment preferences first."
              : code === "INVALID_TIME"
                ? "Selected time is outside your working hours."
                : payload.error_message || "Could not create booking.";
        throw new Error(msg);
      }

      if (notifyClient && useEmail) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              emailType: "booking_confirmation_client",
              recipientEmail: useEmail,
              recipientName: useName,
              data: { sessionId: payload.session_id },
            },
          });
        } catch (notifyErr) {
          console.warn("Confirmation email failed", notifyErr);
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["practitionerSessions"],
      });

      Alert.alert(
        "Booking created",
        notifyClient && useEmail
          ? "Your session was saved and a confirmation email was sent to the client."
          : "Your session was saved.",
        [
          {
            text: "Done",
            onPress: () => goBackOrReplace(tabPath(tabRoot, "bookings")),
          },
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create booking";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TabScreen>
      <AppStackHeader
        title="New manual booking"
        subtitle="Pay-at-clinic session. Mark as paid after the appointment."
        fallbackHref={tabPath(tabRoot, "bookings")}
      />
      <TabScreenScroll
        className="flex-1 px-6 pt-4"
        extraBottomPadding={48}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 font-semibold mb-2">Client</Text>

        <View className="flex-row bg-cream-100 p-1 rounded-xl mb-3">
          {(["existing", "new"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              className={`flex-1 py-2.5 rounded-lg ${
                mode === m ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setMode(m)}
            >
              <Text
                className={`text-center font-medium ${
                  mode === m ? "text-charcoal-900" : "text-charcoal-500"
                }`}
              >
                {m === "existing" ? "Existing client" : "New contact"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === "existing" ? (
          <>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholder="Search by name or email"
              placeholderTextColor={Colors.charcoal[400]}
              value={clientSearch}
              onChangeText={setClientSearch}
              autoCapitalize="none"
            />
            {loadingClients ? (
              <ActivityIndicator color={Colors.sage[500]} className="my-4" />
            ) : filteredClients.length === 0 ? (
              <Text className="text-charcoal-500 text-sm mb-4">
                {clients.length === 0
                  ? "No clients yet. Use \u201cNew contact\u201d to add one."
                  : "No clients match your search."}
              </Text>
            ) : (
              <View className="mb-4">
                {filteredClients.slice(0, 50).map((c) => {
                  const cid = c.client_id as string;
                  const sel = clientId === cid;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setClientId(cid)}
                      activeOpacity={0.85}
                    >
                      <Card
                        variant={sel ? "elevated" : "default"}
                        padding="md"
                        className="mb-2"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-2">
                            <Text className="text-charcoal-900 font-medium">
                              {c.name}
                            </Text>
                            {c.email ? (
                              <Text className="text-charcoal-500 text-sm mt-1">
                                {c.email}
                              </Text>
                            ) : null}
                          </View>
                          {sel ? (
                            <Check size={22} color={Colors.sage[600]} />
                          ) : null}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View className="mb-4">
            <Text className="text-charcoal-700 text-sm mb-1">Name</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholder="Full name"
              placeholderTextColor={Colors.charcoal[400]}
              value={newName}
              onChangeText={setNewName}
            />
            <Text className="text-charcoal-700 text-sm mb-1">Email</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholder="name@example.com"
              placeholderTextColor={Colors.charcoal[400]}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text className="text-charcoal-700 text-sm mb-1">
              Phone (optional)
            </Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-1"
              placeholder="07…"
              placeholderTextColor={Colors.charcoal[400]}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <Text className="text-charcoal-900 font-semibold mb-2 mt-2">
          Session details
        </Text>

        <Text className="text-charcoal-700 text-sm mb-1">Session type</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
          placeholder="e.g. Sports massage, Initial consult"
          placeholderTextColor={Colors.charcoal[400]}
          value={sessionType}
          onChangeText={setSessionType}
        />

        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <CalendarIcon size={14} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-700 text-sm ml-1">Date</Text>
            </View>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.charcoal[400]}
              value={sessionDate}
              onChangeText={setSessionDate}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Clock size={14} color={Colors.charcoal[500]} />
              <Text className="text-charcoal-700 text-sm ml-1">Start time</Text>
            </View>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
              placeholder="HH:MM"
              placeholderTextColor={Colors.charcoal[400]}
              value={startTime}
              onChangeText={setStartTime}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <Text className="text-charcoal-700 text-sm mb-1">Duration</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {DURATION_OPTIONS.map((d) => {
            const sel = d === duration;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDuration(d)}
                className={`px-4 py-2 rounded-lg border ${
                  sel
                    ? "bg-sage-500 border-sage-500"
                    : "bg-white border-cream-200"
                }`}
              >
                <Text
                  className={`font-medium ${sel ? "text-white" : "text-charcoal-800"}`}
                >
                  {d} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row items-center mb-1">
          <Banknote size={14} color={Colors.charcoal[500]} />
          <Text className="text-charcoal-700 text-sm ml-1">Price (GBP)</Text>
        </View>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
          placeholder="60.00"
          placeholderTextColor={Colors.charcoal[400]}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text className="text-charcoal-700 text-sm mb-1">Notes (optional)</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[80px]"
          placeholderTextColor={Colors.charcoal[400]}
          placeholder="Visible to you only."
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />

        <View className="flex-row items-start justify-between bg-white border border-cream-200 rounded-xl px-4 py-3 mb-5">
          <View className="flex-1 pr-3">
            <Text className="text-charcoal-900 font-medium">
              Send confirmation email
            </Text>
            <Text className="text-charcoal-500 text-xs mt-1">
              Includes session details and a pay-at-clinic note.
            </Text>
          </View>
          <Switch
            value={notifyClient}
            onValueChange={setNotifyClient}
            trackColor={{ false: Colors.charcoal[200], true: Colors.sage[500] }}
          />
        </View>

        <Button
          variant="primary"
          disabled={busy}
          onPress={() => void onCreate()}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Create booking</Text>
          )}
        </Button>

        <Text className="text-charcoal-500 text-xs mt-4 text-center">
          No platform commission on pay-at-clinic bookings.
        </Text>
      </TabScreenScroll>
    </TabScreen>
  );
}
