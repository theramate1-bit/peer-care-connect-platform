import React from "react";
import { View, Text, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Shield, FileText } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";

async function openUrlOrAlert(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Cannot open link", url);
    return;
  }
  await Linking.openURL(url);
}

export default function PrivacySecurityScreen() {
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
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Privacy & Security
        </Text>
      </View>

      <View className="px-6 pt-4">
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
          <Text className="text-charcoal-700 font-medium">
            Sign out on this device
          </Text>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/privacy")}
        >
          <View className="flex-row items-center">
            <FileText size={16} color={Colors.charcoal[700]} />
            <Text className="text-charcoal-700 font-medium ml-2">
              Privacy policy
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/terms")}
        >
          <View className="flex-row items-center">
            <FileText size={16} color={Colors.charcoal[700]} />
            <Text className="text-charcoal-700 font-medium ml-2">
              Terms of service
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push("/cookies")}
        >
          <View className="flex-row items-center">
            <FileText size={16} color={Colors.charcoal[700]} />
            <Text className="text-charcoal-700 font-medium ml-2">
              Cookie policy
            </Text>
          </View>
        </Button>
      </View>
    </SafeAreaView>
  );
}
