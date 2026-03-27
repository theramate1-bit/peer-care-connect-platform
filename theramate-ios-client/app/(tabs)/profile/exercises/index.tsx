import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Dumbbell, CalendarDays } from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchHomeExercisePrograms,
  fetchProgramCompletionCount,
} from "@/lib/api/exercises";
import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

export default function ExercisesListScreen() {
  const { userId } = useAuth();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["home_exercise_programs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchHomeExercisePrograms(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          My exercises
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
              : "Could not load exercise programs."}
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
            <ProgramCard
              id={item.id}
              title={item.title}
              description={item.description}
              startDate={item.start_date}
              endDate={item.end_date}
              status={item.status}
              exerciseCount={item.exercises.length}
              userId={userId}
            />
          )}
          ListEmptyComponent={
            <View className="py-14 items-center">
              <Dumbbell size={42} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 text-center mt-3">
                No exercise programs yet.
              </Text>
              <Button
                variant="primary"
                className="mt-4"
                onPress={() => router.push("/(tabs)/bookings")}
              >
                <Text className="text-white font-semibold">View sessions</Text>
              </Button>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ProgramCard({
  id,
  title,
  description,
  startDate,
  endDate,
  status,
  exerciseCount,
  userId,
}: {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  exerciseCount: number;
  userId: string | undefined;
}) {
  const { data: completed = 0 } = useQuery({
    queryKey: ["exercise_program_completed_count", userId, id],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await fetchProgramCompletionCount({
        clientId: userId,
        programId: id,
      });
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-3"
      onPress={() => router.push(`/(tabs)/profile/exercises/${id}`)}
    >
      <Text className="text-charcoal-900 font-semibold">{title}</Text>
      {!!description && (
        <Text className="text-charcoal-500 text-sm mt-1" numberOfLines={2}>
          {description}
        </Text>
      )}
      <View className="flex-row items-center mt-2">
        <CalendarDays size={14} color={Colors.charcoal[400]} />
        <Text className="text-charcoal-500 text-sm ml-1">
          {startDate
            ? format(new Date(`${startDate}T12:00:00`), "d MMM yyyy")
            : "Start TBD"}
          {endDate
            ? ` - ${format(new Date(`${endDate}T12:00:00`), "d MMM yyyy")}`
            : ""}
        </Text>
      </View>
      <Text className="text-charcoal-600 text-sm mt-1">
        {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} · {completed}{" "}
        completion
        {completed === 1 ? "" : "s"} · {(status || "active").toLowerCase()}
      </Text>
    </PressableCard>
  );
}
