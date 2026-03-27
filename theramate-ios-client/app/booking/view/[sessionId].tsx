import React from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { fetchGuestSessionByToken } from "@/lib/api/guestBooking";

export default function GuestBookingViewScreen() {
  const params = useLocalSearchParams<{ sessionId: string; token?: string }>();
  const sessionId = params.sessionId;
  const [token, setToken] = React.useState(
    typeof params.token === "string" ? params.token : "",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<{
    id: string;
    session_date: string | null;
    start_time: string | null;
    duration_minutes: number | null;
    status: string | null;
    payment_status: string | null;
    session_type: string | null;
    appointment_type: string | null;
    visit_address: string | null;
    clinic_address: string | null;
    price: number | null;
  } | null>(null);

  const load = React.useCallback(async () => {
    if (!sessionId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await fetchGuestSessionByToken({
        sessionId,
        token,
      });
      if (e || !data) {
        setError(e?.message || "Could not validate booking link.");
        setSession(null);
        return;
      }
      setSession(data);
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  React.useEffect(() => {
    if (token) void load();
  }, [token, load]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Booking details
        </Text>
        <Text className="text-charcoal-500 mt-2">
          Use the secure token from your confirmation email to view booking
          details.
        </Text>

        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste booking token"
          placeholderTextColor={Colors.charcoal[400]}
          className="mt-5 bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
        />
        <Button
          variant="primary"
          className="mt-4"
          onPress={() => void load()}
          isLoading={loading}
          disabled={!token}
        >
          View booking
        </Button>

        {error ? (
          <View className="bg-errorLight rounded-xl px-4 py-3 mt-3">
            <Text className="text-error text-sm">{error}</Text>
          </View>
        ) : null}

        {session ? (
          <View className="mt-6 bg-white border border-cream-200 rounded-xl p-4">
            <Text className="text-charcoal-900 font-semibold mb-1">
              Session
            </Text>
            <Text className="text-charcoal-700">
              {session.session_date
                ? format(
                    new Date(`${session.session_date}T12:00:00`),
                    "EEEE d MMMM yyyy",
                  )
                : "Unknown date"}{" "}
              {session.start_time ? `at ${session.start_time.slice(0, 5)}` : ""}
            </Text>
            <Text className="text-charcoal-500 mt-1">
              Duration: {session.duration_minutes ?? 0} mins ·{" "}
              {session.session_type || "Session"}
            </Text>
            <Text className="text-charcoal-500 mt-1">
              Status: {session.status || "unknown"} · Payment:{" "}
              {session.payment_status || "unknown"}
            </Text>
            {session.price != null ? (
              <Text className="text-charcoal-900 mt-3 font-medium">
                Price: GBP {(session.price / 100).toFixed(2)}
              </Text>
            ) : null}
            {session.visit_address || session.clinic_address ? (
              <Text className="text-charcoal-600 mt-3">
                Location: {session.visit_address || session.clinic_address}
              </Text>
            ) : null}
            {session.appointment_type ? (
              <Text className="text-charcoal-600 mt-1">
                Type: {session.appointment_type}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
