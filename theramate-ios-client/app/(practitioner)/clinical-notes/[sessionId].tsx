/**
 * SOAP / DAP clinical notes for a session (`treatment_notes`).
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  MapPin,
  Mic,
  Paperclip,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTreatmentNotesForSession,
  notesByType,
  saveAllSoapNotes,
  type TreatmentNoteType,
} from "@/lib/api/practitionerTreatmentNotes";
import {
  uploadClinicalSessionAttachment,
  fetchClinicalSessionAttachments,
  getClinicalSessionAttachmentSignedUrl,
  deleteClinicalSessionAttachment,
  type ClinicalSessionAttachmentRow,
} from "@/lib/api/clinicalSessionAttachments";
import { fetchPractitionerSessionById } from "@/lib/api/practitionerSessions";
import { Button } from "@/components/ui/Button";
import { generateSoapNotesFromTranscript } from "@/lib/api/soapNotes";
import { transcribeSessionVoiceRecording } from "@/lib/api/aiSoapTranscribe";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { useVoiceSessionRecorder } from "@/hooks/useVoiceSessionRecorder";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";
import { signedInTabPath } from "@/lib/signedInRoutes";

function formatVoiceDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SECTIONS: { key: TreatmentNoteType; label: string; hint: string }[] = [
  { key: "subjective", label: "Subjective", hint: "What the client reports" },
  { key: "objective", label: "Objective", hint: "Observations, measures" },
  { key: "data", label: "Data", hint: "DAP: measurable data (optional)" },
  { key: "assessment", label: "Assessment", hint: "Clinical assessment" },
  { key: "plan", label: "Plan", hint: "Plan, goals, homework" },
];

export default function ClinicalNotesEditorScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [aiChief, setAiChief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [transcribingVoice, setTranscribingVoice] = useState(false);

  const voice = useVoiceSessionRecorder();
  const voiceSupported = Platform.OS !== "web";

  const sessionQuery = useQuery({
    queryKey: ["practitioner_session_detail", userId, sessionId],
    queryFn: async () => {
      if (!userId || !sessionId) return null;
      const { data, error } = await fetchPractitionerSessionById({
        therapistId: userId,
        sessionId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!sessionId,
  });

  const notesQuery = useQuery({
    queryKey: ["treatment_notes", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await fetchTreatmentNotesForSession(sessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const attachmentsQuery = useQuery({
    queryKey: ["clinical_session_attachments", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await fetchClinicalSessionAttachments(sessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const merged = useMemo(() => {
    const fromDb = notesByType(notesQuery.data || []);
    return { ...fromDb, ...draft };
  }, [notesQuery.data, draft]);

  const updateField = (key: TreatmentNoteType, text: string) => {
    setDraft((d) => ({ ...d, [key]: text }));
  };

  const onStartVoice = async () => {
    const res = await voice.start();
    if (!res.ok && res.error) {
      Alert.alert("Microphone", res.error.message);
    }
  };

  const onStopVoice = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const stopped = await voice.stop();
    if (stopped.error) {
      Alert.alert("Recording", stopped.error.message);
      return;
    }
    if (!stopped.uri || !userId || !sessionId) return;

    setTranscribingVoice(true);
    try {
      const tx = await transcribeSessionVoiceRecording({
        sessionId,
        practitionerId: userId,
        fileUri: stopped.uri,
        fileName: stopped.fileName,
        mimeType: stopped.mimeType,
      });
      if (tx.error || !tx.text) {
        const msg = tx.error?.message ?? "Could not transcribe this recording.";
        if (tx.status === 401 || /unauthorized/i.test(msg)) {
          Alert.alert("Sign in required", msg);
          return;
        }
        if (
          tx.status === 403 ||
          /pro plan|clinic subscription/i.test(msg)
        ) {
          Alert.alert("Subscription", msg, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open subscription",
              onPress: () =>
                router.push(signedInTabPath("profile/payment-methods") as never),
            },
          ]);
          return;
        }
        Alert.alert("Transcription", msg);
        return;
      }
      setAiTranscript(tx.text);
      setAiOpen(true);
    } finally {
      setTranscribingVoice(false);
    }
  };

  const onSave = async () => {
    if (!userId || !sessionId || !sessionQuery.data) return;
    setSaving(true);
    try {
      const sections: Partial<Record<TreatmentNoteType, string>> = {};
      for (const s of SECTIONS) {
        sections[s.key] = merged[s.key] ?? "";
      }
      const res = await saveAllSoapNotes({
        sessionId,
        practitionerId: userId,
        clientId: sessionQuery.data.client_id,
        sections,
      });
      if (!res.ok) {
        Alert.alert("Could not save", res.error?.message || "");
        return;
      }
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ["treatment_notes", sessionId] });
      Alert.alert("Saved", "Clinical notes updated.");
    } finally {
      setSaving(false);
    }
  };

  const onPickAttachment = async () => {
    if (!userId || !sessionId || attachBusy) return;
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
          ? "Run a fresh native build with expo-document-picker linked."
          : msg,
      );
      return;
    }
    if (pick.canceled || !pick.assets?.length) return;
    const a = pick.assets[0];
    setAttachBusy(true);
    try {
      const res = await uploadClinicalSessionAttachment({
        sessionId,
        practitionerId: userId,
        fileUri: a.uri,
        fileName: a.name,
        mimeType: a.mimeType ?? null,
      });
      if (!res.ok) {
        Alert.alert("Upload failed", res.error?.message ?? "Try again.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["clinical_session_attachments", sessionId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_clinical_files", userId],
      });
    } finally {
      setAttachBusy(false);
    }
  };

  const onOpenAttachment = async (storagePath: string) => {
    const { url, error } =
      await getClinicalSessionAttachmentSignedUrl(storagePath);
    if (error || !url) {
      Alert.alert("Could not open file", error?.message ?? "");
      return;
    }
    openHostedWebSession({ kind: "signed_document", url });
  };

  const onAiDraft = async () => {
    const t = aiTranscript.trim();
    if (!t) {
      Alert.alert("Transcript required", "Paste session notes or a rough transcript.");
      return;
    }
    if (!sessionId) return;
    setAiBusy(true);
    try {
      const res = await generateSoapNotesFromTranscript({
        transcript: t,
        sessionId,
        sessionType: sessionQuery.data?.session_type ?? undefined,
        chiefComplaint: aiChief.trim() || undefined,
        save: false,
      });
      if (res.error || !res.data) {
        const msg = res.error?.message ?? "Could not generate SOAP.";
        if (
          res.status === 403 ||
          /pro plan|clinic/i.test(msg)
        ) {
          Alert.alert("Subscription", msg, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open subscription",
              onPress: () =>
                router.push(signedInTabPath("profile/payment-methods") as never),
            },
          ]);
        } else {
          Alert.alert("AI SOAP", msg);
        }
        return;
      }
      setDraft((d) => ({
        ...d,
        subjective: res.data!.subjective,
        objective: res.data!.objective,
        assessment: res.data!.assessment,
        plan: res.data!.plan,
      }));
      setAiOpen(false);
      setAiTranscript("");
      setAiChief("");
      Alert.alert("Draft ready", "Review and edit each section, then tap Save notes.");
    } finally {
      setAiBusy(false);
    }
  };

  const onRemoveAttachment = (attachmentId: string, label: string) => {
    if (!userId) return;
    Alert.alert("Remove file?", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void (async () => {
            setAttachBusy(true);
            try {
              const res = await deleteClinicalSessionAttachment({
                attachmentId,
                practitionerId: userId,
              });
              if (!res.ok) {
                Alert.alert("Error", res.error?.message ?? "");
                return;
              }
              await queryClient.invalidateQueries({
                queryKey: ["clinical_session_attachments", sessionId],
              });
              await queryClient.invalidateQueries({
                queryKey: ["practitioner_clinical_files", userId],
              });
            } finally {
              setAttachBusy(false);
            }
          })(),
      },
    ]);
  };

  const loading = sessionQuery.isLoading || notesQuery.isLoading;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={Colors.sage[500]} />
          </View>
        ) : !sessionQuery.data ? (
          <Text className="text-charcoal-500 px-6 py-8 text-center">
            Session not found.
          </Text>
        ) : (
          <ScrollView
            className="flex-1 px-6 pt-4"
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader
              className="-mx-6 -mt-4 mb-2"
              eyebrow="Practice"
              title="Clinical notes"
              subtitle="SOAP/DAP notes and secure file attachments."
            />

            <Text className="text-charcoal-800 font-semibold mb-1">
              {sessionQuery.data.client_name}
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              {sessionQuery.data.session_date} · {sessionQuery.data.start_time?.slice(0, 5)}
            </Text>

            <View className="flex-row items-start mb-6 bg-white border border-cream-200 rounded-xl px-4 py-3">
              <MapPin size={18} color={Colors.charcoal[500]} style={{ marginTop: 2 }} />
              <View className="flex-1 ml-2">
                <Text className="text-charcoal-800 font-medium">
                  {(sessionQuery.data.appointment_type || "clinic").toLowerCase() ===
                  "mobile"
                    ? "Mobile visit"
                    : "Clinic session"}
                </Text>
                {sessionQuery.data.visit_address ? (
                  <Text className="text-charcoal-600 text-sm mt-1">
                    {sessionQuery.data.visit_address}
                  </Text>
                ) : (
                  <Text className="text-charcoal-400 text-xs mt-1">
                    {(sessionQuery.data.appointment_type || "clinic").toLowerCase() ===
                    "mobile"
                      ? "No visit address on file for this booking."
                      : "At your practice location."}
                  </Text>
                )}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-charcoal-900 font-semibold mb-2">
                Clinical files
              </Text>
              <Text className="text-charcoal-400 text-xs mb-3">
                Secure uploads stored with this session (visible to you; clients can open their
                own session files when you share them here).
              </Text>
              <Button
                variant="outline"
                disabled={attachBusy}
                onPress={() => void onPickAttachment()}
                leftIcon={<Paperclip size={18} color={Colors.sage[600]} />}
              >
                <Text className="text-charcoal-800 font-semibold">
                  {attachBusy ? "Working…" : "Attach file"}
                </Text>
              </Button>
              {attachmentsQuery.isLoading ? (
                <ActivityIndicator className="mt-4" color={Colors.sage[500]} />
              ) : (attachmentsQuery.data?.length ?? 0) === 0 ? (
                <Text className="text-charcoal-400 text-sm mt-3">No files yet.</Text>
              ) : (
                <View className="mt-3">
                  {(attachmentsQuery.data ?? []).map((f: ClinicalSessionAttachmentRow) => (
                    <View
                      key={f.id}
                      className="flex-row items-center py-2 border-b border-cream-200"
                    >
                      <TouchableOpacity
                        className="flex-1 pr-2"
                        onPress={() => void onOpenAttachment(f.storage_path)}
                      >
                        <Text className="text-charcoal-800 font-medium" numberOfLines={1}>
                          {f.file_name}
                        </Text>
                        <Text className="text-charcoal-400 text-xs mt-0.5">Tap to open</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => onRemoveAttachment(f.id, f.file_name)}
                        disabled={attachBusy}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={18} color={Colors.charcoal[500]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="mb-6">
              <Text className="text-charcoal-900 font-semibold mb-2">
                AI-assisted SOAP
              </Text>
              <Text className="text-charcoal-400 text-xs mb-3">
                Pro or Clinic: dictate or paste text, then generate a draft. Edit every
                section before saving.
              </Text>

              {voiceSupported ? (
                <View className="mb-3">
                  {voice.isRecording ? (
                    <View className="flex-row items-center bg-white border border-cream-200 rounded-xl px-3 py-3">
                      <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-3" />
                      <View className="flex-1">
                        <Text className="text-charcoal-900 font-semibold">
                          Recording {formatVoiceDuration(voice.durationSec)}
                        </Text>
                        <Text className="text-charcoal-400 text-xs mt-0.5">
                          Tap stop when finished — we transcribe, then open the draft
                          sheet.
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="flex-row items-center bg-charcoal-800 px-4 py-2.5 rounded-xl"
                        onPress={() => void onStopVoice()}
                        disabled={transcribingVoice}
                        accessibilityRole="button"
                        accessibilityLabel="Stop recording"
                      >
                        <Square size={16} color="#fff" fill="#fff" />
                        <Text className="text-white font-semibold ml-2">Stop</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={transcribingVoice || aiBusy || saving}
                      leftIcon={<Mic size={18} color={Colors.sage[600]} />}
                      onPress={() => void onStartVoice()}
                    >
                      <Text className="text-charcoal-800 font-semibold">
                        {transcribingVoice ? "Transcribing…" : "Record voice memo"}
                      </Text>
                    </Button>
                  )}
                  {transcribingVoice ? (
                    <View className="flex-row items-center mt-3">
                      <ActivityIndicator color={Colors.sage[500]} />
                      <Text className="text-charcoal-500 text-sm ml-2">
                        Uploading and transcribing…
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Button
                variant="outline"
                disabled={transcribingVoice || aiBusy}
                leftIcon={<Sparkles size={18} color={Colors.sage[600]} />}
                onPress={() => setAiOpen(true)}
              >
                <Text className="text-charcoal-800 font-semibold">
                  Draft from transcript…
                </Text>
              </Button>
            </View>

            {SECTIONS.map((s) => (
              <View key={s.key} className="mb-5">
                <Text className="text-charcoal-900 font-semibold mb-1">
                  {s.label}
                </Text>
                <Text className="text-charcoal-400 text-xs mb-2">{s.hint}</Text>
                <TextInput
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 min-h-[100px]"
                  placeholderTextColor={Colors.charcoal[400]}
                  placeholder="Type here…"
                  multiline
                  textAlignVertical="top"
                  value={merged[s.key] ?? ""}
                  onChangeText={(t) => updateField(s.key, t)}
                />
              </View>
            ))}

            <Button
              variant="primary"
              disabled={saving}
              onPress={() => void onSave()}
            >
              <Text className="text-white font-semibold">
                {saving ? "Saving…" : "Save notes"}
              </Text>
            </Button>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={aiOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAiOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => !aiBusy && setAiOpen(false)}
        >
          <Pressable
            className="bg-cream-50 rounded-t-3xl px-5 pt-4 pb-10 max-h-[90%]"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-charcoal-900 text-lg font-semibold mb-1">
              Draft SOAP from text
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Optional chief complaint, then paste everything that should inform S/O/A/P.
            </Text>
            <Text className="text-charcoal-700 text-sm mb-1">Chief complaint (optional)</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
              placeholderTextColor={Colors.charcoal[400]}
              placeholder="e.g. left knee pain"
              value={aiChief}
              onChangeText={setAiChief}
            />
            <Text className="text-charcoal-700 text-sm mb-1">Transcript / notes</Text>
            <TextInput
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 min-h-[160px] mb-4"
              placeholderTextColor={Colors.charcoal[400]}
              placeholder="Paste dictation, bullet points, or rough session prose…"
              multiline
              textAlignVertical="top"
              value={aiTranscript}
              onChangeText={setAiTranscript}
            />
            <Button
              variant="primary"
              disabled={aiBusy}
              onPress={() => void onAiDraft()}
            >
              <Text className="text-white font-semibold">
                {aiBusy ? "Generating…" : "Generate draft"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              disabled={aiBusy}
              onPress={() => setAiOpen(false)}
            >
              <Text className="text-charcoal-800 font-semibold">Cancel</Text>
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
