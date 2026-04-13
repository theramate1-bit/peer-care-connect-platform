import React, { useState } from "react";
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
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  PRACTITIONER_PRODUCT_DURATIONS,
  createPractitionerProductStripe,
} from "@/lib/api/practitionerProducts";
import { Button } from "@/components/ui/Button";

const SERVICE_TYPES = ["clinic", "mobile", "both"] as const;

export default function NewPractitionerProductScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePounds, setPricePounds] = useState("");
  const [duration, setDuration] =
    useState<(typeof PRACTITIONER_PRODUCT_DURATIONS)[number]>(60);
  const [serviceType, setServiceType] =
    useState<(typeof SERVICE_TYPES)[number]>("clinic");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Enter a service name.");
      return;
    }
    const pounds = parseFloat(pricePounds.replace(/,/g, "."));
    if (Number.isNaN(pounds) || pounds < 0.5) {
      Alert.alert(
        "Invalid price",
        "Enter a price of at least £0.50 (Stripe minimum).",
      );
      return;
    }
    const pence = Math.round(pounds * 100);
    if (pence < 50) {
      Alert.alert("Invalid price", "Minimum charge is £0.50.");
      return;
    }
    setBusy(true);
    try {
      const { product, error } = await createPractitionerProductStripe({
        practitionerId: userId,
        name: trimmed,
        description: description.trim() || null,
        priceAmountPence: pence,
        durationMinutes: duration,
        serviceType,
      });
      if (error || !product) {
        Alert.alert(
          "Could not create service",
          error?.message || "Check Stripe Connect is complete.",
        );
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_products", userId],
      });
      router.replace(
        tabPath(tabRoot, `marketplace/product/${product.id}`) as never,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-cream-50"
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "marketplace"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            New service
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Bookable Stripe service for your marketplace listings.
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-500 text-sm mb-4">
          Creates a bookable service on your Stripe Connect account. You need
          Connect onboarding completed.
        </Text>

        <Text className="text-charcoal-700 text-sm mb-1">Name</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
          placeholder="e.g. Sports massage 60 min"
          placeholderTextColor={Colors.charcoal[400]}
          value={name}
          onChangeText={setName}
        />

        <Text className="text-charcoal-700 text-sm mb-1">Description</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[88px]"
          placeholder="Optional"
          placeholderTextColor={Colors.charcoal[400]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text className="text-charcoal-700 text-sm mb-1">Price (GBP)</Text>
        <TextInput
          className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
          placeholder="e.g. 65.00"
          placeholderTextColor={Colors.charcoal[400]}
          value={pricePounds}
          onChangeText={setPricePounds}
          keyboardType="decimal-pad"
        />

        <Text className="text-charcoal-700 text-sm mb-2">Duration</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {PRACTITIONER_PRODUCT_DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDuration(d)}
              className={`px-4 py-2 rounded-full border ${
                duration === d
                  ? "bg-sage-500 border-sage-500"
                  : "bg-white border-cream-200"
              }`}
            >
              <Text
                className={
                  duration === d ? "text-white font-medium" : "text-charcoal-800"
                }
              >
                {d} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-charcoal-700 text-sm mb-2">Where offered</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {SERVICE_TYPES.map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setServiceType(st)}
              className={`px-4 py-2 rounded-full border ${
                serviceType === st
                  ? "bg-sage-500 border-sage-500"
                  : "bg-white border-cream-200"
              }`}
            >
              <Text
                className={
                  serviceType === st
                    ? "text-white font-medium capitalize"
                    : "text-charcoal-800 capitalize"
                }
              >
                {st.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button variant="primary" disabled={busy} onPress={() => void onSubmit()}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Create service</Text>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
