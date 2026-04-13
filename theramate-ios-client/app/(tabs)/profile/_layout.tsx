import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/hooks/useAuth";

export default function ProfileStackLayout() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (isInitialized && !isAuthenticated) {
    return <Redirect href="/explore" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
