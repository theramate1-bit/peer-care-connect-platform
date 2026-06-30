import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Car } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import { bookingEligibilityForMarketplacePractitioner } from "@/lib/practitionerBookingProfile";
import { AppScreen, AppStackHeader } from "@/components/navigation";

export default function BookingModeChooserScreen() {
  const { practitionerId, practitionerName } = useLocalSearchParams<{
    practitionerId?: string;
    practitionerName?: string;
  }>();

  const pid = typeof practitionerId === "string" ? practitionerId : "";
  const name =
    typeof practitionerName === "string"
      ? practitionerName
      : "your practitioner";

  const { data: practitioners } = useMarketplacePractitioners();
  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === pid),
    [practitioners, pid],
  );
  const { clinic, mobile } = useMemo(
    () =>
      therapist
        ? bookingEligibilityForMarketplacePractitioner(therapist)
        : { clinic: false, mobile: false },
    [therapist],
  );

  const openClinic = () => {
    if (!pid) return;
    if (!clinic) {
      Alert.alert(
        "Clinic booking unavailable",
        "This practitioner has no clinic bookable services.",
      );
      return;
    }
    router.replace({
      pathname: "/booking",
      params: { practitionerId: pid },
    });
  };

  const openMobile = () => {
    if (!pid) return;
    if (!mobile) {
      Alert.alert(
        "Mobile visits unavailable",
        "This practitioner is not set up for mobile visits.",
      );
      return;
    }
    router.replace({
      pathname: "/booking/mobile-request",
      params: { practitionerId: pid },
    });
  };

  return (
    <AppScreen>
      <AppStackHeader title="Choose booking mode" />
      <View className="px-6 pt-6">
        <Text className="text-charcoal-900 text-2xl font-bold">
          How would you like this session?
        </Text>
        <Text className="text-charcoal-500 text-base mt-2 leading-6">
          Clinic visits are booked to a time slot. Mobile visits start as a
          request, then you complete payment.
        </Text>
        <Text className="text-charcoal-600 text-sm font-medium mt-2">
          With {name}
        </Text>

        {!clinic && !mobile ? (
          <Text className="text-charcoal-500 mt-6">
            Booking is not available for this practitioner right now.
          </Text>
        ) : null}

        {clinic ? (
          <TouchableOpacity
            onPress={openClinic}
            className="mt-7"
            accessibilityRole="button"
          >
            <Card variant="default" padding="lg">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-sage-500/10 items-center justify-center">
                  <Building2 size={22} color={Colors.sage[600]} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-charcoal-900 font-semibold text-base">
                    At the clinic
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1 leading-5">
                    Pick a service, time, and pay — your slot is confirmed when
                    payment succeeds.
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : null}

        {mobile ? (
          <TouchableOpacity
            onPress={openMobile}
            className={clinic ? "mt-4" : "mt-7"}
          >
            <Card variant="default" padding="lg">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-sage-500/10 items-center justify-center">
                  <Car size={22} color={Colors.sage[600]} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-charcoal-900 font-semibold text-base">
                    Mobile / home visit
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1 leading-5">
                    Enter your address, choose a time window, then pay to hold
                    the request.
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : null}
      </View>
    </AppScreen>
  );
}
