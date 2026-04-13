import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Shield, FileText } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";

export function PrivacySecurityContent() {
  const { signOut } = useAuth();

  const signOutEverywhere = async () => {
    Alert.alert(
      "Sign out of this device",
      "You will need to sign in again to continue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Privacy & security" fallbackHref={defaultSignedInProfileHref()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="default" padding="md" className="mb-4">
          <View className="flex-row items-center">
            <Shield size={18} color={Colors.charcoal[500]} />
            <Text className="text-charcoal-900 font-semibold ml-2">
              Account security
            </Text>
          </View>
          <Text className="text-charcoal-600 mt-2">
            Keep your account secure by using a strong password and signing out
            on shared devices.
          </Text>
        </Card>

        <Button variant="outline" onPress={() => void signOutEverywhere()}>
          Sign out on this device
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/settings/privacy" as never)}
        >
          Privacy settings
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/terms")}
        >
          Terms of service
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<FileText size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/cookies")}
        >
          Cookie policy
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
