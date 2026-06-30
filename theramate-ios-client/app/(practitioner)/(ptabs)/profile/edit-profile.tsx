import React from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { supabase } from "@/lib/supabase";
import { PROFILE_IMAGE_MAX_BYTES } from "@/constants/config";
import { openSignedDocumentUrl } from "@/lib/openSignedDocument";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

const PROFESSIONAL_BODY_OPTIONS = [
  { id: "society_of_sports_therapists", label: "Society of Sports Therapists" },
  {
    id: "british_association_of_sports_therapists",
    label: "British Association of Sports Therapists",
  },
  {
    id: "british_association_of_sports_rehabilitators",
    label: "BASRaT",
  },
  {
    id: "chartered_society_of_physiotherapy",
    label: "Chartered Society of Physiotherapy",
  },
  {
    id: "british_osteopathic_association",
    label: "British Osteopathic Association",
  },
  { id: "general_osteopathic_council", label: "General Osteopathic Council" },
  {
    id: "complementary_natural_healthcare_council",
    label: "Complementary and Natural Healthcare Council (CNHC)",
  },
  { id: "other", label: "Other" },
] as const;

function getQualificationTypeLabel(value: string | null | undefined): string {
  switch (value) {
    case "itmmif":
      return "ITMMIF";
    case "atmmif":
      return "ATMMIF";
    case "equivalent":
      return "Equivalent";
    case "none":
      return "None";
    default:
      return value || "Unknown";
  }
}

export default function PractitionerEditProfileScreen() {
  const tabRoot = useTabRoot();
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const extendedProfile = userProfile as
    | (typeof userProfile & {
        therapist_type?: "clinic_based" | "mobile" | "hybrid" | null;
        experience_years?: number | null;
        registration_number?: string | null;
        professional_body?: string | null;
        professional_body_other?: string | null;
        has_liability_insurance?: boolean | null;
        profile_photo_url?: string | null;
        qualification_type?: string | null;
        qualification_expiry?: string | null;
        qualification_file_url?: string | null;
      })
    | null;
  const [firstName, setFirstName] = React.useState(
    userProfile?.first_name || "",
  );
  const [lastName, setLastName] = React.useState(userProfile?.last_name || "");
  const [phone, setPhone] = React.useState(userProfile?.phone || "");
  const [location, setLocation] = React.useState(userProfile?.location || "");
  const [bio, setBio] = React.useState(userProfile?.bio || "");
  const [therapistType, setTherapistType] = React.useState(
    extendedProfile?.therapist_type || "clinic_based",
  );
  const [experienceYears, setExperienceYears] = React.useState(
    extendedProfile?.experience_years
      ? String(extendedProfile.experience_years)
      : "",
  );
  const [registrationNumber, setRegistrationNumber] = React.useState(
    extendedProfile?.registration_number || "",
  );
  const [professionalBody, setProfessionalBody] = React.useState(
    extendedProfile?.professional_body || "",
  );
  const [professionalBodyOther, setProfessionalBodyOther] = React.useState(
    extendedProfile?.professional_body_other || "",
  );
  const [hasInsurance, setHasInsurance] = React.useState(
    Boolean(extendedProfile?.has_liability_insurance),
  );
  const [professionalStatement, setProfessionalStatement] = React.useState("");
  const [treatmentPhilosophy, setTreatmentPhilosophy] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(
    extendedProfile?.profile_photo_url || null,
  );
  const [qualificationFileUrl, setQualificationFileUrl] = React.useState<
    string | null
  >(extendedProfile?.qualification_file_url || null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [uploadingQualification, setUploadingQualification] =
    React.useState(false);
  const therapistTypeOptions: Array<{
    id: "clinic_based" | "mobile" | "hybrid";
    label: string;
  }> = [
    { id: "clinic_based", label: "Clinic based" },
    { id: "mobile", label: "Mobile" },
    { id: "hybrid", label: "Hybrid" },
  ];

  React.useEffect(() => {
    let cancelled = false;
    const loadTherapistCopy = async () => {
      if (!userProfile?.id) return;
      const { data } = await supabase
        .from("therapist_profiles")
        .select("professional_statement, treatment_philosophy")
        .eq("user_id", userProfile.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setProfessionalStatement(data.professional_statement ?? "");
      setTreatmentPhilosophy(data.treatment_philosophy ?? "");
    };
    void loadTherapistCopy();
    return () => {
      cancelled = true;
    };
  }, [userProfile?.id]);

  React.useEffect(() => {
    setPhotoUrl(extendedProfile?.profile_photo_url || null);
  }, [extendedProfile?.profile_photo_url]);

  React.useEffect(() => {
    setQualificationFileUrl(extendedProfile?.qualification_file_url || null);
  }, [extendedProfile?.qualification_file_url]);

  const pickAndUploadPhoto = async () => {
    if (!userProfile?.id) {
      Alert.alert("Upload failed", "Please sign in again.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploadingPhoto(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      if (blob.size > PROFILE_IMAGE_MAX_BYTES) {
        Alert.alert(
          "File too large",
          "Please choose an image smaller than 5MB.",
        );
        return;
      }
      const inferredExt =
        asset.fileName?.split(".").pop()?.toLowerCase() ||
        asset.mimeType?.split("/").pop() ||
        "jpg";
      const filePath = `${userProfile.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${inferredExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: asset.mimeType ?? "image/jpeg",
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const updateResult = await updateProfile({
        profile_photo_url: urlData.publicUrl,
      } as any);
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Could not save profile image.");
      }

      setPhotoUrl(urlData.publicUrl);
      await refreshProfile();
      Alert.alert("Saved", "Profile photo updated.");
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadOnboardingQualificationCertificate = async () => {
    if (!userProfile?.id) {
      Alert.alert("Upload failed", "Please sign in again.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploadingQualification(true);
    try {
      const ext =
        asset.name?.split(".").pop()?.toLowerCase() ||
        asset.mimeType?.split("/").pop() ||
        "pdf";
      const filePath = `${userProfile.id}/qualification_${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("qualifications")
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: asset.mimeType ?? undefined,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("qualifications")
        .getPublicUrl(filePath);

      const updateResult = await updateProfile({
        qualification_file_url: urlData.publicUrl,
      } as any);
      if (!updateResult.success) {
        throw new Error(
          updateResult.error || "Could not save certificate URL.",
        );
      }
      setQualificationFileUrl(urlData.publicUrl);
      await refreshProfile();
      Alert.alert("Saved", "Qualification certificate uploaded.");
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Please try again.");
    } finally {
      setUploadingQualification(false);
    }
  };

  const onSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing fields", "First name and last name are required.");
      return;
    }
    if (professionalBody === "other" && !professionalBodyOther.trim()) {
      Alert.alert(
        "Missing details",
        "Please specify your professional body when selecting Other.",
      );
      return;
    }
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const result = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        phone: phone.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        therapist_type: therapistType as "clinic_based" | "mobile" | "hybrid",
        experience_years: experienceYears.trim()
          ? Number(experienceYears.trim())
          : null,
        registration_number: registrationNumber.trim() || null,
        professional_body: professionalBody.trim() || null,
        professional_body_other:
          professionalBody === "other"
            ? professionalBodyOther.trim() || null
            : null,
        has_liability_insurance: hasInsurance,
      } as any);
      if (!result.success) {
        Alert.alert(
          "Could not update profile",
          result.error || "Please try again.",
        );
        return;
      }
      if (userProfile?.id) {
        const { error: therapistCopyError } = await supabase
          .from("therapist_profiles")
          .upsert(
            {
              user_id: userProfile.id,
              professional_statement: professionalStatement.trim() || null,
              treatment_philosophy: treatmentPhilosophy.trim() || null,
            },
            { onConflict: "user_id" },
          );
        if (therapistCopyError) {
          Alert.alert(
            "Saved profile, but not practice copy",
            therapistCopyError.message,
          );
          return;
        }
      }
      await refreshProfile();
      Alert.alert("Saved", "Your professional profile has been updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <TabScreen>
      <AppStackHeader
        title="Edit profile"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <TabScreenScroll className="flex-1 px-6 pt-4">
        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-3">
            Profile photo
          </Text>
          <View className="flex-row items-center gap-3">
            <Avatar
              source={photoUrl ?? undefined}
              name={
                `${firstName} ${lastName}`.trim() ||
                userProfile?.email ||
                "User"
              }
              size="2xl"
            />
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => void pickAndUploadPhoto()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator />
                ) : (
                  "Change profile photo"
                )}
              </Button>
            </View>
          </View>
        </Card>

        <Input
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Input label="Last name" value={lastName} onChangeText={setLastName} />
        <Input
          label="Email"
          value={userProfile?.email || ""}
          editable={false}
          disabled
          hint="Email is managed by your login account."
        />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input label="Location" value={location} onChangeText={setLocation} />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          className="min-h-[100px]"
        />
        <Input
          label="Experience (years)"
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType="number-pad"
        />
        <Input
          label="Registration number"
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
        />
        <Input
          label="Professional statement"
          value={professionalStatement}
          onChangeText={setProfessionalStatement}
          multiline
          numberOfLines={4}
          className="min-h-[100px]"
        />
        <Input
          label="Treatment philosophy"
          value={treatmentPhilosophy}
          onChangeText={setTreatmentPhilosophy}
          multiline
          numberOfLines={4}
          className="min-h-[100px]"
        />

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Professional body
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {PROFESSIONAL_BODY_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={professionalBody === option.id ? "primary" : "outline"}
                onPress={() => setProfessionalBody(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </View>
          {professionalBody === "other" ? (
            <Input
              label="Specify professional body"
              value={professionalBodyOther}
              onChangeText={setProfessionalBodyOther}
              maxLength={200}
              hint="Required when Other is selected."
            />
          ) : null}
        </Card>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Therapist type
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {therapistTypeOptions.map((option) => (
              <Button
                key={option.id}
                variant={therapistType === option.id ? "primary" : "outline"}
                onPress={() => setTherapistType(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </View>
          <View className="flex-row items-center justify-between pt-1">
            <Text className="text-charcoal-800">
              Liability insurance active
            </Text>
            <Button
              variant="outline"
              onPress={() => setHasInsurance((prev) => !prev)}
            >
              {hasInsurance ? "On" : "Off"}
            </Button>
          </View>
        </Card>

        {extendedProfile?.qualification_type ? (
          <Card variant="default" padding="md" className="mb-4">
            <Text className="text-charcoal-900 font-semibold mb-2">
              Primary qualification certificate
            </Text>
            <Text className="text-charcoal-700 mb-1">
              Type:{" "}
              {getQualificationTypeLabel(extendedProfile.qualification_type)}
            </Text>
            {extendedProfile.qualification_expiry ? (
              <Text className="text-charcoal-700 mb-3">
                Expiry:{" "}
                {new Date(
                  extendedProfile.qualification_expiry,
                ).toLocaleDateString()}
              </Text>
            ) : null}
            {qualificationFileUrl ? (
              <Button
                variant="outline"
                className="mb-2"
                onPress={() => openSignedDocumentUrl(qualificationFileUrl)}
              >
                Open certificate
              </Button>
            ) : null}
            <Button
              variant="outline"
              onPress={() => void uploadOnboardingQualificationCertificate()}
              disabled={uploadingQualification}
            >
              {uploadingQualification ? (
                <ActivityIndicator />
              ) : (
                "Upload certificate"
              )}
            </Button>
          </Card>
        ) : null}

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Credentials
          </Text>
          <Button
            variant="outline"
            className="mb-2"
            onPress={() =>
              router.push(
                tabPath(tabRoot, "profile/practice-locations") as never,
              )
            }
          >
            Manage practice locations
          </Button>
          <Button
            variant="outline"
            className="mb-2"
            onPress={() =>
              router.push(tabPath(tabRoot, "profile/qualifications") as never)
            }
          >
            Manage qualifications
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              router.push(
                tabPath(tabRoot, "profile/qualification-documents") as never,
              )
            }
          >
            Manage qualification documents
          </Button>
        </Card>

        <Button
          variant="primary"
          className="mt-1"
          onPress={() => void onSave()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save changes</Text>
          )}
        </Button>
      </TabScreenScroll>
    </TabScreen>
  );
}
