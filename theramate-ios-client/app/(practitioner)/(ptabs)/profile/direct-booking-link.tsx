import React from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import * as Clipboard from "expo-clipboard";

import { defaultSignedInProfileHref } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { APP_CONFIG } from "@/constants/config";
import { supabase } from "@/lib/supabase";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function PractitionerDirectBookingLinkScreen() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [copying, setCopying] = React.useState(false);
  const [bookingSlug, setBookingSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("booking_slug")
        .eq("id", userProfile.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        Alert.alert("Could not load booking link", error.message);
        setLoading(false);
        return;
      }
      setBookingSlug(data?.booking_slug ?? null);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userProfile?.id]);

  const directBookingUrl = bookingSlug
    ? `${APP_CONFIG.WEB_URL.replace(/\/$/, "")}/book/${bookingSlug}`
    : "";

  const copyLink = async () => {
    if (!directBookingUrl) {
      Alert.alert(
        "No booking link",
        "Please complete your booking setup first.",
      );
      return;
    }
    setCopying(true);
    try {
      await Clipboard.setStringAsync(directBookingUrl);
      Alert.alert("Copied", "Booking link copied to clipboard.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <TabScreen>
      <AppStackHeader
        title="Direct booking link"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <View className="px-6 pt-4">
        <Card variant="default" padding="md">
          {loading ? (
            <View className="py-6 items-center">
              <ActivityIndicator />
            </View>
          ) : bookingSlug ? (
            <>
              <Text className="text-charcoal-900 font-semibold mb-2">
                Share this link
              </Text>
              <Text className="text-charcoal-600 mb-3">
                Add it to your social bios or website for direct bookings.
              </Text>
              <Text className="text-charcoal-900 text-sm mb-4">
                {directBookingUrl}
              </Text>
              <Button
                variant="outline"
                onPress={() => void copyLink()}
                disabled={copying}
              >
                {copying ? <ActivityIndicator /> : "Copy booking link"}
              </Button>
            </>
          ) : (
            <>
              <Text className="text-charcoal-900 font-semibold mb-2">
                Booking link not ready
              </Text>
              <Text className="text-charcoal-600">
                Your direct booking slug is not set yet. It will appear here
                once configured.
              </Text>
            </>
          )}
        </Card>
      </View>
    </TabScreen>
  );
}
