/**
 * Explore/Marketplace Screen
 * Find and browse therapists — data from Supabase (see `lib/api/marketplace.ts`).
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Search, MapPin, Filter, Star, Heart } from "lucide-react-native";

import { AuthBackHeader } from "@/components/AuthBackHeader";
import { MainTabHeader } from "@/components/navigation/AppStackHeader";
import { PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  useFavoriteTherapistIds,
  useToggleFavoriteTherapist,
} from "@/hooks/useFavoriteTherapists";
import { SPECIALIZATIONS } from "@/constants/config";
import type { MarketplacePractitioner } from "@/lib/api/marketplace";
import { formatUnknownError } from "@/lib/errors";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";

function TherapistCard({
  therapist,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
}: {
  therapist: MarketplacePractitioner;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
}) {
  const tabRoot = useTabRoot();
  const specializationLabels = (therapist.specializations || [])
    .map((s) => SPECIALIZATIONS.find((spec) => spec.value === s)?.label)
    .filter(Boolean)
    .join(", ");

  const displayPrice =
    therapist.from_price != null
      ? `From £${therapist.from_price.toFixed(0)}`
      : therapist.hourly_rate != null
        ? `£${therapist.hourly_rate}/hr`
        : "—";

  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={() =>
        router.push(tabPath(tabRoot, `explore/${therapist.id}`) as never)
      }
    >
      <View className="flex-row">
        <Avatar
          source={therapist.profile_photo_url ?? undefined}
          name={`${therapist.first_name} ${therapist.last_name}`}
          size="xl"
          verified={therapist.verified}
        />
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-charcoal-900 font-semibold text-base">
              {therapist.first_name} {therapist.last_name}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onToggleFavorite}
              disabled={favoriteBusy}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? "Remove from saved" : "Save therapist"
              }
            >
              <Heart
                size={20}
                color={isFavorite ? Colors.error : Colors.charcoal[300]}
                fill={isFavorite ? Colors.error : "transparent"}
              />
            </TouchableOpacity>
          </View>

          {!!specializationLabels && (
            <Text className="text-charcoal-500 text-sm mt-0.5">
              {specializationLabels}
            </Text>
          )}

          <View className="flex-row items-center mt-2">
            <Star size={14} color={Colors.warning} fill={Colors.warning} />
            <Text className="text-charcoal-700 text-sm ml-1 font-medium">
              {therapist.average_rating.toFixed(1)}
            </Text>
            <Text className="text-charcoal-400 text-sm ml-1">
              ({therapist.total_reviews} reviews)
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center flex-1 mr-2">
              {therapist.location ? (
                <>
                  <MapPin size={14} color={Colors.charcoal[400]} />
                  <Text
                    className="text-charcoal-500 text-sm ml-1 flex-shrink"
                    numberOfLines={1}
                  >
                    {therapist.location}
                  </Text>
                </>
              ) : (
                <Text className="text-charcoal-400 text-sm">Location TBC</Text>
              )}
            </View>
            <Text className="text-sage-600 font-semibold">{displayPrice}</Text>
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

export default function ExploreScreen() {
  const { isAuthenticated, userId } = useAuth();
  const { data: favoriteIds = [] } = useFavoriteTherapistIds();
  const favoriteMutation = useToggleFavoriteTherapist();
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<
    string | null
  >(null);

  const {
    data: practitioners = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMarketplacePractitioners();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return practitioners.filter((p) => {
      if (selectedSpecialization) {
        const specs = p.specializations || [];
        if (!specs.includes(selectedSpecialization)) return false;
      }
      if (!q) return true;
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const loc = (p.location || "").toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [practitioners, searchQuery, selectedSpecialization]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <MainTabHeader title="Explore" />
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}>
        {!isAuthenticated ? (
          <View className="mb-2 -ml-2">
            <AuthBackHeader
              fallbackHref="/hero"
              label="Home"
              alwaysReplace
            />
          </View>
        ) : null}
        <Text className="text-charcoal-900 text-2xl font-bold mb-4">
          Find therapists
        </Text>

        {!isAuthenticated ? (
          <View className="mb-4 gap-2">
            <TouchableOpacity
              onPress={() => router.push("/login" as never)}
              className="active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Sign in to book and message therapists"
            >
              <Text className="text-sage-600 font-medium text-sm">
                Sign in to book sessions and message therapists →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/register" as never)}
              className="active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Create a Theramate account"
            >
              <Text className="text-charcoal-600 font-medium text-sm">
                New here? Create an account →
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="flex-row items-center bg-white border border-cream-300 rounded-xl px-4 py-3">
          <Search size={20} color={Colors.charcoal[400]} />
          <TextInput
            className="flex-1 ml-3 text-base text-charcoal-900"
            placeholder="Search by name, location..."
            placeholderTextColor={Colors.charcoal[300]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity className="ml-2 p-2 bg-cream-100 rounded-lg">
            <Filter size={18} color={Colors.charcoal[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-6 pb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border ${
              !selectedSpecialization
                ? "bg-sage-500 border-sage-500"
                : "bg-white border-cream-300"
            }`}
            onPress={() => setSelectedSpecialization(null)}
          >
            <Text
              className={`text-sm font-medium ${
                !selectedSpecialization ? "text-white" : "text-charcoal-700"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>

          {SPECIALIZATIONS.map((spec) => (
            <TouchableOpacity
              key={spec.value}
              className={`px-4 py-2 rounded-full border ${
                selectedSpecialization === spec.value
                  ? "bg-sage-500 border-sage-500"
                  : "bg-white border-cream-300"
              }`}
              onPress={() => setSelectedSpecialization(spec.value)}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedSpecialization === spec.value
                    ? "text-white"
                    : "text-charcoal-700"
                }`}
              >
                {spec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          <Text className="text-charcoal-500 mt-4">Loading therapists…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 py-12 items-center">
          <Text className="text-charcoal-700 text-center">
            {formatUnknownError(error)}
          </Text>
          <Text className="text-charcoal-500 text-sm text-center mt-2">
            If this mentions config or “Invalid API key”, copy `theramate-ios-client/.env.example` to `.env` and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.
          </Text>
          <TouchableOpacity
            onPress={() => {
              void refetch();
            }}
            className="mt-6 bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 24 }}>
              <TherapistCard
                therapist={item}
                isFavorite={favoriteSet.has(item.id)}
                favoriteBusy={
                  favoriteMutation.isPending &&
                  favoriteMutation.variables?.therapistId === item.id
                }
                onToggleFavorite={() => {
                  if (!userId) {
                    Alert.alert(
                      "Sign in required",
                      "Create an account or sign in to save therapists.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign in", onPress: () => router.push("/login") },
                      ],
                    );
                    return;
                  }
                  const nextSaved = !favoriteSet.has(item.id);
                  favoriteMutation.mutate(
                    {
                      therapistId: item.id,
                      nextSaved,
                    },
                    {
                      onError: (e) =>
                        Alert.alert(
                          "Could not save",
                          e instanceof Error ? e.message : "Please try again.",
                        ),
                    },
                  );
                }}
              />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          ListHeaderComponent={
            <View className="px-6 pb-3 flex-row items-center justify-between">
              <Text className="text-charcoal-500 text-sm">
                {filtered.length} therapist{filtered.length === 1 ? "" : "s"}
                {searchQuery || selectedSpecialization ? " (filtered)" : ""}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="px-6 py-12">
              <Text className="text-charcoal-500 text-center">
                No therapists match your filters. Try clearing search or
                specialization.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
