/**
 * Practitioner detail (from Explore) — opens booking modal next.
 */

import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, MapPin, Star } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { SPECIALIZATIONS } from "@/constants/config";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import { fetchTherapistPublicReviews } from "@/lib/api/reviews";

export default function PractitionerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: practitioners, isLoading } = useMarketplacePractitioners();

  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === id),
    [practitioners, id],
  );

  const specLabels =
    therapist?.specializations
      ?.map((s) => SPECIALIZATIONS.find((spec) => spec.value === s)?.label)
      .filter(Boolean)
      .join(", ") ?? "";

  const openBooking = () => {
    if (!therapist) return;
    if (therapistMode === "hybrid") {
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
    router.push({
      pathname: "/booking",
      params: { practitionerId: therapist.id },
    });
  };

  const openMobileRequest = () => {
    if (!therapist) return;
    router.push({
      pathname: "/booking/mobile-request",
      params: { practitionerId: therapist.id },
    });
  };

  const therapistMode = (therapist?.therapist_type || "").toLowerCase();
  const canBookClinic = therapistMode !== "mobile";
  const canRequestMobile =
    therapistMode === "mobile" || therapistMode === "hybrid";

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

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Profile
        </Text>
      </View>

      {isLoading && !therapist ? (
        <Text className="text-center text-charcoal-500 mt-8">Loading…</Text>
      ) : !therapist ? (
        <Text className="text-center text-charcoal-500 mt-8 px-6">
          Could not load this practitioner. Go back and try again.
        </Text>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="flex-row items-start">
            <Avatar
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
                <Star size={16} color={Colors.warning} fill={Colors.warning} />
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

          {canBookClinic ? (
            <Button variant="primary" className="mt-8" onPress={openBooking}>
              <Text className="text-white font-semibold">
                {therapistMode === "hybrid"
                  ? "Choose booking mode"
                  : "Book at clinic"}
              </Text>
            </Button>
          ) : null}
          {canRequestMobile ? (
            <Button
              variant={canBookClinic ? "outline" : "primary"}
              className={canBookClinic ? "mt-3" : "mt-8"}
              onPress={openMobileRequest}
            >
              <Text
                className={
                  canBookClinic
                    ? "text-charcoal-700 font-semibold"
                    : "text-white font-semibold"
                }
              >
                Request mobile session
              </Text>
            </Button>
          ) : null}
          <Text className="text-charcoal-500 text-sm mt-3">
            {canBookClinic && canRequestMobile
              ? "Choose clinic for in-practice sessions, or mobile for therapist home visits."
              : canRequestMobile
                ? "This practitioner offers mobile visits. Submit a request and hold payment until accepted."
                : "This practitioner offers clinic-based sessions."}
          </Text>

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
                          fill={n <= r.rating ? Colors.warning : "transparent"}
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
