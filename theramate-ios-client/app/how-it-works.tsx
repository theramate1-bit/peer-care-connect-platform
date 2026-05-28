import React from "react";
import { Text, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Calendar,
  ClipboardList,
  MessageCircle,
  Search,
} from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";

export default function HowItWorksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="How it works"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">
          How it works
        </Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Book qualified therapists across the UK — clinic or mobile visits —
          with the same flows on web and mobile.
        </Text>

        <View className="mt-8 gap-6">
          <View>
            <Text className="text-charcoal-900 text-lg font-semibold">
              1. Explore & book
            </Text>
            <Text className="text-charcoal-600 mt-2 text-sm leading-5">
              Search the marketplace, open a profile, and book a clinic slot or
              request a mobile visit. Guests can book with an email; signed-in
              clients see sessions and messages in one place.
            </Text>
          </View>
          <View>
            <Text className="text-charcoal-900 text-lg font-semibold">
              2. Sessions & reviews
            </Text>
            <Text className="text-charcoal-600 mt-2 text-sm leading-5">
              Track upcoming and past appointments under Sessions. Find a
              booking by email if you checked out as a guest. Leave reviews
              after eligible visits.
            </Text>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.push("/booking/find" as never)}
            >
              Find my booking
            </Button>
          </View>
          <View>
            <Text className="text-charcoal-900 text-lg font-semibold">
              3. For practitioners
            </Text>
            <Text className="text-charcoal-600 mt-2 text-sm leading-5">
              Manage diary, mobile requests, care plans, clinical notes,
              treatment exchange, and payouts from your practice workspace on
              web or app.
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          className="mt-10"
          leftIcon={<Search size={18} color="#fff" />}
          onPress={() => router.replace(signedInTabPath("explore") as never)}
        >
          Find therapists
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<Calendar size={18} color={Colors.sage[600]} />}
          onPress={() => router.replace(signedInTabPath("bookings") as never)}
        >
          My sessions
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<MessageCircle size={18} color={Colors.sage[600]} />}
          onPress={() => router.replace(signedInTabPath("messages") as never)}
        >
          Messages
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<ClipboardList size={18} color={Colors.sage[600]} />}
          onPress={() =>
            router.replace(signedInTabPath("profile/treatment-plans") as never)
          }
        >
          Treatment plans
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/pricing" as never)}
        >
          Practitioner plans & fees
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/guest/mobile-requests" as never)}
        >
          Track a mobile request (guest)
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
