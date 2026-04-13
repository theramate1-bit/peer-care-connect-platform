import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock4, ListChecks } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchHomeExerciseProgramById,
  fetchProgramCompletionCount,
  markExerciseCompleted,
  type ProgramExercise,
} from "@/lib/api/exercises";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function ExerciseProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["home_exercise_program_detail", userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data, error } = await fetchHomeExerciseProgramById({
        clientId: userId,
        programId: id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!id,
  });

  const { data: completedCount = 0 } = useQuery({
    queryKey: ["exercise_program_completed_count", userId, id],
    queryFn: async () => {
      if (!userId || !id) return 0;
      const { count, error } = await fetchProgramCompletionCount({
        clientId: userId,
        programId: id,
      });
      if (error) throw error;
      return count;
    },
    enabled: !!userId && !!id,
  });

  const onMarkDone = async (exercise: ProgramExercise) => {
    if (!userId || !id) return;
    const res = await markExerciseCompleted({
      clientId: userId,
      programId: id,
      exercise,
    });
    if (!res.ok) {
      Alert.alert(
        "Could not mark complete",
        res.error?.message || "Please try again.",
      );
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["exercise_program_completed_count", userId, id],
    });
    Alert.alert("Saved", `${exercise.name} marked as completed.`);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title="Program details" fallbackHref={defaultSignedInProfileHref()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load exercise program."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-500 text-center">
            Program not found.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Card variant="default" padding="lg" className="mb-4">
            <Text className="text-charcoal-900 text-xl font-bold">
              {data.title}
            </Text>
            {!!data.description && (
              <Text className="text-charcoal-600 mt-2">{data.description}</Text>
            )}
            <Text className="text-charcoal-500 mt-2 text-sm">
              {data.start_date
                ? format(new Date(`${data.start_date}T12:00:00`), "d MMM yyyy")
                : "Start TBD"}
              {data.end_date
                ? ` - ${format(new Date(`${data.end_date}T12:00:00`), "d MMM yyyy")}`
                : ""}
            </Text>
            <Text className="text-charcoal-500 text-sm mt-1">
              {completedCount} completion{completedCount === 1 ? "" : "s"}{" "}
              recorded
            </Text>
          </Card>

          {!!data.instructions && (
            <Card variant="default" padding="md" className="mb-4">
              <View className="flex-row items-center mb-2">
                <ListChecks size={16} color={Colors.charcoal[500]} />
                <Text className="text-charcoal-900 font-semibold ml-2">
                  Program instructions
                </Text>
              </View>
              <Text className="text-charcoal-600">{data.instructions}</Text>
            </Card>
          )}

          <Text className="text-charcoal-900 text-lg font-semibold mb-3">
            Exercises
          </Text>
          {data.exercises.length === 0 ? (
            <Text className="text-charcoal-500">
              No exercise items provided for this program.
            </Text>
          ) : (
            data.exercises.map((exercise) => (
              <Card
                key={exercise.id}
                variant="default"
                padding="md"
                className="mb-3"
              >
                <Text className="text-charcoal-900 font-semibold">
                  {exercise.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Clock4 size={14} color={Colors.charcoal[400]} />
                  <Text className="text-charcoal-500 text-sm ml-1">
                    {exercise.sets != null || exercise.reps != null
                      ? `${exercise.sets ?? "-"} sets · ${exercise.reps ?? "-"} reps`
                      : "Custom reps/sets"}
                    {exercise.duration_minutes
                      ? ` · ${exercise.duration_minutes} min`
                      : ""}
                  </Text>
                </View>
                {!!exercise.instructions && (
                  <Text className="text-charcoal-600 text-sm mt-2">
                    {exercise.instructions}
                  </Text>
                )}
                <Button
                  variant="outline"
                  className="mt-3"
                  onPress={() => void onMarkDone(exercise)}
                >
                  <View className="flex-row items-center">
                    <CircleCheck size={16} color={Colors.sage[500]} />
                    <Text className="text-sage-500 font-medium ml-2">
                      Mark completed
                    </Text>
                  </View>
                </Button>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
