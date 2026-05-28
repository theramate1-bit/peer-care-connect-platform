import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { format } from "date-fns";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import {
  findBookingsByEmail,
  type GuestBookingLookupRow,
} from "@/lib/api/guestBooking";

export default function FindBookingScreen() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<GuestBookingLookupRow[]>([]);

  const search = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await findBookingsByEmail(email);
      if (e) {
        setError(e.message || "Could not find bookings right now.");
        return;
      }
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const openSession = (row: GuestBookingLookupRow) => {
    const token = row.guest_view_token?.trim();
    if (!token) {
      Alert.alert(
        "Secure link required",
        "Open the booking details link from your confirmation email, or contact support.",
      );
      return;
    }
    router.push({
      pathname: "/booking/view/[sessionId]",
      params: { sessionId: row.session_id, token },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Find my booking
        </Text>
        <Text className="text-charcoal-500 mt-2">
          Enter the email used at checkout to see recent bookings.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={Colors.charcoal[400]}
          className="mt-5 bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
        />

        {error ? (
          <View className="bg-errorLight rounded-xl px-4 py-3 mt-3">
            <Text className="text-error text-sm">{error}</Text>
          </View>
        ) : null}

        <Button
          variant="primary"
          className="mt-4"
          onPress={() => void search()}
          isLoading={loading}
          disabled={!email.trim()}
        >
          Search bookings
        </Button>

        {results.length > 0 ? (
          <View className="mt-6">
            <Text className="text-charcoal-800 font-semibold mb-2">
              Results
            </Text>
            {results.map((s) => (
              <TouchableOpacity
                key={s.session_id}
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 mb-3"
                onPress={() => openSession(s)}
              >
                <Text className="text-charcoal-900 font-medium">
                  {format(
                    new Date(`${s.session_date}T12:00:00`),
                    "EEE d MMM yyyy",
                  )}{" "}
                  at {s.start_time?.slice(0, 5)}
                </Text>
                {s.practitioner_name ? (
                  <Text className="text-charcoal-500 text-sm mt-1">
                    {s.practitioner_name}
                  </Text>
                ) : null}
                <Text className="text-charcoal-500 text-sm mt-1">
                  Status: {s.status || "unknown"}
                </Text>
                <Text className="text-sage-600 text-sm mt-1">
                  {s.guest_view_token?.trim()
                    ? "View booking"
                    : "Use email link to open"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
