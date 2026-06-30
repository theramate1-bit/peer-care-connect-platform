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
import { CalendarClock, CalendarDays } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchPractitionerProducts } from "@/lib/api/practitionerProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AppStackHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";

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
      <TabScreen>
        <View className="flex-1 px-6 pt-8 items-center justify-center pb-16">
          <Text className="text-charcoal-900 text-xl font-semibold text-center">
            Practitioner sign-in required
          </Text>
          <Text className="text-charcoal-500 text-center mt-3 leading-6">
            Sign in with your practitioner account to manage services,
            availability, and your diary.
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
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <AppStackHeader
        title="Services & availability"
        subtitle="Hours, diary, and catalogue"
        fallbackHref={tabPath(tabRoot, "profile")}
      />

      <TabScreenScroll
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={Colors.sage[500]}
          />
        }
      >
        <Text className="text-charcoal-600 leading-6 mb-5">
          Manage weekly hours, blocked time, your diary, inbuilt calendar tools,
          and your service catalogue. Availability matches the web app: Working
          hours and Blocked time tabs.
        </Text>

        <Text className="text-charcoal-800 text-xs font-semibold uppercase tracking-wide mb-2">
          In this app
        </Text>
        <Card
          variant="default"
          padding="md"
          className="mb-4 border border-cream-200"
        >
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
            onPress={() => router.push(tabPath(tabRoot, "schedule") as never)}
          >
            Diary (month, week, day)
          </Button>
          <Button
            variant="outline"
            className="mb-3"
            leftIcon={<CalendarClock size={18} color={Colors.sage[600]} />}
            onPress={() =>
              router.push(tabPath(tabRoot, "calendar-sync") as never)
            }
          >
            Calendar tools
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

        <Text className="text-charcoal-900 font-bold text-base mb-1">
          Your products
        </Text>
        <Text className="text-charcoal-500 text-sm mb-3">
          Pricing and duration shown below; open a product to edit on the
          marketplace.
        </Text>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : products.length === 0 ? (
          <Card
            variant="default"
            padding="md"
            className="border border-cream-200"
          >
            <Text className="text-charcoal-600 leading-6">
              No products yet. Add services from{" "}
              <Text className="font-semibold text-charcoal-800">
                Marketplace & catalogue
              </Text>{" "}
              above.
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
              <Card
                variant="default"
                padding="md"
                className="mb-3 border border-cream-200"
              >
                <Text className="text-charcoal-900 font-semibold">
                  {p.name}
                </Text>
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
      </TabScreenScroll>
    </TabScreen>
  );
}
