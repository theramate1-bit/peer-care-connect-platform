import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Target,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
} from "lucide-react-native";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { PressableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createGoal,
  fetchGoals,
  updateGoalStatus,
  type GoalItem,
} from "@/lib/api/progress";

function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  const cfg =
    key === "completed"
      ? { bg: "bg-success/10", text: "text-success", label: "Completed" }
      : key === "paused"
        ? { bg: "bg-warning/10", text: "text-warning", label: "Paused" }
        : { bg: "bg-info/10", text: "text-info", label: "Active" };
  return (
    <View className={`px-2 py-1 rounded-full ${cfg.bg}`}>
      <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}

export default function ProgressGoalsScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetValue, setTargetValue] = React.useState("6");
  const [targetUnit, setTargetUnit] = React.useState("sessions");
  const [targetDate, setTargetDate] = React.useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [saving, setSaving] = React.useState(false);

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["progress_goals", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchGoals(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const submitNewGoal = async () => {
    if (!userId) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing details", "Please add a title and description.");
      return;
    }
    const n = Number(targetValue);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid target", "Target value must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const res = await createGoal({
        clientId: userId,
        title,
        description,
        targetValue: n,
        targetUnit,
        targetDate,
      });
      if (!res.ok) {
        Alert.alert(
          "Could not create goal",
          res.error?.message || "Please try again.",
        );
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["progress_goals", userId],
      });
      setCreating(false);
      setTitle("");
      setDescription("");
      setTargetValue("6");
      setTargetUnit("sessions");
      setTargetDate(format(new Date(), "yyyy-MM-dd"));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (
    goal: GoalItem,
    status: "active" | "completed" | "paused",
  ) => {
    if (!userId) return;
    const res = await updateGoalStatus({
      goalId: goal.id,
      clientId: userId,
      status,
    });
    if (!res.ok) {
      Alert.alert(
        "Could not update goal",
        res.error?.message || "Please try again.",
      );
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["progress_goals", userId],
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <Text className="text-charcoal-900 text-lg font-semibold ml-2">
          Progress & goals
        </Text>
      </View>

      <View className="px-6 pt-4">
        <Button variant="primary" onPress={() => setCreating(true)}>
          <Text className="text-white font-semibold">Create new goal</Text>
        </Button>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error ? error.message : "Could not load goals."}
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
              <View className="flex-row items-start justify-between">
                <Text className="text-charcoal-900 font-semibold flex-1 mr-3">
                  {item.goal_title}
                </Text>
                <StatusPill status={item.status} />
              </View>
              <Text className="text-charcoal-600 mt-1">
                {item.goal_description}
              </Text>
              <View className="flex-row items-center mt-2">
                <Target size={14} color={Colors.charcoal[500]} />
                <Text className="text-charcoal-500 text-sm ml-1">
                  Target: {item.target_value} {item.target_unit} by{" "}
                  {format(new Date(item.target_date), "d MMM yyyy")}
                </Text>
              </View>
              <View className="flex-row mt-3">
                <TouchableOpacity
                  onPress={() => void setStatus(item, "active")}
                  className="mr-3 flex-row items-center"
                >
                  <PlayCircle size={16} color={Colors.info} />
                  <Text className="text-info text-sm ml-1">Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void setStatus(item, "paused")}
                  className="mr-3 flex-row items-center"
                >
                  <PauseCircle size={16} color={Colors.warning} />
                  <Text className="text-warning text-sm ml-1">Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void setStatus(item, "completed")}
                  className="flex-row items-center"
                >
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text className="text-success text-sm ml-1">Complete</Text>
                </TouchableOpacity>
              </View>
            </PressableCard>
          )}
          ListEmptyComponent={
            <View className="py-14">
              <Text className="text-charcoal-500 text-center">
                No goals yet.
              </Text>
              <Text className="text-charcoal-400 text-center text-sm mt-2">
                Create your first goal to track progress.
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={creating} animationType="slide" transparent>
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-cream-50 rounded-t-3xl p-6">
            <Text className="text-charcoal-900 text-lg font-semibold mb-4">
              Create goal
            </Text>
            <TextInput
              className="bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900 mb-3"
              placeholder="Goal title"
              placeholderTextColor={Colors.charcoal[300]}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900 mb-3 min-h-[90px]"
              placeholder="What are you aiming for?"
              placeholderTextColor={Colors.charcoal[300]}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            <View className="flex-row">
              <TextInput
                className="flex-1 bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900 mr-2"
                placeholder="Target value"
                placeholderTextColor={Colors.charcoal[300]}
                keyboardType="numeric"
                value={targetValue}
                onChangeText={setTargetValue}
              />
              <TextInput
                className="flex-1 bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900"
                placeholder="Unit"
                placeholderTextColor={Colors.charcoal[300]}
                value={targetUnit}
                onChangeText={setTargetUnit}
              />
            </View>
            <TextInput
              className="bg-white border border-cream-300 rounded-xl p-3 text-charcoal-900 mt-3"
              placeholder="Target date (YYYY-MM-DD)"
              placeholderTextColor={Colors.charcoal[300]}
              value={targetDate}
              onChangeText={setTargetDate}
            />
            <Button
              variant="primary"
              className="mt-5"
              onPress={() => void submitNewGoal()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Save goal</Text>
              )}
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setCreating(false)}
              disabled={saving}
            >
              <Text className="text-charcoal-700 font-medium">Cancel</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
