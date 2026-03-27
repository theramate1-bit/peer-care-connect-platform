import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Car, ChevronLeft } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";

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

  const openClinic = () => {
    if (!pid) return;
    router.replace({
      pathname: "/booking",
      params: { practitionerId: pid },
    });
  };

  const openMobile = () => {
    if (!pid) return;
    router.replace({
      pathname: "/booking/mobile-request",
      params: { practitionerId: pid },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-4 border-b border-cream-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Choose booking mode
        </Text>
      </View>

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

        <TouchableOpacity onPress={openMobile} className="mt-4">
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
                  Enter your address, choose a time window, then pay to hold the
                  request.
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
