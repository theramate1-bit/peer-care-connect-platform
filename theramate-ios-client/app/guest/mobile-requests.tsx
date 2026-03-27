import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type CancelResult = {
  success?: boolean;
  error?: string;
  request_id?: string;
};

type GuestMobileRequest = {
  id: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  total_price_pence: number;
  status: string | null;
  payment_status: string | null;
  client_address: string | null;
  created_at: string | null;
};

export default function GuestMobileRequestsScreen() {
  const [email, setEmail] = React.useState("");
  const [requestId, setRequestId] = React.useState<string>("");
  const [requests, setRequests] = React.useState<GuestMobileRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [searching, setSearching] = React.useState(false);

  const searchRequests = async () => {
    if (!email) return;
    setSearching(true);
    setResult(null);
    try {
      const emailNorm = email.trim().toLowerCase();
      // Use the guest-optimized RPC so this screen works even when table RLS blocks
      // anon reads of `users` / `mobile_booking_requests`.
      const { data, error } = await supabase.rpc(
        "get_guest_mobile_requests_by_email",
        {
          p_email: emailNorm,
        },
      );
      if (error) {
        setResult(error.message || "Could not load requests.");
        return;
      }

      const rows = (data || []) as Array<{
        id: string;
        requested_date: string | null;
        requested_start_time: string | null;
        duration_minutes: number | null;
        total_price_pence: number | null;
        status: string | null;
        payment_status: string | null;
        client_address: string | null;
        created_at: string | null;
      }>;

      setRequests(
        rows.map((r) => ({
          id: r.id,
          requested_date: r.requested_date ?? "",
          requested_start_time: r.requested_start_time ?? "",
          duration_minutes: r.duration_minutes ?? 0,
          total_price_pence: r.total_price_pence ?? 0,
          status: r.status,
          payment_status: r.payment_status,
          client_address: r.client_address,
          created_at: r.created_at,
        })),
      );

      if (!rows || rows.length === 0)
        setResult("No mobile requests found for this email.");
    } finally {
      setSearching(false);
    }
  };

  const cancelRequest = async () => {
    if (!email || !requestId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc(
        "cancel_guest_mobile_request_by_email",
        {
          p_request_id: requestId,
          p_email: email.trim().toLowerCase(),
        },
      );
      if (error) {
        setResult(error.message || "Could not process this request.");
        return;
      }
      const payload = (data || {}) as CancelResult;
      if (!payload.success) {
        setResult(payload.error || "Request not found or already processed.");
        return;
      }
      setResult("Your mobile request has been cancelled.");
      await searchRequests();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Guest mobile requests
        </Text>
        <Text className="text-charcoal-500 mt-2">
          Manage a mobile request using the email and request ID from your
          confirmation message.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email used for booking"
          placeholderTextColor={Colors.charcoal[400]}
          className="mt-5 bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
        />

        <TextInput
          value={requestId}
          onChangeText={setRequestId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Mobile request ID"
          placeholderTextColor={Colors.charcoal[400]}
          className="mt-3 bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
        />

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => void searchRequests()}
          isLoading={searching}
          disabled={!email}
        >
          Find my mobile requests
        </Button>

        <Button
          variant="primary"
          className="mt-4"
          onPress={() => void cancelRequest()}
          isLoading={loading}
          disabled={!email || !requestId}
        >
          Cancel request
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/booking/find")}
        >
          Find my booking instead
        </Button>

        {result ? (
          <View className="mt-4 bg-white border border-cream-200 rounded-xl px-4 py-3">
            <Text className="text-charcoal-700">{result}</Text>
          </View>
        ) : null}

        {requests.length > 0 ? (
          <View className="mt-6">
            <Text className="text-charcoal-800 font-semibold mb-2">
              Your requests
            </Text>
            {requests.map((r) => (
              <TouchableOpacity
                key={r.id}
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 mb-3"
                onPress={() => setRequestId(r.id)}
              >
                <Text className="text-charcoal-900 font-medium">
                  {format(
                    new Date(`${r.requested_date}T12:00:00`),
                    "EEE d MMM yyyy",
                  )}{" "}
                  · {r.requested_start_time.slice(0, 5)}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-1">
                  {r.duration_minutes} min · £
                  {(r.total_price_pence / 100).toFixed(2)}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-1">
                  Status: {r.status || "pending"} · Payment:{" "}
                  {r.payment_status || "pending"}
                </Text>
                {r.client_address ? (
                  <Text
                    className="text-charcoal-400 text-xs mt-1"
                    numberOfLines={1}
                  >
                    {r.client_address}
                  </Text>
                ) : null}
                <Text className="text-sage-600 text-xs mt-2">
                  Tap to select ID for actions
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text className="text-charcoal-400 text-xs mt-6">
          Tip: if you do not have the request ID, contact support from Help
          Centre in the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
