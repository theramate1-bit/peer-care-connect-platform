import React from "react";
import { View, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { fetchPublicTherapistBySlugOrId } from "@/lib/api/guestBooking";
import { signedInTabPath } from "@/lib/signedInRoutes";
import { AppScreen, AppStackHeader } from "@/components/navigation";

export default function DirectBookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState<string | null>(null);
  const [practitionerId, setPractitionerId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!slug) return;
      const { data } = await fetchPublicTherapistBySlugOrId(slug);
      if (!mounted) return;
      if (data) {
        setName(
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            "Therapist",
        );
        setPractitionerId(data.id);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <AppScreen>
      <AppStackHeader title="Direct booking" fallbackHref="/find-therapists" />
      <View className="flex-1 px-6 pt-2">
        {loading ? (
          <Text className="text-charcoal-500 mt-3">Loading booking link…</Text>
        ) : (
          <Text className="text-charcoal-500 mt-3">
            {name
              ? `Booking with ${name}.`
              : "Could not resolve this practitioner in-app."}
          </Text>
        )}

        {practitionerId ? (
          <>
            <Button
              variant="primary"
              className="mt-6"
              onPress={() =>
                router.push({
                  pathname: "/booking",
                  params: { practitionerId, guest: "1" },
                })
              }
            >
              Book as guest
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() =>
                router.push({
                  pathname: "/booking",
                  params: { practitionerId },
                })
              }
            >
              Book signed in
            </Button>
          </>
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
          If this link does not load, use Browse practitioners or contact
          support with your practitioner&apos;s name.
        </Text>
      </View>
    </AppScreen>
  );
}
