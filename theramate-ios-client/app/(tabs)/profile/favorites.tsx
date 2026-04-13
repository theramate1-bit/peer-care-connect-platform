/**
 * Saved therapists (persisted `favorites` rows).
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MapPin, Star, Heart } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteTherapistIds } from "@/hooks/useFavoriteTherapists";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import { SPECIALIZATIONS } from "@/constants/config";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import type { MarketplacePractitioner } from "@/lib/api/marketplace";

export default function SavedTherapistsScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const {
    data: favoriteIds = [],
    isLoading: loadingIds,
    refetch: refetchFavorites,
  } = useFavoriteTherapistIds();
  const {
    data: practitioners = [],
    isLoading: loadingMarketplace,
    refetch: refetchMarketplace,
  } = useMarketplacePractitioners();
  const [refreshing, setRefreshing] = useState(false);

  const saved = useMemo(() => {
    if (!favoriteIds.length) return [];
    const set = new Set(favoriteIds);
    return practitioners.filter((p) => set.has(p.id));
  }, [favoriteIds, practitioners]);

  const loading = loadingIds || loadingMarketplace;

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await Promise.all([refetchFavorites(), refetchMarketplace()]);
    } finally {
      setRefreshing(false);
    }
  }, [userId, refetchFavorites, refetchMarketplace]);

  const renderItem = ({ item }: { item: MarketplacePractitioner }) => {
    const specializationLabels = (item.specializations || [])
      .map((s) => SPECIALIZATIONS.find((spec) => spec.value === s)?.label)
      .filter(Boolean)
      .join(", ");

    const displayPrice =
      item.from_price != null
        ? `From £${item.from_price.toFixed(0)}`
        : item.hourly_rate != null
          ? `£${item.hourly_rate}/hr`
          : "—";

    return (
      <PressableCard
        variant="default"
        padding="md"
        className="mb-3"
        onPress={() =>
          router.push(tabPath(tabRoot, `explore/${item.id}`) as never)
        }
      >
        <View className="flex-row">
          <Avatar
            source={item.profile_photo_url ?? undefined}
            name={`${item.first_name} ${item.last_name}`}
            size="xl"
            verified={item.verified}
          />
          <View className="flex-1 ml-4">
            <Text className="text-charcoal-900 font-semibold text-base">
              {item.first_name} {item.last_name}
            </Text>
            {!!specializationLabels && (
              <Text className="text-charcoal-500 text-sm mt-0.5">
                {specializationLabels}
              </Text>
            )}
            <View className="flex-row items-center mt-2">
              <Star size={14} color={Colors.warning} fill={Colors.warning} />
              <Text className="text-charcoal-700 text-sm ml-1 font-medium">
                {item.average_rating.toFixed(1)}
              </Text>
              <Text className="text-charcoal-400 text-sm ml-1">
                ({item.total_reviews} reviews)
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center flex-1 mr-2">
                {item.location ? (
                  <>
                    <MapPin size={14} color={Colors.charcoal[400]} />
                    <Text
                      className="text-charcoal-500 text-sm ml-1 flex-shrink"
                      numberOfLines={1}
                    >
                      {item.location}
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
  };

  if (!userId) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
        <AppStackHeader title="Saved therapists" />
        <View className="flex-1 px-6 justify-center items-center">
          <Text className="text-charcoal-600 text-center">
            Sign in to see therapists you have saved.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            className="mt-4 bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Saved therapists" />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.sage[500]}
            />
          }
          ListEmptyComponent={
            <View className="py-12 items-center px-4">
              <Heart
                size={48}
                color={Colors.charcoal[300]}
                style={{ marginBottom: 12 }}
              />
              <Text className="text-charcoal-700 text-center font-medium">
                No saved therapists yet
              </Text>
              <Text className="text-charcoal-500 text-sm text-center mt-2">
                Tap the heart on Explore to save practitioners you want to book
                with later.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push(tabPath(tabRoot, "explore") as never)
                }
                className="mt-6 bg-sage-500 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Browse Explore</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
