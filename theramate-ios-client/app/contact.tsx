import React from "react";
import { Text, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function ContactScreen() {
  const emailSupport = () => {
    void Linking.openURL(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Contact" fallbackHref={defaultSignedInProfileHref()} />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">Support</Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Need help with a booking or payment? Contact support directly from the app.
        </Text>
        <Button
          variant="primary"
          className="mt-8"
          leftIcon={<Mail size={16} color="#fff" />}
          onPress={emailSupport}
        >
          Email support
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
