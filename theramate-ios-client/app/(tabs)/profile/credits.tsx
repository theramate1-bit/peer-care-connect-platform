import React from "react";
import { View, Text } from "react-native";
import { Redirect, router, type Href } from "expo-router";

import { CreditsContent } from "@/components/profile/CreditsContent";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { isClientTabRoot } from "@/lib/signedInRoutes";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function ClientCreditsScreen() {
  const tabRoot = useTabRoot();
  const { userId, isAuthenticated, isInitialized } = useAuth();
  const back = defaultSignedInProfileHref();

  if (isClientTabRoot(tabRoot)) {
    return <Redirect href={tabPath(tabRoot, "profile") as Href} />;
  }

  if (isInitialized && (!isAuthenticated || !userId)) {
    return (
      <TabScreen>
        <AppStackHeader title="Credits" fallbackHref={back} />
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-900 text-xl font-bold">
            Sign in required
          </Text>
          <Text className="text-charcoal-500 mt-3 leading-6">
            Sign in to view your credit balance and activity.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace("/login" as never)}
          >
            Sign in
          </Button>
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <AppStackHeader title="Credits" fallbackHref={back} />
      {userId ? (
        <CreditsContent
          variant="client"
          userId={userId}
          queryEnabled={isAuthenticated}
          refetchOnFocus
        />
      ) : null}
    </TabScreen>
  );
}
