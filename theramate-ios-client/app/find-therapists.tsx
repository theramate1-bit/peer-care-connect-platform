import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mail, MapPin, Search } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { getSignedInTabRoot, signedInTabPath } from "@/lib/signedInRoutes";

export default function FindTherapistsRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Find therapists" fallbackHref={defaultSignedInProfileHref()} />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold text-center">
          Browse & book
        </Text>
        <Text className="text-charcoal-500 text-center mt-3 leading-6">
          Browse verified profiles, read reviews, then open a practitioner to book
          a clinic slot or request a mobile visit.
        </Text>

        <Card variant="elevated" padding="lg" className="mt-8 mb-4">
          <Button
            variant="primary"
            leftIcon={<Search size={20} color="#fff" />}
            onPress={() => router.replace(signedInTabPath("explore") as never)}
          >
            Open Explore
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/how-it-works" as never)}
          >
            How it works
          </Button>
        </Card>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          Already booked?
        </Text>
        <Button
          variant="outline"
          className="mb-3"
          leftIcon={<Mail size={16} color={Colors.sage[600]} />}
          onPress={() => router.push("/booking/find" as never)}
        >
          Find my booking by email
        </Button>
        <Button
          variant="outline"
          className="mb-3"
          leftIcon={<MapPin size={16} color={Colors.sage[600]} />}
          onPress={() => router.push("/guest/mobile-requests" as never)}
        >
          Track a guest mobile visit request
        </Button>

        <Button
          variant="outline"
          onPress={() => router.replace(getSignedInTabRoot() as never)}
        >
          Back to home
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
