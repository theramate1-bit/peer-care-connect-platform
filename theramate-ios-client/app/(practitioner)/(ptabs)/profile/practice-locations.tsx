import React from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import * as ImagePicker from "expo-image-picker";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { PROFILE_IMAGE_MAX_BYTES } from "@/constants/config";
import {
  buildPracticeLocationUpdate,
  type PracticeLocationValues,
  type TherapistType,
  validatePracticeLocations,
} from "@/lib/practitionerProfile";

type PinTarget = "clinic" | "base";

const THERAPIST_OPTIONS: Array<{ id: TherapistType; label: string }> = [
  { id: "clinic_based", label: "Clinic based" },
  { id: "mobile", label: "Mobile" },
  { id: "hybrid", label: "Hybrid" },
];

const LONDON_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function PractitionerPracticeLocationsScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const extendedProfile = userProfile as
    | (typeof userProfile & {
        therapist_type?: TherapistType | null;
        clinic_address?: string | null;
        clinic_latitude?: number | null;
        clinic_longitude?: number | null;
        clinic_image_url?: string | null;
        base_address?: string | null;
        base_latitude?: number | null;
        base_longitude?: number | null;
        mobile_service_radius_km?: number | null;
        service_radius_km?: number | null;
      })
    | null;
  const [saving, setSaving] = React.useState(false);
  const [uploadingClinicImage, setUploadingClinicImage] = React.useState(false);
  const [pinTarget, setPinTarget] = React.useState<PinTarget>("clinic");
  const [clinicImageUrl, setClinicImageUrl] = React.useState<string | null>(
    extendedProfile?.clinic_image_url ?? null,
  );
  const [values, setValues] = React.useState<PracticeLocationValues>({
    therapistType: extendedProfile?.therapist_type ?? "clinic_based",
    clinicAddress: extendedProfile?.clinic_address ?? "",
    clinicLatitude: extendedProfile?.clinic_latitude ?? null,
    clinicLongitude: extendedProfile?.clinic_longitude ?? null,
    baseAddress: extendedProfile?.base_address ?? "",
    baseLatitude: extendedProfile?.base_latitude ?? null,
    baseLongitude: extendedProfile?.base_longitude ?? null,
    mobileServiceRadiusKm:
      extendedProfile?.mobile_service_radius_km ??
      extendedProfile?.service_radius_km ??
      null,
  });

  const activeMarker =
    pinTarget === "clinic"
      ? { latitude: values.clinicLatitude, longitude: values.clinicLongitude }
      : { latitude: values.baseLatitude, longitude: values.baseLongitude };

  const markerLatitude =
    activeMarker.latitude ??
    values.clinicLatitude ??
    values.baseLatitude ??
    LONDON_REGION.latitude;
  const markerLongitude =
    activeMarker.longitude ??
    values.clinicLongitude ??
    values.baseLongitude ??
    LONDON_REGION.longitude;

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (pinTarget === "clinic") {
      setValues((prev) => ({
        ...prev,
        clinicLatitude: latitude,
        clinicLongitude: longitude,
      }));
      return;
    }
    setValues((prev) => ({
      ...prev,
      baseLatitude: latitude,
      baseLongitude: longitude,
    }));
  };

  const onSave = async () => {
    const validationError = validatePracticeLocations(values);
    if (validationError) {
      Alert.alert("Missing details", validationError);
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(
        buildPracticeLocationUpdate(values) as any,
      );
      if (!result.success) {
        Alert.alert("Could not save", result.error || "Please try again.");
        return;
      }
      await refreshProfile();
      Alert.alert("Saved", "Practice locations updated.");
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    setClinicImageUrl(extendedProfile?.clinic_image_url ?? null);
  }, [extendedProfile?.clinic_image_url]);

  const pickAndUploadClinicImage = async () => {
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

    setUploadingClinicImage(true);
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
      const filePath = `clinic/${userProfile.id}/${Date.now()}-${Math.random()
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
        clinic_image_url: urlData.publicUrl,
      } as any);
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Could not save clinic image.");
      }
      setClinicImageUrl(urlData.publicUrl);
      await refreshProfile();
      Alert.alert("Saved", "Clinic image updated.");
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Please try again.");
    } finally {
      setUploadingClinicImage(false);
    }
  };

  const clearClinicImage = async () => {
    const result = await updateProfile({ clinic_image_url: null } as any);
    if (!result.success) {
      Alert.alert(
        "Could not remove image",
        result.error || "Please try again.",
      );
      return;
    }
    setClinicImageUrl(null);
    await refreshProfile();
    Alert.alert("Removed", "Clinic image removed.");
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Practice locations"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Therapist type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {THERAPIST_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={
                  values.therapistType === option.id ? "primary" : "outline"
                }
                onPress={() =>
                  setValues((prev) => ({ ...prev, therapistType: option.id }))
                }
              >
                {option.label}
              </Button>
            ))}
          </View>
        </Card>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Clinic image
          </Text>
          {clinicImageUrl ? (
            <Image
              source={{ uri: clinicImageUrl }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 12,
                marginBottom: 12,
              }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-charcoal-500 text-sm mb-3">
              Add a clinic photo to show in marketplace instead of map imagery.
            </Text>
          )}
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={() => void pickAndUploadClinicImage()}
              disabled={uploadingClinicImage}
            >
              {uploadingClinicImage ? (
                <ActivityIndicator />
              ) : (
                "Upload clinic image"
              )}
            </Button>
            {clinicImageUrl ? (
              <Button variant="outline" onPress={() => void clearClinicImage()}>
                Remove image
              </Button>
            ) : null}
          </View>
        </Card>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Addresses
          </Text>
          <Input
            label="Clinic address"
            value={values.clinicAddress}
            onChangeText={(text) =>
              setValues((prev) => ({ ...prev, clinicAddress: text }))
            }
          />
          <Input
            label="Base address (mobile/hybrid)"
            value={values.baseAddress}
            onChangeText={(text) =>
              setValues((prev) => ({ ...prev, baseAddress: text }))
            }
          />
          <Input
            label="Service radius (km)"
            keyboardType="number-pad"
            value={values.mobileServiceRadiusKm?.toString() ?? ""}
            onChangeText={(text) =>
              setValues((prev) => ({
                ...prev,
                mobileServiceRadiusKm: text.trim() ? Number(text) : null,
              }))
            }
          />
        </Card>

        <Card variant="default" padding="md" className="mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">
            Map pin picker
          </Text>
          <Text className="text-charcoal-500 text-sm mb-3">
            Choose which coordinates to set, then tap anywhere on the map.
          </Text>
          <View className="flex-row gap-2 mb-3">
            <Button
              variant={pinTarget === "clinic" ? "primary" : "outline"}
              onPress={() => setPinTarget("clinic")}
            >
              Set clinic pin
            </Button>
            <Button
              variant={pinTarget === "base" ? "primary" : "outline"}
              onPress={() => setPinTarget("base")}
            >
              Set base pin
            </Button>
          </View>
          <View className="rounded-xl overflow-hidden border border-cream-200">
            <MapView
              style={{ height: 250 }}
              initialRegion={LONDON_REGION}
              region={{
                latitude: markerLatitude,
                longitude: markerLongitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={onMapPress}
            >
              {values.clinicLatitude !== null &&
              values.clinicLongitude !== null ? (
                <Marker
                  coordinate={{
                    latitude: values.clinicLatitude,
                    longitude: values.clinicLongitude,
                  }}
                  pinColor="#4F7A69"
                  title="Clinic"
                />
              ) : null}
              {values.baseLatitude !== null && values.baseLongitude !== null ? (
                <Marker
                  coordinate={{
                    latitude: values.baseLatitude,
                    longitude: values.baseLongitude,
                  }}
                  pinColor="#C7775E"
                  title="Base"
                />
              ) : null}
            </MapView>
          </View>
          <Text className="text-charcoal-500 text-xs mt-2">
            Clinic pin: {values.clinicLatitude ?? "—"},{" "}
            {values.clinicLongitude ?? "—"}
          </Text>
          <Text className="text-charcoal-500 text-xs">
            Base pin: {values.baseLatitude ?? "—"},{" "}
            {values.baseLongitude ?? "—"}
          </Text>
        </Card>

        <Button
          variant="primary"
          disabled={saving}
          onPress={() => void onSave()}
        >
          {saving ? <ActivityIndicator color="#fff" /> : "Save locations"}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
