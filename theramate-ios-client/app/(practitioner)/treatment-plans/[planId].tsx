import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Paperclip, Trash2, Calendar } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { openHostedWebSession } from "@/lib/openHostedWeb";

import {
  fetchTreatmentPlanById,
  fetchSessionsForTreatmentPlan,
  updateTreatmentPlanRpc,
  jsonbToStringList,
} from "@/lib/api/practitionerTreatmentPlans";
import {
  parseTreatmentPlanAttachments,
  uploadTreatmentPlanAttachment,
  removeTreatmentPlanAttachment,
  getTreatmentPlanAttachmentSignedUrl,
} from "@/lib/api/treatmentPlanAttachments";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

const STATUSES = ["active", "paused", "completed", "cancelled"] as const;

export default function TreatmentPlanDetailScreen() {
  const tabRoot = useTabRoot();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("active");
  const [goalsText, setGoalsText] = useState("");
  const [interventionsText, setInterventionsText] = useState("");
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);

  const planQuery = useQuery({
    queryKey: ["treatment_plan", planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await fetchTreatmentPlanById(planId);
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  const linkedSessionsQuery = useQuery({
    queryKey: ["treatment_plan_linked_sessions", planId, userId],
    queryFn: async () => {
      if (!planId || !userId) return [];
      const { data, error } = await fetchSessionsForTreatmentPlan({
        planId,
        practitionerId: userId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!planId && !!userId,
  });

  const attachments = useMemo(
    () => parseTreatmentPlanAttachments(planQuery.data?.attachments),
    [planQuery.data?.attachments],
  );

  useEffect(() => {
    const p = planQuery.data;
    if (!p) return;
    setTitle(p.title);
    setStatus(p.status);
    setGoalsText(jsonbToStringList(p.goals).join("\n"));
    setInterventionsText(jsonbToStringList(p.interventions).join("\n"));
    setClinicianNotes(p.clinician_notes ?? "");
  }, [planQuery.data]);

  const onSave = async () => {
    if (!planId) return;
    const goals = goalsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const interventions = interventionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const res = await updateTreatmentPlanRpc({
        planId,
        patch: {
          title: title.trim(),
          status,
          goals,
          interventions,
          clinician_notes: clinicianNotes.trim() || null,
        },
      });
      if (!res.ok) {
        Alert.alert("Error", res.error?.message || "Update failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["treatment_plans"] });
      await queryClient.invalidateQueries({ queryKey: ["treatment_plan", planId] });
      await queryClient.invalidateQueries({
        queryKey: ["treatment_plan_linked_sessions", planId],
      });
      Alert.alert("Saved", "Care plan updated.");
    } finally {
      setSaving(false);
    }
  };

  const onPickAttachment = async () => {
    if (!userId || !planId || attachBusy) return;
    let pick: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      pick = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "File picker not available",
        msg.includes("native module") || msg.includes("NativeModule")
          ? "Run a fresh native build: cd theramate-ios-client/ios && pod install, then rebuild in Xcode or `npx expo run:ios`. The document picker is included after pods link ExpoDocumentPicker."
          : msg,
      );
      return;
    }
    if (pick.canceled || !pick.assets?.length) return;
    const a = pick.assets[0];
    setAttachBusy(true);
    try {
      const res = await uploadTreatmentPlanAttachment({
        planId,
        practitionerId: userId,
        fileUri: a.uri,
        fileName: a.name,
        mimeType: a.mimeType ?? null,
      });
      if (!res.ok) {
        Alert.alert("Upload failed", res.error?.message ?? "Try again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["treatment_plan", planId] });
    } finally {
      setAttachBusy(false);
    }
  };

  const onOpenAttachment = async (objectPath: string) => {
    const { url, error } = await getTreatmentPlanAttachmentSignedUrl(objectPath);
    if (error || !url) {
      Alert.alert("Could not open file", error?.message ?? "");
      return;
    }
    openHostedWebSession({ kind: "signed_document", url });
  };

  const onRemoveAttachment = (objectPath: string, label: string) => {
    if (!userId || !planId) return;
    Alert.alert("Remove attachment?", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void (async () => {
          setAttachBusy(true);
          try {
            const res = await removeTreatmentPlanAttachment({
              planId,
              practitionerId: userId,
              objectPath,
            });
            if (!res.ok) {
              Alert.alert("Error", res.error?.message ?? "");
              return;
            }
            await queryClient.invalidateQueries({
              queryKey: ["treatment_plan", planId],
            });
          } finally {
            setAttachBusy(false);
          }
        })(),
      },
    ]);
  };

  if (planQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color={Colors.sage[500]} />
      </SafeAreaView>
    );
  }

  if (!planQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 px-6 pt-10">
        <Text className="text-charcoal-600">Plan not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Practice"
          title="Edit care plan"
          subtitle="Care plan details, linked sessions, and attachments."
        />

        <Text className="text-charcoal-700 text-sm mb-1">Title</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
          value={title}
          onChangeText={setTitle}
        />

        <Text className="text-charcoal-700 text-sm mb-2">Status</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {STATUSES.map((s) => (
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
                className={status === s ? "text-white capitalize" : "text-charcoal-800 capitalize"}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-charcoal-700 text-sm mb-1">Goals (one per line)</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[120px]"
          multiline
          textAlignVertical="top"
          value={goalsText}
          onChangeText={setGoalsText}
        />

        <Text className="text-charcoal-700 text-sm mb-1">
          Interventions (one per line)
        </Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[120px]"
          multiline
          textAlignVertical="top"
          value={interventionsText}
          onChangeText={setInterventionsText}
        />

        <Text className="text-charcoal-700 text-sm mb-1">Clinician notes</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[100px]"
          multiline
          textAlignVertical="top"
          value={clinicianNotes}
          onChangeText={setClinicianNotes}
        />

        <Card variant="default" padding="md" className="mb-6">
          <Text className="text-charcoal-900 font-semibold mb-1">
            Files & attachments
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            Upload PDFs or other documents. Files are private; open uses a
            short-lived secure link.
          </Text>
          <Button
            variant="primary"
            className="mb-3"
            disabled={attachBusy}
            leftIcon={<Paperclip size={18} color="#fff" />}
            onPress={() => void onPickAttachment()}
          >
            {attachBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Add file</Text>
            )}
          </Button>
          {attachments.length === 0 ? (
            <Text className="text-charcoal-400 text-sm mb-3">No files yet.</Text>
          ) : (
            <View className="mb-3">
              {attachments.map((att) => (
                <View
                  key={att.path}
                  className="flex-row items-center justify-between border-t border-cream-200 pt-3 mt-2"
                >
                  <TouchableOpacity
                    className="flex-1 pr-2"
                    onPress={() => void onOpenAttachment(att.path)}
                    disabled={attachBusy}
                  >
                    <Text
                      className="text-charcoal-900 font-medium"
                      numberOfLines={1}
                    >
                      {att.name}
                    </Text>
                    {att.uploaded_at ? (
                      <Text className="text-charcoal-400 text-xs mt-0.5">
                        Tap to open
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onRemoveAttachment(att.path, att.name)}
                    disabled={attachBusy}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <Button
            variant="outline"
            leftIcon={<Calendar size={16} color={Colors.sage[600]} />}
            onPress={() =>
              router.push(tabPath(tabRoot, "bookings") as never)
            }
          >
            Sessions
          </Button>
        </Card>

        <Text className="text-charcoal-900 font-semibold mb-2">
          Linked sessions
        </Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Sessions attached to this plan from the diary. Link more from a session
          detail screen.
        </Text>
        {linkedSessionsQuery.isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} className="mb-6" />
        ) : (linkedSessionsQuery.data?.length ?? 0) === 0 ? (
          <Text className="text-charcoal-500 text-sm mb-6">
            No sessions linked yet.
          </Text>
        ) : (
          <View className="mb-6">
            {linkedSessionsQuery.data?.map((s) => (
              <TouchableOpacity
                key={s.link_id}
                onPress={() =>
                  router.push(
                    tabPath(tabRoot, `bookings/${s.session_id}`) as never,
                  )
                }
                className="bg-white border border-cream-200 rounded-xl px-4 py-3 mb-2"
              >
                <Text className="text-charcoal-900 font-medium">
                  {format(
                    new Date(`${s.session_date}T12:00:00`),
                    "EEE d MMM yyyy",
                  )}{" "}
                  · {s.start_time}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-1">
                  {s.session_type || "Session"}
                  {s.status ? ` · ${s.status}` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button variant="primary" disabled={saving} onPress={() => void onSave()}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save</Text>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
