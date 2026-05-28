import React from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  pickQualificationDocument,
  uploadQualificationDocumentForPractitioner,
  validateQualificationDocumentSize,
} from "@/lib/qualificationDocuments";
import { openSignedDocumentUrl } from "@/lib/openSignedDocument";

type QualificationDocument = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
};

export default function PractitionerQualificationDocumentsScreen() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [items, setItems] = React.useState<QualificationDocument[]>([]);

  const load = React.useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("practitioner_qualification_documents")
        .select(
          "id, file_url, file_name, file_type, file_size_bytes, created_at",
        )
        .eq("practitioner_id", userProfile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems((data ?? []) as QualificationDocument[]);
    } catch (error: any) {
      Alert.alert("Could not load documents", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const pickAndUpload = async () => {
    if (!userProfile?.id) return;
    const file = await pickQualificationDocument();
    if (!file) return;
    const sizeError = validateQualificationDocumentSize(file.size);
    if (sizeError) {
      Alert.alert("File too large", sizeError);
      return;
    }

    setUploading(true);
    try {
      await uploadQualificationDocumentForPractitioner({
        practitionerId: userProfile.id,
        document: file,
      });

      await load();
    } catch (error: any) {
      Alert.alert("Could not upload", error?.message || "Try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (id: string) => {
    if (!userProfile?.id) return;
    Alert.alert("Delete document", "Remove this qualification document?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("practitioner_qualification_documents")
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
        title="Qualification documents"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Upload document
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            Accepted: PDF, JPG, PNG, DOC, DOCX. Maximum 10MB.
          </Text>
          <Button
            variant="primary"
            onPress={() => void pickAndUpload()}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color="#fff" /> : "Choose file"}
          </Button>
        </Card>

        <Card variant="default" padding="md">
          <Text className="text-charcoal-900 font-semibold mb-3">
            Uploaded documents
          </Text>
          {loading ? (
            <ActivityIndicator />
          ) : items.length === 0 ? (
            <Text className="text-charcoal-500">
              No documents uploaded yet.
            </Text>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="border border-cream-200 rounded-xl p-3 mb-2"
              >
                <Text className="text-charcoal-900 font-medium">
                  {item.file_name}
                </Text>
                <Text className="text-charcoal-500 text-sm mt-0.5">
                  {item.file_type.toUpperCase()} •{" "}
                  {Math.max(1, Math.round((item.file_size_bytes || 0) / 1024))}
                  KB
                </Text>
                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    onPress={() => openSignedDocumentUrl(item.file_url)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => void removeDocument(item.id)}
                  >
                    Remove
                  </Button>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
