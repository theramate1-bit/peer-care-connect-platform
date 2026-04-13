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
import { ChevronLeft } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  PRACTITIONER_PRODUCT_DURATIONS,
  deletePractitionerProductStripe,
  fetchPractitionerProducts,
  updatePractitionerProductStripe,
} from "@/lib/api/practitionerProducts";
import { Button } from "@/components/ui/Button";

const SERVICE_TYPES = ["clinic", "mobile", "both"] as const;

function gbpFromPence(pence: number | null | undefined): string {
  if (pence == null || Number.isNaN(Number(pence))) return "";
  return (Number(pence) / 100).toFixed(2);
}

export default function EditPractitionerProductScreen() {
  const tabRoot = useTabRoot();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["practitioner_products", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPractitionerProducts(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!id,
  });

  const product = useMemo(
    () => products.find((p) => p.id === id),
    [products, id],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePounds, setPricePounds] = useState("");
  const [duration, setDuration] =
    useState<(typeof PRACTITIONER_PRODUCT_DURATIONS)[number]>(60);
  const [serviceType, setServiceType] =
    useState<(typeof SERVICE_TYPES)[number]>("clinic");
  const [isActive, setIsActive] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (!product || hydrated) return;
    setName(product.name);
    setDescription(product.description ?? "");
    setPricePounds(gbpFromPence(product.price_amount));
    const d = product.duration_minutes ?? 60;
    setDuration(
      PRACTITIONER_PRODUCT_DURATIONS.includes(
        d as (typeof PRACTITIONER_PRODUCT_DURATIONS)[number],
      )
        ? (d as (typeof PRACTITIONER_PRODUCT_DURATIONS)[number])
        : 60,
    );
    const st = (product.service_type || "clinic").toLowerCase();
    setServiceType(
      SERVICE_TYPES.includes(st as (typeof SERVICE_TYPES)[number])
        ? (st as (typeof SERVICE_TYPES)[number])
        : "clinic",
    );
    setIsActive(product.is_active !== false);
    setHydrated(true);
  }, [product, hydrated]);

  const onSave = async () => {
    if (!userId || !id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Enter a service name.");
      return;
    }
    const pounds = parseFloat(pricePounds.replace(/,/g, "."));
    if (Number.isNaN(pounds) || pounds < 0.5) {
      Alert.alert("Invalid price", "Enter a price of at least £0.50.");
      return;
    }
    const pence = Math.round(pounds * 100);
    setBusy(true);
    try {
      const { error } = await updatePractitionerProductStripe({
        productId: id,
        patch: {
          name: trimmed,
          description: description.trim() || null,
          price_amount: pence,
          duration_minutes: duration,
          service_type: serviceType,
          is_active: isActive,
        },
      });
      if (error) {
        Alert.alert("Could not save", error.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_products", userId],
      });
      Alert.alert("Saved", "Your service was updated.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(
      "Remove service",
      "This will remove the listing from your profile and archive it in Stripe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void confirmDelete(),
        },
      ],
    );
  };

  const confirmDelete = async () => {
    if (!userId || !id) return;
    setDeleting(true);
    try {
      const { ok, error } = await deletePractitionerProductStripe({
        productId: id,
      });
      if (!ok) {
        Alert.alert("Could not delete", error?.message || "");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_products", userId],
      });
      router.replace(tabPath(tabRoot, "marketplace") as never);
    } finally {
      setDeleting(false);
    }
  };

  if (!userId) {
    router.replace("/login");
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
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
            Edit service
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Price, duration, and visibility for your public listings.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : !product ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-charcoal-600 text-center">
            Service not found.
          </Text>
          <Button
            variant="outline"
            className="mt-4"
            onPress={() =>
              goBackOrReplace(tabPath(tabRoot, "marketplace"))
            }
          >
            <Text className="text-charcoal-800 font-medium">Back</Text>
          </Button>
        </View>
      ) : !hydrated ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-charcoal-700 text-sm mb-1">Name</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            value={name}
            onChangeText={setName}
          />

          <Text className="text-charcoal-700 text-sm mb-1">Description</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4 min-h-[88px]"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text className="text-charcoal-700 text-sm mb-1">Price (GBP)</Text>
          <TextInput
            className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
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
                    duration === d
                      ? "text-white font-medium"
                      : "text-charcoal-800"
                  }
                >
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-charcoal-700 text-sm mb-2">Where offered</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
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

          <TouchableOpacity
            onPress={() => setIsActive(!isActive)}
            className="flex-row items-center justify-between bg-white border border-cream-200 rounded-xl px-4 py-3 mb-6"
          >
            <Text className="text-charcoal-800 font-medium">Active listing</Text>
            <Text className={isActive ? "text-sage-600" : "text-charcoal-400"}>
              {isActive ? "On" : "Off"}
            </Text>
          </TouchableOpacity>

          <Button variant="primary" disabled={busy} onPress={() => void onSave()}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save changes</Text>
            )}
          </Button>

          <Button
            variant="outline"
            className="mt-3"
            disabled={deleting}
            onPress={onDelete}
          >
            <Text className="text-red-600 font-semibold">
              {deleting ? "Removing…" : "Delete service"}
            </Text>
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
