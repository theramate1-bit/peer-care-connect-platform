import React from "react";
import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function CookiesRouteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Cookies" fallbackHref={defaultSignedInProfileHref()} />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">Preferences</Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Cookie preferences are managed through your app privacy settings.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          onPress={() => router.push("/settings/privacy" as never)}
        >
          Open privacy settings
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
