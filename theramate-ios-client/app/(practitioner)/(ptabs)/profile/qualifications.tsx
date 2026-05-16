import React from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isDuplicateQualification } from "@/lib/practitionerProfile";
import {
  pickQualificationDocument,
  uploadQualificationDocumentForPractitioner,
  validateQualificationDocumentSize,
  type PickedQualificationDocument,
} from "@/lib/qualificationDocuments";

type Qualification = {
  id: string;
  name: string | null;
  institution: string | null;
  year_obtained: number | null;
};

export default function PractitionerQualificationsScreen() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<Qualification[]>([]);
  const [name, setName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [document, setDocument] =
    React.useState<PickedQualificationDocument | null>(null);

  const load = React.useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("qualifications")
        .select("id, name, institution, year_obtained")
        .eq("practitioner_id", userProfile.id)
        .order("year_obtained", { ascending: false });
      if (error) throw error;
      setItems((data ?? []) as Qualification[]);
    } catch (error: any) {
      Alert.alert(
        "Could not load qualifications",
        error?.message || "Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const addQualification = async () => {
    if (!userProfile?.id) return;
    if (!name.trim()) {
      Alert.alert("Missing details", "Please add a qualification name.");
      return;
    }
    if (!document) {
      Alert.alert(
        "Document required",
        "Upload the qualification document before adding this qualification.",
      );
      return;
    }
    const sizeError = validateQualificationDocumentSize(document.size);
    if (sizeError) {
      Alert.alert("File too large", sizeError);
      return;
    }
    if (
      isDuplicateQualification(items, {
        name,
        institution,
        year_obtained: year.trim() ? Number(year.trim()) : null,
      })
    ) {
      Alert.alert(
        "Duplicate qualification",
        "This qualification already exists. Edit the existing one instead.",
      );
      return;
    }
    setSaving(true);
    let insertedQualificationId: string | null = null;
    try {
      const { data: insertedQualification, error } = await supabase
        .from("qualifications")
        .insert({
          practitioner_id: userProfile.id,
          name: name.trim(),
          institution: institution.trim() || null,
          year_obtained: year.trim() ? Number(year.trim()) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      insertedQualificationId = insertedQualification?.id ?? null;

      await uploadQualificationDocumentForPractitioner({
        practitionerId: userProfile.id,
        document,
      });

      setName("");
      setInstitution("");
      setYear(String(new Date().getFullYear()));
      setDocument(null);
      await load();
    } catch (error: any) {
      if (insertedQualificationId) {
        await supabase
          .from("qualifications")
          .delete()
          .eq("id", insertedQualificationId)
          .eq("practitioner_id", userProfile.id);
      }
      Alert.alert("Could not save", error?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const chooseDocument = async () => {
    const picked = await pickQualificationDocument();
    if (!picked) return;
    const sizeError = validateQualificationDocumentSize(picked.size);
    if (sizeError) {
      Alert.alert("File too large", sizeError);
      return;
    }
    setDocument(picked);
  };

  const removeQualification = async (id: string) => {
    if (!userProfile?.id) return;
    Alert.alert("Delete qualification", "Remove this qualification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("qualifications")
            .delete()
            .eq("id", id)
            .eq("practitioner_id", userProfile.id);
          if (error) {
            Alert.alert("Could not delete", error.message);
            return;
          }
          await load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Qualifications"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Add qualification
          </Text>
          <Input label="Name" value={name} onChangeText={setName} />
          <Input
            label="Institution"
            value={institution}
            onChangeText={setInstitution}
          />
          <Input label="Year obtained" value={year} onChangeText={setYear} />
          <Button
            variant="outline"
            className="mb-3"
            onPress={() => void chooseDocument()}
          >
            {document ? "Change document" : "Upload document"}
          </Button>
          {document ? (
            <Text className="text-charcoal-500 text-xs mb-3">
              Selected: {document.name}
            </Text>
          ) : (
            <Text className="text-charcoal-500 text-xs mb-3">
              A supporting document is required.
            </Text>
          )}
          <Button
            variant="primary"
            onPress={() => void addQualification()}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : "Add qualification"}
          </Button>
        </Card>

        <Card variant="default" padding="md">
          <Text className="text-charcoal-900 font-semibold mb-3">
            Current qualifications
          </Text>
          {loading ? (
            <ActivityIndicator />
          ) : items.length === 0 ? (
            <Text className="text-charcoal-500">
              No qualifications added yet.
            </Text>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="border border-cream-200 rounded-xl p-3 mb-2"
              >
                <Text className="text-charcoal-900 font-medium">
                  {item.name || "Untitled qualification"}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-0.5">
                  {[item.institution, item.year_obtained]
                    .filter(Boolean)
                    .join(" • ") || "Details not provided"}
                </Text>
                <Button
                  variant="outline"
                  className="mt-2"
                  onPress={() => void removeQualification(item.id)}
                >
                  Remove
                </Button>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
