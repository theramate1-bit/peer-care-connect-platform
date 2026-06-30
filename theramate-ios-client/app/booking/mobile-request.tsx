import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { addDays, format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import {
  createMobileRequestAndOpenCheckout,
  fetchAvailableStartTimes,
  fetchPractitionerProducts,
  type PractitionerProductRow,
} from "@/lib/api/booking";
import { filterMobileBookableProducts } from "@/lib/bookingProducts";
import { canRequestMobile } from "@/lib/booking-flow-type";
import { marketplacePractitionerToBookingFlow } from "@/lib/practitionerBookingProfile";
import { stashMobileCheckoutUrl } from "@/lib/mobileCheckoutUrlCache";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { ensureGuestUserForBooking } from "@/lib/api/guestUser";
import { AppScreen, AppStackHeader } from "@/components/navigation";

export default function MobileRequestBookingScreen() {
  const { practitionerId, guest } = useLocalSearchParams<{
    practitionerId?: string;
    guest?: string;
  }>();
  const isGuestMode = guest === "1" || guest === "true" || guest === "yes";
  const { userId, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: practitioners } = useMarketplacePractitioners();
  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === practitionerId),
    [practitioners, practitionerId],
  );

  const [selectedProduct, setSelectedProduct] =
    useState<PractitionerProductRow | null>(null);
  const [sessionDate, setSessionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [startTime, setStartTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bookingFlowProfile = useMemo(
    () => (therapist ? marketplacePractitionerToBookingFlow(therapist) : null),
    [therapist],
  );

  useEffect(() => {
    if (!practitionerId || !bookingFlowProfile) return;
    if (canRequestMobile(bookingFlowProfile)) return;
    router.replace({
      pathname: "/booking",
      params: { practitionerId },
    });
  }, [practitionerId, bookingFlowProfile]);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: [
      "practitioner_products_mobile",
      practitionerId,
      therapist?.therapist_type,
    ],
    queryFn: async () => {
      if (!practitionerId) return [];
      const { data, error } = await fetchPractitionerProducts(practitionerId);
      if (error) throw error;
      return filterMobileBookableProducts(
        therapist?.therapist_type ?? null,
        data,
      );
    },
    enabled: !!practitionerId && !!therapist,
  });

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

  const { data: availableTimes = [], isLoading: loadingAvailability } =
    useQuery<string[]>({
      queryKey: [
        "availability_mobile",
        practitionerId,
        sessionDate,
        selectedProduct?.id,
        selectedProduct?.duration_minutes,
      ],
      queryFn: async () => {
        if (!practitionerId || !selectedProduct) return [];
        const { data, error } = await fetchAvailableStartTimes({
          practitionerId,
          date: sessionDate,
          durationMinutes: selectedProduct.duration_minutes ?? 60,
        });
        if (error) throw error;
        return data;
      },
      enabled: !!practitionerId && !!selectedProduct,
      refetchInterval: practitionerId && selectedProduct ? 25_000 : false,
      staleTime: 0,
    });

  React.useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(startTime)) {
      setStartTime(availableTimes[0]);
    }
  }, [availableTimes, startTime]);

  const submit = async () => {
    if (!practitionerId || !selectedProduct || !address || !startTime) {
      return;
    }

    let clientId = userId;
    let clientEmail = user?.email ?? "";

    if (!clientId || !clientEmail) {
      if (!isGuestMode) {
        Alert.alert(
          "Sign in required",
          "Sign in to request a mobile visit, or continue as a guest from the booking link.",
        );
        return;
      }
      if (!guestName.trim() || !guestEmail.trim()) {
        Alert.alert(
          "Your details",
          "Name and email are required for guest checkout.",
        );
        return;
      }
      const guestRes = await ensureGuestUserForBooking({
        email: guestEmail,
        name: guestName,
      });
      if (guestRes.error || !guestRes.userId) {
        Alert.alert(
          "Could not continue",
          guestRes.error?.message ?? "Guest profile error",
        );
        return;
      }
      clientId = guestRes.userId;
      clientEmail = guestEmail.trim();
    }

    setSubmitting(true);
    try {
      const geocode = await Location.geocodeAsync(address);
      if (!geocode[0]) {
        Alert.alert(
          "Address required",
          "Could not verify this address. Please refine it and try again.",
        );
        return;
      }
      const result = await createMobileRequestAndOpenCheckout({
        practitionerId,
        clientId,
        clientEmail,
        product: selectedProduct,
        requestedDate: sessionDate,
        requestedStartTime: startTime,
        clientAddress: address,
        clientLatitude: geocode[0].latitude,
        clientLongitude: geocode[0].longitude,
        clientNotes: notes || null,
      });
      if (!result.ok) {
        Alert.alert(
          result.conflict ? "Time unavailable" : "Could not submit request",
          result.error,
        );
        return;
      }

      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: ["client_mobile_requests", userId],
        });
      }
      stashMobileCheckoutUrl(result.requestId, result.checkoutUrl);
      openHostedWebSession({
        kind: "stripe_checkout",
        url: result.checkoutUrl,
        dismissPath: isGuestMode ? "/booking/find" : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppStackHeader title="Mobile visit" />
      <View className="px-6 pb-3 border-b border-cream-200">
        <Text className="text-charcoal-500 text-sm">
          {therapist
            ? `${therapist.first_name} ${therapist.last_name}`
            : "Therapist"}
        </Text>
        <Text className="text-charcoal-400 text-xs mt-2">
          You&apos;ll place a payment hold; the practitioner confirms your visit
          after checkout.
        </Text>
      </View>
      <ScrollView
        className="flex-1 px-6 pt-5"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {!userId && isGuestMode ? (
          <View className="mb-5 p-4 rounded-xl border border-cream-200 bg-white">
            <Text className="text-charcoal-900 font-semibold mb-3">
              Your details
            </Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Full name"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              autoCapitalize="words"
            />
            <TextInput
              value={guestEmail}
              onChangeText={setGuestEmail}
              placeholder="Email"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="Phone (optional)"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
              keyboardType="phone-pad"
            />
            <Button
              variant="outline"
              className="mt-4"
              onPress={() => router.replace("/login" as never)}
            >
              Sign in instead
            </Button>
          </View>
        ) : !userId ? (
          <View className="mb-5 p-4 rounded-xl border border-cream-200 bg-white">
            <Text className="text-charcoal-500 text-sm leading-5">
              Sign in to request a mobile visit and pay in the app.
            </Text>
            <Button
              variant="primary"
              className="mt-4"
              onPress={() => router.replace("/login" as never)}
            >
              Sign in
            </Button>
          </View>
        ) : null}

        <Text className="text-charcoal-800 font-semibold mb-1">Service</Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Mobile or hybrid services only.
        </Text>
        {loadingProducts ? (
          <ActivityIndicator color={Colors.sage[500]} />
        ) : products.length === 0 ? (
          <Text className="text-charcoal-500">
            No mobile services available for this practitioner.
          </Text>
        ) : (
          products.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setSelectedProduct(p)}
              className={`mb-3 p-4 rounded-xl border ${
                selectedProduct?.id === p.id
                  ? "border-sage-500 bg-sage-500/10"
                  : "border-cream-200 bg-white"
              }`}
            >
              <Text className="text-charcoal-900 font-semibold">{p.name}</Text>
              <Text className="text-sage-600 font-medium mt-1">
                {(p.currency || "gbp").toUpperCase()}{" "}
                {(p.price_amount / 100).toFixed(2)} · {p.duration_minutes ?? 60}{" "}
                min
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text className="text-charcoal-800 font-semibold mt-5 mb-1">Date</Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Preferred day for the visit.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-1"
        >
          {dateOptions.map((d) => (
            <TouchableOpacity
              key={d.value}
              onPress={() => setSessionDate(d.value)}
              className={`mr-2 px-4 py-3 rounded-xl border ${
                sessionDate === d.value
                  ? "border-sage-500 bg-sage-500/10"
                  : "border-cream-200 bg-white"
              }`}
            >
              <Text
                className={
                  sessionDate === d.value
                    ? "text-sage-700 font-semibold"
                    : "text-charcoal-700"
                }
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="text-charcoal-800 font-semibold mt-5 mb-1">
          Preferred start time
        </Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Matches practitioner availability for that day.
        </Text>
        {loadingAvailability ? (
          <ActivityIndicator color={Colors.sage[500]} />
        ) : availableTimes.length === 0 ? (
          <Text className="text-charcoal-500">
            No slots for this date. Pick another day or choose a different
            service.
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {availableTimes.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setStartTime(t)}
                className={`px-3 py-2 rounded-lg border ${
                  startTime === t
                    ? "border-sage-500 bg-sage-500/10"
                    : "border-cream-200 bg-white"
                }`}
              >
                <Text
                  className={
                    startTime === t
                      ? "text-sage-700 font-medium"
                      : "text-charcoal-700"
                  }
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text className="text-charcoal-800 font-semibold mt-5 mb-1">
          Visit address
        </Text>
        <Text className="text-charcoal-500 text-sm mb-2">
          Full address so we can verify the location.
        </Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Full address for home visit"
          placeholderTextColor={Colors.charcoal[400]}
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
        />
        <Text className="text-charcoal-800 font-semibold mt-4 mb-2">
          Notes (optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholder="Parking, access, pets, or other details"
          placeholderTextColor={Colors.charcoal[400]}
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mt-3"
        />

        <Button
          variant="primary"
          className="mt-6"
          onPress={() => void submit()}
          isLoading={submitting}
          disabled={
            !selectedProduct ||
            !address ||
            !startTime ||
            availableTimes.length === 0
          }
        >
          Continue to payment
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text className="text-charcoal-700 font-medium">Cancel</Text>
        </Button>
      </ScrollView>
    </AppScreen>
  );
}
