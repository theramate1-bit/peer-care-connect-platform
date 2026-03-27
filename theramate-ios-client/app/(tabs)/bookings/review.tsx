import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Star } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { fetchClientSessionById } from "@/lib/api/clientSessions";
import { hasSessionReview, submitSessionReview } from "@/lib/api/reviews";

export default function SessionReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const authSession = useAuthStore((s) => s.session);
  const clientId = authSession?.user?.id;
  const queryClient = useQueryClient();

  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    data: sessionData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["review_session", clientId, sessionId],
    queryFn: async () => {
      if (!clientId || !sessionId) return null;
      const { data, error } = await fetchClientSessionById({
        clientId,
        sessionId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!sessionId,
  });

  const { data: existingReview } = useQuery({
    queryKey: ["review_exists", clientId, sessionId],
    queryFn: async () => {
      if (!clientId || !sessionId) return false;
      const { reviewed, error } = await hasSessionReview({
        clientId,
        sessionId,
      });
      if (error) throw error;
      return reviewed;
    },
    enabled: !!clientId && !!sessionId,
  });

  if (!clientId) {
    router.replace("/(auth)/login");
    return null;
  }

  const onSubmit = async () => {
    if (!sessionData?.therapist_id || !sessionId) return;
    setSubmitting(true);
    try {
      const res = await submitSessionReview({
        clientId,
        sessionId,
        therapistId: sessionData.therapist_id,
        rating,
        comment,
        isPublic,
      });
      if (!res.ok) {
        Alert.alert(
          "Could not submit review",
          res.error?.message || "Please try again.",
        );
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["review_exists", clientId, sessionId],
      });
      Alert.alert("Thank you", "Your review has been submitted.");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Leave a review
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load session for review."}
          </Text>
        </View>
      ) : !sessionData ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-500 text-center">
            Session not found.
          </Text>
        </View>
      ) : (sessionData.status || "").toLowerCase() !== "completed" ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-500 text-center">
            Reviews are available after completed sessions.
          </Text>
        </View>
      ) : existingReview ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-700 text-center">
            You already reviewed this session.
          </Text>
          <Button
            variant="outline"
            className="mt-4"
            onPress={() => router.back()}
          >
            <Text className="text-charcoal-700 font-medium">Back</Text>
          </Button>
        </View>
      ) : (
        <View className="flex-1 px-6 pt-4">
          <Card variant="default" padding="md">
            <Text className="text-charcoal-900 font-semibold">
              {sessionData.therapist_name}
            </Text>
            <Text className="text-charcoal-500 text-sm mt-1">
              {sessionData.session_type || "Session"}
            </Text>
          </Card>

          <Text className="text-charcoal-800 font-semibold mt-6 mb-3">
            Your rating
          </Text>
          <View className="flex-row mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                className="mr-2 p-1"
              >
                <Star
                  size={30}
                  color={n <= rating ? Colors.warning : Colors.charcoal[300]}
                  fill={n <= rating ? Colors.warning : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-charcoal-800 font-semibold mb-2">
            Comment (optional)
          </Text>
          <TextInput
            className="bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900 min-h-[120px]"
            multiline
            value={comment}
            onChangeText={setComment}
            placeholder="Share what went well and what could improve."
            placeholderTextColor={Colors.charcoal[300]}
            textAlignVertical="top"
          />

          <TouchableOpacity
            className="flex-row items-center mt-4"
            onPress={() => setIsPublic((v) => !v)}
          >
            <View
              className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                isPublic ? "bg-sage-500 border-sage-500" : "border-charcoal-300"
              }`}
            >
              {isPublic ? <Text className="text-white text-xs">✓</Text> : null}
            </View>
            <Text className="text-charcoal-600">Show this review publicly</Text>
          </TouchableOpacity>

          <Button
            variant="primary"
            className="mt-6"
            onPress={() => void onSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Submit review</Text>
            )}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
