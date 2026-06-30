import React from "react";
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  CreditCard,
  CircleHelp,
  Lock,
  MapPin,
  Search,
  User,
} from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import {
  getSignedInTabRoot,
  isPractitionerTabRoot,
  signedInTabPath,
} from "@/lib/signedInRoutes";
import { AppStackHeader, AppScreen } from "@/components/navigation";

export default function SettingsRouteScreen() {
  const showPractitionerBilling = isPractitionerTabRoot(getSignedInTabRoot());

  return (
    <AppScreen>
      <AppStackHeader
        title="Settings"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        <Text className="text-charcoal-500 leading-6">
          Shortcuts to account, subscription, privacy, and booking tools. Your
          signed-in area is{" "}
          {getSignedInTabRoot() === "/(practitioner)/(ptabs)"
            ? "the practitioner workspace"
            : "the client app"}
          .
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
            className="mb-2"
            leftIcon={<User size={18} color="#fff" />}
            onPress={() =>
              router.replace(signedInTabPath("profile/settings") as never)
            }
          >
            Profile & account
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            leftIcon={<Bell size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.replace(signedInTabPath("profile/notifications") as never)
            }
          >
            Notification preferences
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            leftIcon={<CircleHelp size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.replace(signedInTabPath("profile/help-centre") as never)
            }
          >
            Help Centre
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            leftIcon={<Lock size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.replace(
                signedInTabPath("profile/privacy-security") as never,
              )
            }
          >
            Privacy & security
          </Button>
          {showPractitionerBilling ? (
            <Button
              variant="outline"
              leftIcon={<CreditCard size={18} color={Colors.sage[600]} />}
              onPress={() => router.push("/settings/subscription" as never)}
            >
              Subscription & billing
            </Button>
          ) : null}
        </Card>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          Bookings & guests
        </Text>
        <Card
          variant="default"
          padding="md"
          className="mb-4 border border-cream-200"
        >
          <Button
            variant="outline"
            className="mb-2"
            leftIcon={<Search size={18} color={Colors.sage[600]} />}
            onPress={() => router.push("/booking/find" as never)}
          >
            Find a booking by email
          </Button>
          <Button
            variant="outline"
            leftIcon={<MapPin size={18} color={Colors.sage[600]} />}
            onPress={() => router.push("/guest/mobile-requests" as never)}
          >
            Guest mobile visit lookup
          </Button>
        </Card>

        <Button
          variant="outline"
          onPress={() => router.replace(getSignedInTabRoot() as never)}
        >
          Back to home
        </Button>
      </ScrollView>
    </AppScreen>
  );
}
