import React from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const extendedProfile = userProfile as
    | (typeof userProfile & {
        profile_photo_url?: string | null;
      })
    | null;
  const [firstName, setFirstName] = React.useState(
    userProfile?.first_name || "",
  );
  const [lastName, setLastName] = React.useState(userProfile?.last_name || "");
  const [phone, setPhone] = React.useState(userProfile?.phone || "");
  const [location, setLocation] = React.useState(userProfile?.location || "");
  const [bio, setBio] = React.useState(userProfile?.bio || "");
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(
    extendedProfile?.profile_photo_url || null,
  );

  React.useEffect(() => {
    setPhotoUrl(extendedProfile?.profile_photo_url || null);
  }, [extendedProfile?.profile_photo_url]);

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
    const uri = asset.uri;
    if (!uri) return;

    setUploadingPhoto(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
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

  const onSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing fields", "First name and last name are required.");
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
      });
      if (!result.success) {
        Alert.alert(
          "Could not update profile",
          result.error || "Please try again.",
        );
        return;
      }
      await refreshProfile();
      Alert.alert("Saved", "Your profile has been updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Edit profile"
        fallbackHref={defaultSignedInProfileHref()}
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="items-center mb-4">
          <Avatar
            name={
              `${firstName} ${lastName}`.trim() || userProfile?.email || "User"
            }
            source={photoUrl ?? undefined}
            size="2xl"
          />
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => void pickAndUploadPhoto()}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-semibold text-charcoal-800">
                Change photo
              </Text>
            )}
          </Button>
        </View>
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

        <Button
          variant="primary"
          className="mt-3"
          onPress={() => void onSave()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save changes</Text>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
