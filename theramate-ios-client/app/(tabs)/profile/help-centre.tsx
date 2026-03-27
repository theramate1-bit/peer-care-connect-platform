import React from "react";
import { View, Text, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Mail, CircleHelp } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";

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
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Help Centre
        </Text>
      </View>

      <View className="px-6 pt-4">
        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center">
            <CircleHelp size={18} color={Colors.charcoal[500]} />
            <Text className="text-charcoal-900 font-semibold ml-2">
              Need support?
            </Text>
          </View>
          <Text className="text-charcoal-600 mt-2">
            Browse support articles or contact our team directly.
          </Text>
        </Card>

        <Button
          variant="primary"
          onPress={() => void openUrlOrAlert(APP_CONFIG.HELP_URL)}
        >
          <Text className="text-white font-semibold">Open Help Articles</Text>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() =>
            void openUrlOrAlert(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)
          }
        >
          <View className="flex-row items-center">
            <Mail size={16} color={Colors.charcoal[700]} />
            <Text className="text-charcoal-700 font-medium ml-2">
              Email support
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/how-it-works")}
        >
          <Text className="text-charcoal-700 font-medium">How it works</Text>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/pricing")}
        >
          <Text className="text-charcoal-700 font-medium">Pricing</Text>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/contact")}
        >
          <Text className="text-charcoal-700 font-medium">Contact</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
