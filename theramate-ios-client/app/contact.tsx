import React from "react";
import { Text, ScrollView, Linking } from "react-native";
import { router } from "expo-router";
import { CircleHelp, Mail } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";
import { AppStackHeader, AppScreen } from "@/components/navigation";

export default function ContactScreen() {
  const { userId, isAuthenticated } = useAuth();
  const emailSupport = () => {
    void Linking.openURL(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`);
  };

  return (
    <AppScreen>
      <AppStackHeader
        title="Contact"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">Support</Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Need help with a booking or payment? Contact support directly from the
          app.
        </Text>
        <Text className="text-charcoal-700 mt-4 text-sm">
          Email: {APP_CONFIG.SUPPORT_EMAIL}
        </Text>
        <Button
          variant="primary"
          className="mt-6"
          leftIcon={<Mail size={16} color="#fff" />}
          onPress={emailSupport}
        >
          Email support
        </Button>
        {isAuthenticated && userId ? (
          <Button
            variant="outline"
            className="mt-4"
            leftIcon={<CircleHelp size={16} color={Colors.sage[600]} />}
            onPress={() =>
              router.push(signedInTabPath("profile/help-centre") as never)
            }
          >
            Help Centre (in app)
          </Button>
        ) : (
          <Button
            variant="outline"
            className="mt-4"
            leftIcon={<CircleHelp size={16} color={Colors.sage[600]} />}
            onPress={() => router.push("/help" as never)}
          >
            Help articles
          </Button>
        )}
      </ScrollView>
    </AppScreen>
  );
}
