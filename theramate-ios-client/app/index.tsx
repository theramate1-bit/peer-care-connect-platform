import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useRootNavigationState } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { Colors } from "@/constants/colors";

/**
 * Entry gate: wait for auth bootstrap, then send users to main app or hero (role picker).
 * Loading UI uses white + sage (not cream #FFFDF8) so it reads as “after splash”, not stuck native splash.
 * Navigation runs only after root navigator is mounted (expo-router requirement).
 */
export default function IndexGate() {
  const { isInitialized, isAuthenticated } = useAuth();
  const rootNavigation = useRootNavigationState();
  const didNavigate = useRef(false);

  useEffect(() => {
    if (rootNavigation?.key == null) return;
    if (!isInitialized || didNavigate.current) return;

    if (!isAuthenticated) {
      didNavigate.current = true;
      router.replace("/hero");
      return;
    }

    didNavigate.current = true;
    void (async () => {
      await useAuthStore.getState().refreshProfile();
      const role = useAuthStore.getState().userProfile?.user_role;
      router.replace(getMainAppHref(role));
    })();
  }, [rootNavigation?.key, isAuthenticated, isInitialized]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.sage[500]} />
      <Text style={styles.label}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  label: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.charcoal[600],
  },
});
