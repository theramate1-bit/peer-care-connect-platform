/**
 * Weekly availability — full-screen route; same editor as diary modal (web parity).
 */

import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { PractitionerAvailabilityEditor } from "@/components/practitioner/PractitionerAvailabilityEditor";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function PractitionerAvailabilityScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  if (!userId) {
    return (
      <TabScreen>
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Text className="text-charcoal-900 text-xl font-semibold text-center">
            Practitioner sign-in required
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to manage weekly hours and
            scheduler settings.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as never)}
          >
            Create practitioner account
          </Button>
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <AppStackHeader
        title="Availability"
        subtitle="Working hours and blocked time — same tabs as the web app."
        fallbackHref={tabPath(tabRoot, "profile")}
      />
      <PractitionerAvailabilityEditor showOpenDiaryLink />
    </TabScreen>
  );
}
