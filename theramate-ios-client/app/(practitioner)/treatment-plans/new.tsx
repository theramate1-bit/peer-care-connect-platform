import React, { useMemo, useState } from "react";
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
import { ChevronLeft, Check } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePractitionerClients } from "@/hooks/usePractitionerClients";
import { createTreatmentPlanRpc } from "@/lib/api/practitionerTreatmentPlans";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NewTreatmentPlanScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientIdParam = Array.isArray(params.clientId)
    ? params.clientId[0]
    : params.clientId;
  const queryClient = useQueryClient();

  const {
    data: clients = [],
    isLoading: loadingClients,
  } = usePractitionerClients(userId);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clientIdParam ?? "");
  const [manualMode, setManualMode] = useState(false);
  const [goalsText, setGoalsText] = useState("");
  const [interventionsText, setInterventionsText] = useState("");
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedClientLabel = useMemo(() => {
    const c = clients.find((x) => x.client_id === clientId);
    return c?.name ?? null;
  }, [clients, clientId]);

  const onCreate = async () => {
    if (!userId) return;
    const cid = clientId.trim();
    if (!cid || !title.trim()) {
      Alert.alert(
        "Missing fields",
        "Choose a client (or enter their user ID) and add a title.",
      );
      return;
    }
    const goals = goalsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const interventions = interventionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    try {
      const { data: id, error } = await createTreatmentPlanRpc({
        practitionerId: userId,
        clientId: cid,
        title: title.trim(),
        goals: goals.length ? goals : ["Goal to be defined"],
        interventions: interventions.length
          ? interventions
          : ["Intervention to be defined"],
        startDate: null,
        endDate: null,
        clinicianNotes: clinicianNotes.trim() || null,
      });
      if (error || !id) {
        Alert.alert("Error", error?.message || "Could not create plan");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["treatment_plans"] });
      await queryClient.invalidateQueries({ queryKey: ["treatment_plans_client"] });
      router.replace(tabPath(tabRoot, `treatment-plans/${id}`) as never);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "bookings"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            New care plan
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            After saving, link this plan from the client's session detail.
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-charcoal-900 font-semibold mb-2">Client</Text>
        {loadingClients ? (
          <ActivityIndicator color={Colors.sage[500]} className="my-4" />
        ) : clients.length === 0 && !manualMode ? (
          <View className="mb-4">
            <Text className="text-charcoal-500 text-sm mb-3">
              No clients found from past sessions yet. Enter a client&apos;s user
              ID manually, or book a session first.
            </Text>
            <Button variant="outline" onPress={() => setManualMode(true)}>
              <Text className="text-charcoal-800 font-medium">
                Enter client user ID
              </Text>
            </Button>
          </View>
        ) : (
          <>
            {!manualMode ? (
              <View className="mb-4">
                {clients.map((c) => {
                  const sel = clientId === c.client_id;
                  return (
                    <TouchableOpacity
                      key={c.client_id}
                      onPress={() => setClientId(c.client_id)}
                      activeOpacity={0.85}
                    >
                      <Card
                        variant={sel ? "elevated" : "default"}
                        padding="md"
                        className="mb-2"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-2">
                            <Text className="text-charcoal-900 font-medium">
                              {c.name}
                            </Text>
                            {c.email ? (
                              <Text className="text-charcoal-500 text-sm mt-1">
                                {c.email}
                              </Text>
                            ) : null}
                          </View>
                          {sel ? (
                            <Check size={22} color={Colors.sage[600]} />
                          ) : null}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setManualMode(true)}
                  className="py-3"
                >
                  <Text className="text-sage-600 font-medium text-sm">
                    Use different client ID…
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-4">
                <TextInput
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-2"
                  placeholder="Client user UUID"
                  placeholderTextColor={Colors.charcoal[400]}
                  value={clientId}
                  onChangeText={setClientId}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setManualMode(false)}>
                  <Text className="text-sage-600 text-sm">Pick from list…</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedClientLabel ? (
          <Text className="text-charcoal-500 text-sm mb-4">
            Selected: {selectedClientLabel}
          </Text>
        ) : null}

        <Text className="text-charcoal-700 text-sm mb-1">Title</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
          placeholder="e.g. Lower back rehab"
          placeholderTextColor={Colors.charcoal[400]}
          value={title}
          onChangeText={setTitle}
        />
        <Text className="text-charcoal-700 text-sm mb-1">Goals (one per line)</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[100px]"
          placeholderTextColor={Colors.charcoal[400]}
          multiline
          textAlignVertical="top"
          value={goalsText}
          onChangeText={setGoalsText}
        />
        <Text className="text-charcoal-700 text-sm mb-1">
          Interventions (one per line)
        </Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[100px]"
          placeholderTextColor={Colors.charcoal[400]}
          multiline
          textAlignVertical="top"
          value={interventionsText}
          onChangeText={setInterventionsText}
        />
        <Text className="text-charcoal-700 text-sm mb-1">Clinician notes</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-6 min-h-[80px]"
          placeholderTextColor={Colors.charcoal[400]}
          multiline
          textAlignVertical="top"
          value={clinicianNotes}
          onChangeText={setClinicianNotes}
        />

        <Button variant="primary" disabled={busy} onPress={() => void onCreate()}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Create care plan</Text>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
