/**
 * Marketplace seller hub — profile visibility and listed services.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  fetchPractitionerProducts,
  setPractitionerProductActive,
} from "@/lib/api/practitionerProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

export default function MarketplaceSellerScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["therapist_profile_marketplace", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("therapist_profiles")
        .select(
          "id, is_active, average_rating, total_reviews, profile_completion_status",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        is_active: boolean | null;
        average_rating: number | null;
        total_reviews: number | null;
        profile_completion_status: string | null;
      } | null;
    },
    enabled: !!userId,
  });

  const productsQuery = useQuery({
    queryKey: ["practitioner_products", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPractitionerProducts(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const toggleListing = async (productId: string, next: boolean) => {
    if (!userId) return;
    setBusyId(productId);
    try {
      const res = await setPractitionerProductActive({
        productId,
        practitionerId: userId,
        isActive: next,
      });
      if (!res.ok) {
        Alert.alert("Could not update", res.error?.message || "");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_products", userId],
      });
    } finally {
      setBusyId(null);
    }
  };

  const tp = profileQuery.data;

  if (!userId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Text className="text-charcoal-900 text-xl font-semibold text-center">
            Practitioner sign-in required
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to manage marketplace listings,
            services, and visibility.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as never)}
          >
            Create practitioner account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
        <ScreenHeader
          className="-mx-6 -mt-4 mb-2"
          eyebrow="Practice"
          title="Marketplace"
          subtitle="Seller hub for visibility, listings, and service catalogue."
        />
        <Text className="text-charcoal-600 leading-6 mb-4">
          Control how you appear in search and manage listed services. Create and
          edit services and profile tools directly in app.
        </Text>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Button
          variant="primary"
          className="mb-3"
          onPress={() =>
            router.push(tabPath(tabRoot, "marketplace/product/new") as never)
          }
        >
          Add service
        </Button>

        {profileQuery.isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} />
        ) : !tp ? (
          <Text className="text-charcoal-500 mb-6">
            No therapist profile row yet - complete onboarding in app.
          </Text>
        ) : (
          <Card variant="default" padding="md" className="mb-6">
            <Text className="text-charcoal-900 font-semibold">Listing health</Text>
            <Text className="text-charcoal-600 text-sm mt-2">
              Profile: {tp.profile_completion_status || "—"}
            </Text>
            <Text className="text-charcoal-600 text-sm mt-1">
              Rating: {tp.average_rating ?? "—"} ({tp.total_reviews ?? 0} reviews)
            </Text>
            <Text className="text-charcoal-600 text-sm mt-1">
              Discoverable: {tp.is_active ? "Yes" : "No"}
            </Text>
          </Card>
        )}

        <Text className="text-charcoal-900 font-bold text-lg mb-3">
          Your services
        </Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Tap a service to edit price and details, or toggle active for booking.
        </Text>

        {productsQuery.isLoading ? (
          <ActivityIndicator color={Colors.sage[500]} />
        ) : (productsQuery.data?.length ?? 0) === 0 ? (
          <Text className="text-charcoal-500">No products yet — add a service above.</Text>
        ) : (
          productsQuery.data?.map((p) => (
            <Card key={p.id} variant="default" padding="md" className="mb-3">
              <View className="flex-row justify-between items-center">
                <TouchableOpacity
                  className="flex-1 pr-3"
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(
                      tabPath(
                        tabRoot,
                        `marketplace/product/${p.id}`,
                      ) as never,
                    )
                  }
                >
                  <Text className="text-charcoal-900 font-medium">{p.name}</Text>
                  <Text className="text-charcoal-500 text-sm mt-1">
                    {p.duration_minutes ?? "—"} min ·{" "}
                    {p.price_amount != null
                      ? `£${(Number(p.price_amount) / 100).toFixed(2)}`
                      : "—"}
                  </Text>
                  <Text className="text-sage-600 text-xs mt-1">Edit</Text>
                </TouchableOpacity>
                <Switch
                  value={p.is_active === true}
                  disabled={busyId === p.id}
                  onValueChange={(v) => void toggleListing(p.id, v)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
