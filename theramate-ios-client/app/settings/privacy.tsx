import React from "react";
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { Shield } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { signedInTabPath } from "@/lib/signedInRoutes";
import { AppStackHeader, AppScreen } from "@/components/navigation";

export default function SettingsPrivacyRouteScreen() {
  return (
    <AppScreen>
      <AppStackHeader title="Privacy & security" fallbackHref="/settings" />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        <Text className="text-charcoal-500 leading-6">
          Use native privacy controls and legal pages directly in the app.
        </Text>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mt-6 mb-2">
          In this app
        </Text>
        <Card
          variant="default"
          padding="md"
          className="mb-4 border border-cream-200"
        >
          <Button
            variant="primary"
            leftIcon={<Shield size={18} color="#fff" />}
            onPress={() =>
              router.replace(
                signedInTabPath("profile/privacy-security") as never,
              )
            }
          >
            Open privacy & security
          </Button>
        </Card>

        <Card
          variant="default"
          padding="md"
          className="mb-4 border border-cream-200"
        >
          <Button
            variant="outline"
            className="mb-2"
            onPress={() => router.push("/privacy" as never)}
          >
            Privacy policy
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            onPress={() => router.push("/terms" as never)}
          >
            Terms of service
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            onPress={() => router.push("/cookies" as never)}
          >
            Cookie settings
          </Button>
          <Button
            variant="outline"
            onPress={() => router.push("/dpa" as never)}
          >
            Data processing (practitioners)
          </Button>
        </Card>

        <Button
          variant="outline"
          onPress={() => router.replace("/settings" as never)}
        >
          Back to settings hub
        </Button>
      </ScrollView>
    </AppScreen>
  );
}
