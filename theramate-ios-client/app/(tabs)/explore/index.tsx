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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Search, MapPin, Filter, Star, Heart } from "lucide-react-native";

import { PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { SPECIALIZATIONS } from "@/constants/config";
import type { MarketplacePractitioner } from "@/lib/api/marketplace";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";

function TherapistCard({ therapist }: { therapist: MarketplacePractitioner }) {
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
      onPress={() => router.push(`/(tabs)/explore/${therapist.id}`)}
    >
      <View className="flex-row">
        <Avatar
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
            >
              <Heart size={20} color={Colors.charcoal[300]} />
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
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        className="px-6 pt-4 pb-4"
      >
        <Text className="text-charcoal-900 text-2xl font-bold mb-4">
          Find Therapists
        </Text>

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
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
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
      </Animated.View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          <Text className="text-charcoal-500 mt-4">Loading therapists…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 py-12 items-center">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load therapists."}
          </Text>
          <Text className="text-charcoal-500 text-sm text-center mt-2">
            Check `EXPO_PUBLIC_SUPABASE_*` in `.env` and try again.
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
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(300 + index * 50).duration(500)}
              className="px-6"
            >
              <TherapistCard therapist={item} />
            </Animated.View>
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
