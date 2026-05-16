import React from "react";
import { Text, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Calendar,
  ClipboardList,
  MessageCircle,
  Search,
} from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { signedInTabPath } from "@/lib/signedInRoutes";

export default function HowItWorksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="How it works"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-xl font-bold">
          Client portal
        </Text>
        <Text className="text-charcoal-500 mt-3 leading-6">
          Same core journey as the web client experience — on your phone.
        </Text>

        <View className="mt-6 gap-4">
          <View>
            <Text className="text-charcoal-900 font-semibold">
              1. Explore & book
            </Text>
            <Text className="text-charcoal-600 mt-1 text-sm leading-5">
              Search therapists, open a profile, then book a clinic session or
              request a mobile visit. You can also use Home → Quick actions or
              Profile → Saved therapists.
            </Text>
          </View>
          <View>
            <Text className="text-charcoal-900 font-semibold">
              2. Sessions & reviews
            </Text>
            <Text className="text-charcoal-600 mt-1 text-sm leading-5">
              Upcoming and past sessions live under Sessions. Leave a review
              after eligible visits.
            </Text>
          </View>
          <View>
            <Text className="text-charcoal-900 font-semibold">
              3. Messages & plans
            </Text>
            <Text className="text-charcoal-600 mt-1 text-sm leading-5">
              Message your practitioner from Messages. Treatment plans,
              exercises, and progress sit under Profile when your therapist
              shares them.
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          className="mt-8"
          leftIcon={<Search size={18} color="#fff" />}
          onPress={() => router.replace(signedInTabPath("explore") as never)}
        >
          Find therapists
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<Calendar size={18} color={Colors.sage[600]} />}
          onPress={() => router.replace(signedInTabPath("bookings") as never)}
        >
          My sessions
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<MessageCircle size={18} color={Colors.sage[600]} />}
          onPress={() => router.replace(signedInTabPath("messages") as never)}
        >
          Messages
        </Button>
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<ClipboardList size={18} color={Colors.sage[600]} />}
          onPress={() =>
            router.replace(signedInTabPath("profile/treatment-plans") as never)
          }
        >
          Treatment plans
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
