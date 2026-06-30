/**
 * Practitioner detail (from Explore) — opens booking modal next.
 */

import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateConversation } from "@/lib/api/messages";
import { Heart, MapPin, MessageCircle, Star } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { SPECIALIZATIONS } from "@/constants/config";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import {
  useFavoriteTherapistIds,
  useToggleFavoriteTherapist,
} from "@/hooks/useFavoriteTherapists";
import { fetchTherapistPublicReviews } from "@/lib/api/reviews";
import { bookingEligibilityForMarketplacePractitioner } from "@/lib/practitionerBookingProfile";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
  StickyBottomActionBar,
  STICKY_MULTI_ACTION_BAR_EXTRA,
} from "@/components/navigation";

export default function PractitionerDetailScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: practitioners, isLoading } = useMarketplacePractitioners();
  const { data: favoriteIds = [] } = useFavoriteTherapistIds();
  const favoriteMutation = useToggleFavoriteTherapist();
  const [messageBusy, setMessageBusy] = useState(false);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === id),
    [practitioners, id],
  );

  const specLabels =
    therapist?.specializations
      ?.map((s) => SPECIALIZATIONS.find((spec) => spec.value === s)?.label)
      .filter(Boolean)
      .join(", ") ?? "";

  const bookingEligibility = useMemo(
    () =>
      therapist
        ? bookingEligibilityForMarketplacePractitioner(therapist)
        : { clinic: false, mobile: false },
    [therapist],
  );

  const openMobileRequest = () => {
    if (!therapist) return;
    if (!bookingEligibility.mobile) {
      Alert.alert(
        "Mobile visits unavailable",
        "This practitioner is not set up for mobile visits (check service area and active mobile services).",
      );
      return;
    }
    router.push({
      pathname: "/booking/mobile-request",
      params: { practitionerId: therapist.id },
    });
  };

  const openBooking = () => {
    if (!therapist) return;
    const { clinic, mobile } = bookingEligibility;
    if (!clinic && !mobile) {
      Alert.alert(
        "Booking unavailable",
        "This practitioner has no bookable services set up yet. Try messaging them or choose another practitioner.",
      );
      return;
    }
    if (clinic && mobile) {
      router.push({
        pathname: "/booking/choose-mode",
        params: {
          practitionerId: therapist.id,
          practitionerName:
            `${therapist.first_name} ${therapist.last_name}`.trim(),
        },
      });
      return;
    }
    if (mobile) {
      openMobileRequest();
      return;
    }
    router.push({
      pathname: "/booking",
      params: { practitionerId: therapist.id },
    });
  };

  const onToggleFavorite = () => {
    if (!therapist) return;
    if (!userId) {
      Alert.alert(
        "Sign in required",
        "Create an account or sign in to save therapists.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => router.push("/login") },
        ],
      );
      return;
    }
    const nextSaved = !favoriteSet.has(therapist.id);
    favoriteMutation.mutate(
      { therapistId: therapist.id, nextSaved },
      {
        onError: (e) =>
          Alert.alert(
            "Could not save",
            e instanceof Error ? e.message : "Please try again.",
          ),
      },
    );
  };

  const onMessageTherapist = async () => {
    if (!therapist) return;
    if (!userId) {
      Alert.alert("Sign in required", "Sign in to message this practitioner.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/login") },
      ]);
      return;
    }
    setMessageBusy(true);
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        userId,
        therapist.id,
      );
      if (error || !conversationId) {
        Alert.alert(
          "Could not open chat",
          error?.message ?? "Please try again.",
        );
        return;
      }
      router.push(tabPath(tabRoot, `messages/${conversationId}`) as never);
    } finally {
      setMessageBusy(false);
    }
  };

  const clinicBookingAvailable = bookingEligibility.clinic;
  const mobileBookingAvailable = bookingEligibility.mobile;

  const { data: reviewSnippets = [] } = useQuery({
    queryKey: ["therapist_public_reviews", therapist?.id],
    queryFn: async () => {
      if (!therapist?.id) return [];
      const { data, error } = await fetchTherapistPublicReviews({
        therapistId: therapist.id,
        limit: 3,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!therapist?.id,
  });

  const bookingHint =
    clinicBookingAvailable && mobileBookingAvailable
      ? "Clinic or mobile visits available."
      : mobileBookingAvailable
        ? "Mobile visits — request and pay when accepted."
        : clinicBookingAvailable
          ? "Clinic-based sessions."
          : null;

  return (
    <TabScreen>
      <AppStackHeader
        title="Profile"
        fallbackHref={tabPath(tabRoot, "explore")}
        right={
          therapist ? (
            <TouchableOpacity
              onPress={onToggleFavorite}
              disabled={
                favoriteMutation.isPending &&
                favoriteMutation.variables?.therapistId === therapist.id
              }
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={
                favoriteSet.has(therapist.id)
                  ? "Remove from saved"
                  : "Save therapist"
              }
            >
              <Heart
                size={24}
                color={
                  favoriteSet.has(therapist.id)
                    ? Colors.error
                    : Colors.charcoal[400]
                }
                fill={
                  favoriteSet.has(therapist.id) ? Colors.error : "transparent"
                }
              />
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading && !therapist ? (
        <Text className="text-center text-charcoal-500 mt-8">Loading…</Text>
      ) : !therapist ? (
        <Text className="text-center text-charcoal-500 mt-8 px-6">
          Could not load this practitioner. Go back and try again.
        </Text>
      ) : (
        <View className="flex-1">
          <TabScreenScroll
            className="flex-1 px-6"
            extraBottomPadding={STICKY_MULTI_ACTION_BAR_EXTRA}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row items-start">
              <Avatar
                source={therapist.profile_photo_url ?? undefined}
                name={`${therapist.first_name} ${therapist.last_name}`}
                size="xl"
                verified={therapist.verified}
              />
              <View className="flex-1 ml-4">
                <Text className="text-charcoal-900 text-xl font-bold">
                  {therapist.first_name} {therapist.last_name}
                </Text>
                {!!specLabels && (
                  <Text className="text-charcoal-600 text-sm mt-1">
                    {specLabels}
                  </Text>
                )}
                <View className="flex-row items-center mt-2">
                  <Star
                    size={16}
                    color={Colors.warning}
                    fill={Colors.warning}
                  />
                  <Text className="text-charcoal-700 text-sm ml-1 font-medium">
                    {therapist.average_rating.toFixed(1)}
                  </Text>
                  <Text className="text-charcoal-400 text-sm ml-1">
                    ({therapist.total_reviews} reviews)
                  </Text>
                </View>
                {therapist.location ? (
                  <View className="flex-row items-center mt-2">
                    <MapPin size={14} color={Colors.charcoal[400]} />
                    <Text className="text-charcoal-500 text-sm ml-1">
                      {therapist.location}
                    </Text>
                  </View>
                ) : null}
                <Text className="text-sage-600 font-semibold text-lg mt-3">
                  {therapist.from_price != null
                    ? `From £${therapist.from_price.toFixed(0)}`
                    : therapist.hourly_rate != null
                      ? `£${therapist.hourly_rate}/hr`
                      : ""}
                </Text>
              </View>
            </View>

            {!clinicBookingAvailable && !mobileBookingAvailable ? (
              <Text className="text-charcoal-500 text-sm mt-6">
                Online booking is not available for this profile yet. You can
                still send a message.
              </Text>
            ) : null}

            <View className="mt-8">
              <Text className="text-charcoal-900 text-lg font-semibold mb-3">
                Recent reviews
              </Text>
              {reviewSnippets.length === 0 ? (
                <Text className="text-charcoal-500">
                  No public written reviews yet.
                </Text>
              ) : (
                reviewSnippets.map((r) => (
                  <View
                    key={r.id}
                    className="bg-white border border-cream-200 rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={`${r.id}-${n}`}
                            size={14}
                            color={
                              n <= r.rating
                                ? Colors.warning
                                : Colors.charcoal[300]
                            }
                            fill={
                              n <= r.rating ? Colors.warning : "transparent"
                            }
                          />
                        ))}
                      </View>
                      <Text className="text-charcoal-400 text-xs">
                        {r.created_at
                          ? format(new Date(r.created_at), "d MMM yyyy")
                          : ""}
                      </Text>
                    </View>
                    <Text className="text-charcoal-600 mt-2" numberOfLines={4}>
                      {r.comment}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </TabScreenScroll>

          <StickyBottomActionBar>
            {bookingHint ? (
              <Text className="text-charcoal-500 text-xs mb-3 text-center">
                {bookingHint}
              </Text>
            ) : null}
            {clinicBookingAvailable ? (
              <Button variant="primary" fullWidth onPress={openBooking}>
                {clinicBookingAvailable && mobileBookingAvailable
                  ? "Choose booking mode"
                  : "Book at clinic"}
              </Button>
            ) : null}
            {mobileBookingAvailable ? (
              <Button
                variant={clinicBookingAvailable ? "outline" : "primary"}
                fullWidth
                className={clinicBookingAvailable ? "mt-3" : undefined}
                onPress={openMobileRequest}
              >
                Request mobile session
              </Button>
            ) : null}
            <Button
              variant="outline"
              fullWidth
              className="mt-3"
              onPress={() => void onMessageTherapist()}
              isLoading={messageBusy}
              disabled={messageBusy}
              leftIcon={<MessageCircle size={18} color={Colors.sage[600]} />}
            >
              Message
            </Button>
          </StickyBottomActionBar>
        </View>
      )}
    </TabScreen>
  );
}
