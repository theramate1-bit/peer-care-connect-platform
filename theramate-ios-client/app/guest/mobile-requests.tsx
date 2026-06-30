import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { AppScreen, AppStackHeader } from "@/components/navigation";
import {
  fetchGuestMobileRequestsByEmail,
  fetchGuestMobileRequestSessionLink,
  type GuestMobileRequestRow,
} from "@/lib/api/guestMobileRequests";

type CancelResult = {
  success?: boolean;
  error?: string;
  request_id?: string;
};

export default function GuestMobileRequestsScreen() {
  const { requestId: routeRequestId } = useLocalSearchParams<{
    requestId?: string;
  }>();
  const [email, setEmail] = React.useState("");
  const [requestId, setRequestId] = React.useState(
    typeof routeRequestId === "string" ? routeRequestId : "",
  );
  const [requests, setRequests] = React.useState<GuestMobileRequestRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [openingSessionId, setOpeningSessionId] = React.useState<string | null>(
    null,
  );

  const searchRequests = async () => {
    if (!email) return;
    setSearching(true);
    setResult(null);
    try {
      const { data, error } = await fetchGuestMobileRequestsByEmail(email);
      if (error) {
        setResult(error.message || "Could not load requests.");
        return;
      }
      setRequests(data);
      if (data.length === 0) {
        setResult("No mobile requests found for this email.");
      }
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

  const openGuestSession = async (request: GuestMobileRequestRow) => {
    if (!request.session_id) return;
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) {
      Alert.alert("Email required", "Enter your email to view the session.");
      return;
    }

    let token = request.guest_view_token?.trim() || null;
    if (!token) {
      setOpeningSessionId(request.id);
      try {
        const { sessionId, guestViewToken, error } =
          await fetchGuestMobileRequestSessionLink({
            requestId: request.id,
            email: emailNorm,
          });
        if (error || !sessionId) {
          Alert.alert(
            "Could not open session",
            error?.message ||
              "Use the secure link from your confirmation email, or contact support.",
          );
          return;
        }
        token = guestViewToken?.trim() || null;
        if (!token) {
          Alert.alert(
            "Secure link required",
            "Open the booking details link from your confirmation email.",
          );
          return;
        }
        router.push({
          pathname: "/booking/view/[sessionId]",
          params: { sessionId, token },
        });
      } finally {
        setOpeningSessionId(null);
      }
      return;
    }

    router.push({
      pathname: "/booking/view/[sessionId]",
      params: { sessionId: request.session_id, token },
    });
  };

  return (
    <AppScreen>
      <AppStackHeader
        title="Guest mobile requests"
        fallbackHref="/find-therapists"
      />
      <ScrollView
        className="flex-1 px-6 pt-2"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-500">
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
                {r.expires_at &&
                (r.status || "").toLowerCase() === "pending" ? (
                  <Text className="text-warning text-xs mt-1">
                    Expires:{" "}
                    {format(new Date(r.expires_at), "EEE d MMM · HH:mm")}
                  </Text>
                ) : null}
                {r.client_address ? (
                  <Text
                    className="text-charcoal-400 text-xs mt-1"
                    numberOfLines={1}
                  >
                    {r.client_address}
                  </Text>
                ) : null}
                {(r.status || "").toLowerCase() === "accepted" &&
                r.session_id ? (
                  <View className="mt-3">
                    <Button
                      variant="primary"
                      onPress={() => void openGuestSession(r)}
                      isLoading={openingSessionId === r.id}
                      disabled={openingSessionId === r.id}
                    >
                      View session
                    </Button>
                  </View>
                ) : null}
                <Text className="text-sage-600 text-xs mt-2">
                  Tap card to select ID for cancel
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
    </AppScreen>
  );
}
