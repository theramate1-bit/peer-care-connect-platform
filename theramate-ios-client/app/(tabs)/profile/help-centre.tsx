import React from "react";
import { View, Text, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mail, CircleHelp, BookOpen } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { defaultSignedInProfileHref } from "@/lib/navigation";

async function openUrlOrAlert(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Cannot open link", url);
    return;
  }
  await Linking.openURL(url);
}

export default function HelpCentreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Help Centre" fallbackHref={defaultSignedInProfileHref()} />

      <View className="px-6 pt-4">
        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center">
            <CircleHelp size={18} color={Colors.charcoal[500]} />
            <Text className="text-charcoal-900 font-semibold ml-2">
              Need support?
            </Text>
          </View>
          <Text className="text-charcoal-600 mt-2">
            Access support options directly in the app and contact the team.
          </Text>
        </Card>

        <Button
          variant="primary"
          onPress={() => router.push("/how-it-works" as never)}
        >
          How it works
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<BookOpen size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/help" as never)}
        >
          Help articles
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<Mail size={16} color={Colors.charcoal[700]} />}
          onPress={() =>
            void openUrlOrAlert(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)
          }
        >
          Email support
        </Button>



        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/pricing" as never)}
        >
          Pricing
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/contact" as never)}
        >
          Contact
        </Button>
      </View>
    </SafeAreaView>
  );
}
