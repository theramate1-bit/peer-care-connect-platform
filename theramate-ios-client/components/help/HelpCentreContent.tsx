import React from "react";
import { View, Text, Alert, Linking, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  BookOpen,
  CircleHelp,
  CreditCard,
  Globe,
  Mail,
  Search,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { MARKETPLACE_FEE_DISPLAY } from "@/constants/payments";
import { tabPath, type TabRootHref } from "@/contexts/TabRootContext";
import { signedInTabPath } from "@/lib/signedInRoutes";

async function openUrlOrAlert(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Cannot open link", url);
    return;
  }
  await Linking.openURL(url);
}

type HelpCentreContentProps = {
  tabRoot?: TabRootHref;
  /** When false, hide signed-in-only shortcuts (e.g. from public contact). */
  showAccountShortcuts?: boolean;
};

/**
 * Native help centre body — parity with web `HelpCentre.tsx` + in-app FAQ.
 */
export function HelpCentreContent({
  tabRoot,
  showAccountShortcuts = true,
}: HelpCentreContentProps) {
  const exploreHref = tabRoot
    ? tabPath(tabRoot, "explore")
    : signedInTabPath("explore");

  return (
    <ScrollView
      className="flex-1 px-6 pt-4"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card variant="default" padding="md" className="mb-4">
        <View className="flex-row items-center">
          <CircleHelp size={18} color={Colors.charcoal[500]} />
          <Text className="text-charcoal-900 font-semibold ml-2">
            Need support?
          </Text>
        </View>
        <Text className="text-charcoal-600 mt-2 leading-6">
          Quick answers and links for clients and practitioners — same tasks as
          the web help centre, without leaving the app.
        </Text>
      </Card>

      <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
        Common tasks
      </Text>
      <Card
        variant="default"
        padding="md"
        className="mb-4 border border-cream-200 gap-2"
      >
        <Button
          variant="outline"
          leftIcon={<Search size={16} color={Colors.sage[600]} />}
          onPress={() => router.push(exploreHref as never)}
        >
          Book a therapist (Explore)
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push("/booking/find" as never)}
        >
          Find my booking (guest email)
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push("/guest/mobile-requests" as never)}
        >
          Track a mobile request
        </Button>
        {showAccountShortcuts ? (
          <>
            <Button
              variant="outline"
              leftIcon={<CreditCard size={16} color={Colors.sage[600]} />}
              onPress={() => router.push("/settings/subscription" as never)}
            >
              Subscription & billing
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                router.push(
                  (tabRoot
                    ? tabPath(tabRoot, "profile/payment-methods")
                    : signedInTabPath("profile/payment-methods")) as never,
                )
              }
            >
              Payment methods
            </Button>
          </>
        ) : null}
      </Card>

      <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
        FAQ
      </Text>
      <Card variant="default" padding="md" className="mb-4 gap-4">
        <View>
          <Text className="text-charcoal-900 font-medium">How do I pay?</Text>
          <Text className="text-charcoal-500 mt-1 text-sm leading-5">
            Online card bookings use secure Stripe Checkout in-app. Platform fee
            on card sessions: {MARKETPLACE_FEE_DISPLAY}. Pay-at-clinic bookings
            have no platform fee when your practitioner enables that option.
          </Text>
        </View>
        <View>
          <Text className="text-charcoal-900 font-medium">
            I booked as a guest — where is my session?
          </Text>
          <Text className="text-charcoal-500 mt-1 text-sm leading-5">
            Use Find my booking with the email you used at checkout, or open
            Track a mobile request for home visits.
          </Text>
          <Button
            variant="outline"
            className="mt-2"
            onPress={() => router.push("/booking/find" as never)}
          >
            Find my booking
          </Button>
        </View>
        <View>
          <Text className="text-charcoal-900 font-medium">
            Practitioner support
          </Text>
          <Text className="text-charcoal-500 mt-1 text-sm leading-5">
            Sign in as a practitioner for mobile requests, treatment exchange,
            clinical notes, and payouts. See How it works for the full workflow.
          </Text>
        </View>
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
        Help articles (full guide)
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
        leftIcon={<Globe size={16} color={Colors.charcoal[700]} />}
        onPress={() => router.push("/pricing" as never)}
      >
        Plans & fees
      </Button>

      <Button
        variant="outline"
        className="mt-3"
        onPress={() => router.push("/contact" as never)}
      >
        Contact
      </Button>
    </ScrollView>
  );
}
