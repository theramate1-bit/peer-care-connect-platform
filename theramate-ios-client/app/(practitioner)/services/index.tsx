/**
 * Services & availability — weekly hours, diary, and catalogue.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, CalendarDays } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchPractitionerProducts } from "@/lib/api/practitionerProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PractitionerServicesScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();

  const {
    data: products = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["practitioner_products", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchPractitionerProducts(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

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
            Sign in with your practitioner account to manage services, availability,
            and scheduler shortcuts.
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
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "profile"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Services & availability
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Hours, diary, and catalogue
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <Text className="text-charcoal-600 leading-6 mb-5">
          Manage weekly hours, your diary, and your service catalogue here. Open the
          diary for month and day views; use weekly hours for when clients can book.
        </Text>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Card variant="default" padding="md" className="mb-4 border border-cream-200">
          <Button
            variant="primary"
            className="mb-3"
            onPress={() =>
              router.push(tabPath(tabRoot, "availability") as never)
            }
          >
            Weekly hours
          </Button>
          <Button
            variant="outline"
            className="mb-3"
            leftIcon={<CalendarDays size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.push(tabPath(tabRoot, "schedule") as never)
            }
          >
            Diary - month and day detail
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              router.push(tabPath(tabRoot, "marketplace") as never)
            }
          >
            Marketplace and catalogue
          </Button>
        </Card>

        <Text className="text-charcoal-900 font-bold text-base mb-1">Your products</Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Pricing and duration shown below; open a product to edit on the marketplace.
        </Text>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : products.length === 0 ? (
          <Card variant="default" padding="md" className="border border-cream-200">
            <Text className="text-charcoal-600 leading-6">
              No products yet. Add services from{" "}
              <Text className="font-semibold text-charcoal-800">Marketplace & catalogue</Text> above.
            </Text>
            <Button
              variant="outline"
              className="mt-4"
              onPress={() =>
                router.push(tabPath(tabRoot, "marketplace") as never)
              }
            >
              Go to marketplace
            </Button>
          </Card>
        ) : (
          products.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push(
                  tabPath(tabRoot, `marketplace/product/${p.id}`) as never,
                )
              }
            >
              <Card variant="default" padding="md" className="mb-3 border border-cream-200">
                <Text className="text-charcoal-900 font-semibold">{p.name}</Text>
                <Text className="text-charcoal-500 text-sm mt-1">
                  {p.duration_minutes ?? "—"} min ·{" "}
                  {p.price_amount != null
                    ? `£${(Number(p.price_amount) / 100).toFixed(2)}`
                    : "—"}{" "}
                  · {p.is_active ? "Active" : "Inactive"}
                </Text>
                <Text className="text-sage-600 text-xs mt-1">Tap to edit</Text>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
