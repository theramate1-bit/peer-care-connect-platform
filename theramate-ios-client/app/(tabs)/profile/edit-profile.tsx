import React from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function EditProfileScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = React.useState(
    userProfile?.first_name || "",
  );
  const [lastName, setLastName] = React.useState(userProfile?.last_name || "");
  const [phone, setPhone] = React.useState(userProfile?.phone || "");
  const [location, setLocation] = React.useState(userProfile?.location || "");
  const [bio, setBio] = React.useState(userProfile?.bio || "");
  const [saving, setSaving] = React.useState(false);

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
      <AppStackHeader title="Edit profile" fallbackHref={defaultSignedInProfileHref()} />

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
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
