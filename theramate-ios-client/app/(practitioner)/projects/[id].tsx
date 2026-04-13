import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { FolderKanban } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchProjectById,
  fetchProjectPhasesForProject,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  updatePractitionerProject,
  type ProjectPhaseRow,
} from "@/lib/api/practitionerProjects";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

const PHASE_STATUSES = [
  "not_started",
  "in_progress",
  "review",
  "completed",
  "approved",
] as const;

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function PractitionerProjectDetailScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState<(typeof PROJECT_STATUSES)[number]>(
    "planning",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [phaseEditorOpen, setPhaseEditorOpen] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseName, setPhaseName] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [phaseOrder, setPhaseOrder] = useState("");
  const [phaseStatus, setPhaseStatus] =
    useState<(typeof PHASE_STATUSES)[number]>("not_started");
  const [phaseStartDate, setPhaseStartDate] = useState("");
  const [phaseEndDate, setPhaseEndDate] = useState("");
  const [phaseSaving, setPhaseSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["legacy_project", userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data, error } = await fetchProjectById(id, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!id,
  });

  const phasesQuery = useQuery({
    queryKey: ["legacy_project_phases", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await fetchProjectPhasesForProject(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!data,
  });

  const openCreatePhase = () => {
    setEditingPhaseId(null);
    setPhaseName("");
    setPhaseDescription("");
    const nextOrder = (phasesQuery.data?.length ?? 0) + 1;
    setPhaseOrder(String(nextOrder));
    setPhaseStatus("not_started");
    setPhaseStartDate("");
    setPhaseEndDate("");
    setPhaseEditorOpen(true);
  };

  const openEditPhase = (ph: ProjectPhaseRow) => {
    setEditingPhaseId(ph.id);
    setPhaseName(ph.phase_name);
    setPhaseDescription(ph.phase_description ?? "");
    setPhaseOrder(String(ph.phase_order));
    const s = ph.phase_status ?? "not_started";
    setPhaseStatus(
      (PHASE_STATUSES as readonly string[]).includes(s)
        ? (s as (typeof PHASE_STATUSES)[number])
        : "not_started",
    );
    setPhaseStartDate(ph.start_date ?? "");
    setPhaseEndDate(ph.end_date ?? "");
    setPhaseEditorOpen(true);
  };

  const savePhase = async () => {
    if (!id || phaseSaving) return;
    const n = phaseName.trim();
    if (!n) {
      Alert.alert("Phase name required", "Enter a phase name.");
      return;
    }
    const ord = Number(phaseOrder);
    if (!Number.isFinite(ord) || ord <= 0) {
      Alert.alert("Invalid order", "Phase order must be a positive number.");
      return;
    }
    setPhaseSaving(true);
    try {
      if (editingPhaseId) {
        const { error } = await updateProjectPhase(editingPhaseId, {
          phase_name: n,
          phase_description: phaseDescription.trim() || null,
          phase_order: ord,
          phase_status: phaseStatus,
          start_date: phaseStartDate.trim() || null,
          end_date: phaseEndDate.trim() || null,
        });
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      } else {
        const { error } = await createProjectPhase(id, {
          phase_name: n,
          phase_description: phaseDescription.trim() || null,
          phase_order: ord,
          phase_status: phaseStatus,
          start_date: phaseStartDate.trim() || null,
          end_date: phaseEndDate.trim() || null,
        });
        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["legacy_project_phases", id] });
      setPhaseEditorOpen(false);
    } finally {
      setPhaseSaving(false);
    }
  };

  const confirmDeletePhase = (ph: ProjectPhaseRow) => {
    Alert.alert("Delete phase?", ph.phase_name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void (async () => {
            const res = await deleteProjectPhase(ph.id);
            if (!res.ok) {
              Alert.alert("Error", res.error.message);
              return;
            }
            await queryClient.invalidateQueries({
              queryKey: ["legacy_project_phases", id],
            });
          })(),
      },
    ]);
  };

  useEffect(() => {
    if (!data) return;
    setName(data.project_name);
    setDescription(data.project_description ?? "");
    setProjectType(data.project_type);
    const s = data.project_status ?? "planning";
    setStatus(
      (PROJECT_STATUSES as readonly string[]).includes(s)
        ? (s as (typeof PROJECT_STATUSES)[number])
        : "planning",
    );
    setStartDate(data.start_date ?? "");
    setEndDate(data.end_date ?? "");
  }, [data]);

  const onSave = async () => {
    if (!userId || !id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Enter a project name.");
      return;
    }
    setSaving(true);
    try {
      const { data: next, error } = await updatePractitionerProject(
        id,
        userId,
        {
          project_name: trimmed,
          project_description: description.trim() || null,
          project_type: projectType.trim() || "general",
          project_status: status,
          start_date: startDate.trim() || null,
          end_date: endDate.trim() || null,
        },
      );
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (next) {
        await queryClient.invalidateQueries({
          queryKey: ["legacy_project", userId, id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["legacy_projects", userId],
        });
        Alert.alert("Saved", "Project updated.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      {isLoading ? (
        <View className="flex-1 items-center py-20">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : !data ? (
        <Text className="text-charcoal-500 px-6 py-8">Not found.</Text>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <ScreenHeader
            className="-mx-6 -mt-4 mb-2"
            eyebrow="Practice"
            title="Project"
            subtitle="Project details, milestones, and phase tracking."
          />

          <Card variant="elevated" padding="md" className="mb-4">
            <Text className="text-charcoal-600 text-sm">{data.client_name}</Text>
          </Card>

          <Text className="text-charcoal-700 text-sm mb-1">Name</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            value={name}
            onChangeText={setName}
          />

          <Text className="text-charcoal-700 text-sm mb-1">Description</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[100px]"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <Text className="text-charcoal-700 text-sm mb-1">Type</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            placeholder="e.g. treatment, coaching"
            value={projectType}
            onChangeText={setProjectType}
          />

          <Text className="text-charcoal-700 text-sm mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PROJECT_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                className={`px-4 py-2 rounded-full border ${
                  status === s
                    ? "bg-sage-500 border-sage-500"
                    : "bg-white border-cream-200"
                }`}
              >
                <Text
                  className={
                    status === s
                      ? "text-white capitalize"
                      : "text-charcoal-800 capitalize"
                  }
                >
                  {statusLabel(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-charcoal-700 text-sm mb-1">Start date</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-2"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text className="text-charcoal-700 text-sm mb-1">End date</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
          />

          <Button
            variant="primary"
            className="mb-4"
            disabled={saving}
            onPress={() => void onSave()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save changes</Text>
            )}
          </Button>

          <Text className="text-charcoal-900 font-semibold mb-2">Phases</Text>
          <Button variant="outline" className="mb-3" onPress={openCreatePhase}>
            <Text className="text-charcoal-800 font-semibold">Add phase</Text>
          </Button>

          {phaseEditorOpen ? (
            <Card variant="default" padding="md" className="mb-4">
              <Text className="text-charcoal-900 font-semibold mb-3">
                {editingPhaseId ? "Edit phase" : "New phase"}
              </Text>

              <Text className="text-charcoal-700 text-sm mb-1">Name</Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
                value={phaseName}
                onChangeText={setPhaseName}
              />

              <Text className="text-charcoal-700 text-sm mb-1">Description</Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3 min-h-[80px]"
                multiline
                textAlignVertical="top"
                value={phaseDescription}
                onChangeText={setPhaseDescription}
              />

              <Text className="text-charcoal-700 text-sm mb-1">Order</Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
                keyboardType="number-pad"
                value={phaseOrder}
                onChangeText={setPhaseOrder}
              />

              <Text className="text-charcoal-700 text-sm mb-2">Status</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {PHASE_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setPhaseStatus(s)}
                    className={`px-3 py-2 rounded-full border ${
                      phaseStatus === s
                        ? "bg-sage-500 border-sage-500"
                        : "bg-white border-cream-200"
                    }`}
                  >
                    <Text
                      className={
                        phaseStatus === s ? "text-white capitalize" : "text-charcoal-800 capitalize"
                      }
                    >
                      {statusLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-charcoal-700 text-sm mb-1">Start date</Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-2"
                placeholder="YYYY-MM-DD"
                value={phaseStartDate}
                onChangeText={setPhaseStartDate}
              />
              <Text className="text-charcoal-700 text-sm mb-1">End date</Text>
              <TextInput
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
                placeholder="YYYY-MM-DD"
                value={phaseEndDate}
                onChangeText={setPhaseEndDate}
              />

              <Button
                variant="primary"
                className="mb-2"
                disabled={phaseSaving}
                onPress={() => void savePhase()}
              >
                {phaseSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Save phase</Text>
                )}
              </Button>
              <Button
                variant="outline"
                onPress={() => setPhaseEditorOpen(false)}
                disabled={phaseSaving}
              >
                <Text className="text-charcoal-800 font-semibold">Cancel</Text>
              </Button>
            </Card>
          ) : null}

          {phasesQuery.isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color={Colors.sage[500]} />
            </View>
          ) : phasesQuery.data && phasesQuery.data.length > 0 ? (
            <View className="mb-4">
              {phasesQuery.data.map((ph) => (
                <Card
                  key={ph.id}
                  variant="default"
                  padding="md"
                  className="mb-2"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-charcoal-900 font-semibold">
                        {ph.phase_order}. {ph.phase_name}
                      </Text>
                      <Text className="text-charcoal-500 text-sm mt-1 capitalize">
                        {ph.phase_status?.replace(/_/g, " ") ?? "—"}
                      </Text>
                      {ph.phase_description ? (
                        <Text className="text-charcoal-600 text-sm mt-2">
                          {ph.phase_description}
                        </Text>
                      ) : null}
                    </View>
                    <View className="gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => openEditPhase(ph)}
                      >
                        <Text className="text-charcoal-800 font-semibold">Edit</Text>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => confirmDeletePhase(ph)}
                      >
                        <Text className="text-charcoal-800 font-semibold">Delete</Text>
                      </Button>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Text className="text-charcoal-400 text-sm mb-4">
              No phases yet.
            </Text>
          )}

          <Button
            variant="outline"
            className="mt-2"
            onPress={() =>
              router.push(
                tabPath(tabRoot, `clients/${data.client_id}`) as never,
              )
            }
          >
            <Text className="text-charcoal-800 font-semibold">
              Open client record
            </Text>
          </Button>

          <Button
            variant="primary"
            className="mt-3"
            leftIcon={<FolderKanban size={18} color="#fff" />}
            onPress={() =>
              router.push(tabPath(tabRoot, "projects") as never)
            }
          >
            Back to projects
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
