/**
 * Weekly availability — full-screen route; same editor as diary modal (web parity).
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { PractitionerAvailabilityEditor } from "@/components/practitioner/PractitionerAvailabilityEditor";

export default function PractitionerAvailabilityScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "profile"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Availability
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Working hours and blocked time — same tabs as the web app.
          </Text>
        </View>
      </View>

      <PractitionerAvailabilityEditor showOpenDiaryLink />
    </SafeAreaView>
  );
}
