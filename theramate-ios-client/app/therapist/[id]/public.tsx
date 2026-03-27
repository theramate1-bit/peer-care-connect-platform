import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { fetchPublicTherapistById } from "@/lib/api/guestBooking";
import { SPECIALIZATIONS } from "@/constants/config";

export default function PublicTherapistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [therapist, setTherapist] = React.useState<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    location: string | null;
    bio: string | null;
    therapist_type: string | null;
    specializations: string[] | null;
    hourly_rate: number | null;
    is_verified: boolean | null;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!id) return;
      const { data, error } = await fetchPublicTherapistById(id);
      if (!mounted) return;
      if (error) setError(error.message);
      setTherapist(data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const specLabels =
    therapist?.specializations
      ?.map((s) => SPECIALIZATIONS.find((x) => x.value === s)?.label || s)
      .join(", ") || "General therapy";

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Therapist profile
        </Text>
        {loading ? (
          <Text className="text-charcoal-500 mt-3">Loading…</Text>
        ) : null}
        {error ? <Text className="text-error mt-3">{error}</Text> : null}
        {!loading && !therapist ? (
          <Text className="text-charcoal-500 mt-3">
            This therapist profile is not available.
          </Text>
        ) : null}

        {therapist ? (
          <View className="mt-5 bg-white border border-cream-200 rounded-xl p-4">
            <Text className="text-charcoal-900 text-xl font-semibold">
              {therapist.first_name} {therapist.last_name}
            </Text>
            <Text className="text-charcoal-500 mt-1">{specLabels}</Text>
            {therapist.location ? (
              <Text className="text-charcoal-500 mt-1">
                {therapist.location}
              </Text>
            ) : null}
            {therapist.hourly_rate != null ? (
              <Text className="text-sage-600 font-medium mt-3">
                From GBP {therapist.hourly_rate.toFixed(0)}
              </Text>
            ) : null}
            {therapist.bio ? (
              <Text className="text-charcoal-700 mt-4">{therapist.bio}</Text>
            ) : null}
          </View>
        ) : null}

        {id ? (
          <Button
            variant="primary"
            className="mt-6"
            onPress={() =>
              router.push({
                pathname: "/booking",
                params: { practitionerId: id },
              })
            }
          >
            Book session
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
