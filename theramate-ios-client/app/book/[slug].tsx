import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { fetchPublicTherapistById } from "@/lib/api/guestBooking";
import { signedInTabPath } from "@/lib/signedInRoutes";

export default function DirectBookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!slug) return;
      const { data } = await fetchPublicTherapistById(slug);
      if (!mounted) return;
      if (data) {
        setName(
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            "Therapist",
        );
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-charcoal-900 text-2xl font-bold">
          Direct booking
        </Text>
        {loading ? (
          <Text className="text-charcoal-500 mt-3">Loading booking link…</Text>
        ) : (
          <Text className="text-charcoal-500 mt-3">
            {name
              ? `Booking with ${name}.`
              : "Could not resolve this practitioner in-app."}
          </Text>
        )}

        {slug ? (
          <Button
            variant="primary"
            className="mt-6"
            onPress={() =>
              router.push({
                pathname: "/booking",
                params: { practitionerId: slug },
              })
            }
          >
            Continue to booking
          </Button>
        ) : null}

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push(signedInTabPath("explore") as never)}
        >
          Browse practitioners
        </Button>

        <Button
          variant="outline"
          className="mt-3"
          onPress={() => router.push({ pathname: "/booking/find" })}
        >
          Find an existing booking
        </Button>

        <Text className="text-charcoal-400 text-xs mt-6">
          If this link does not load, use Browse practitioners or contact support
          with your practitioner&apos;s name.
        </Text>
      </View>
    </SafeAreaView>
  );
}
