import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { format } from "date-fns";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyReviews } from "@/lib/api/reviews";
import { PressableCard } from "@/components/ui/Card";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function MyReviewsScreen() {
  const { userId } = useAuth();

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["my_reviews", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchMyReviews(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="My reviews" fallbackHref={defaultSignedInProfileHref()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load reviews."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          className="px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <PressableCard variant="default" padding="md" className="mb-3">
              <Text className="text-charcoal-900 font-semibold">
                {item.therapist_name}
              </Text>
              <View className="flex-row items-center mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={`${item.id}-${n}`}
                    size={16}
                    color={
                      n <= item.rating ? Colors.warning : Colors.charcoal[300]
                    }
                    fill={n <= item.rating ? Colors.warning : "transparent"}
                  />
                ))}
                <Text className="text-charcoal-500 text-xs ml-2">
                  {item.created_at
                    ? format(new Date(item.created_at), "d MMM yyyy")
                    : ""}
                </Text>
              </View>
              {item.comment ? (
                <Text className="text-charcoal-600 mt-2" numberOfLines={4}>
                  {item.comment}
                </Text>
              ) : (
                <Text className="text-charcoal-400 mt-2 italic">
                  No comment left.
                </Text>
              )}
              <Text className="text-charcoal-400 text-xs mt-2">
                Status:{" "}
                {item.review_status === "approved"
                  ? "Published"
                  : item.review_status === "pending"
                    ? "Pending review"
                    : item.review_status}
              </Text>
            </PressableCard>
          )}
          ListEmptyComponent={
            <View className="py-14">
              <Text className="text-charcoal-500 text-center">
                No reviews yet.
              </Text>
              <Text className="text-charcoal-400 text-center text-sm mt-2">
                Complete a session to leave your first review.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
