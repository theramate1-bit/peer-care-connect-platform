import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import {
  clearPendingOAuthSignupRole,
  getPendingOAuthSignupRole,
} from "@/lib/oauthPendingRole";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { useAuthStore } from "@/stores/authStore";
import { getMainAppHref } from "@/lib/postAuthRoute";
import type { UserRole } from "@/types/database";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function namesFromOAuthUser(user: SupabaseAuthUser): {
  first_name: string;
  last_name: string;
  full_name: string;
} {
  const m = user.user_metadata || {};
  const fullName =
    typeof m.full_name === "string"
      ? m.full_name
      : typeof m.name === "string"
        ? m.name
        : "";
  let first =
    typeof m.given_name === "string"
      ? m.given_name
      : typeof m.first_name === "string"
        ? m.first_name
        : "";
  let last =
    typeof m.family_name === "string"
      ? m.family_name
      : typeof m.last_name === "string"
        ? m.last_name
        : "";
  if (!first && fullName) {
    const parts = fullName.trim().split(/\s+/);
    first = parts[0] || "User";
    last = parts.slice(1).join(" ") || "";
  }
  if (!first) first = "User";
  const full =
    [first, last].filter(Boolean).join(" ").trim() || fullName || "User";
  return { first_name: first, last_name: last, full_name: full };
}

export default function OAuthCompletionScreen() {
  const { isInitialized } = useAuth();
  const [statusMessage, setStatusMessage] = React.useState(
    "Completing sign-in…",
  );
  const [timedOut, setTimedOut] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [fatalError, setFatalError] = React.useState<string | null>(null);

  const runFlow = React.useCallback(async () => {
    setTimedOut(false);
    setFatalError(null);
    setStatusMessage("Completing sign-in…");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        setFatalError(sessionError?.message || "No active session found.");
        return;
      }

      const authUser = sessionData.session.user;
      const userId = authUser.id;
      setStatusMessage("Loading your profile…");

      const pendingRole = await getPendingOAuthSignupRole();
      if (pendingRole) {
        const { data: row } = await supabase
          .from("users")
          .select("id,user_role")
          .eq("id", userId)
          .maybeSingle();

        const names = namesFromOAuthUser(authUser);
        const dbRole: UserRole =
          pendingRole === "client" ? "client" : "sports_therapist";

        if (!row) {
          const { error: insErr } = await supabase.from("users").upsert(
            {
              id: userId,
              email: authUser.email ?? "",
              first_name: names.first_name,
              last_name: names.last_name,
              full_name: names.full_name,
              user_role: dbRole,
              onboarding_status: "pending",
            },
            { onConflict: "id" },
          );
          if (insErr) {
            setFatalError(insErr.message);
            await clearPendingOAuthSignupRole();
            return;
          }
        } else if (!row.user_role) {
          const { error: upErr } = await supabase
            .from("users")
            .update({ user_role: dbRole })
            .eq("id", userId);
          if (upErr) {
            setFatalError(upErr.message);
            await clearPendingOAuthSignupRole();
            return;
          }
        }
        await clearPendingOAuthSignupRole();
      }

      let profile: {
        user_role?: string | null;
        onboarding_status?: string | null;
      } | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data, error } = await supabase
          .from("users")
          .select("user_role,onboarding_status")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          setFatalError(error.message);
          return;
        }
        if (data) {
          profile = data;
          break;
        }
        await sleep(500);
      }

      if (!profile || !profile.user_role) {
        setStatusMessage("Selecting account role…");
        router.replace("/role-selection");
        return;
      }

      // Insert/update above can race the auth listener — store may still have no `userProfile`.
      // Onboarding’s `updateProfile` requires it; refresh before leaving this screen.
      await useAuthStore.getState().refreshProfile();

      // Only clients use the in-app onboarding flow; practitioners may use other surfaces.
      if (profile.user_role === "client" && profile.onboarding_status !== "completed") {
        setStatusMessage("Opening onboarding…");
        router.replace("/onboarding");
        return;
      }

      setStatusMessage("Opening your dashboard…");
      router.replace(getMainAppHref(profile.user_role));
    } catch (e: any) {
      setFatalError(e?.message || "Could not finish sign-in.");
    }
  }, []);

  React.useEffect(() => {
    if (!isInitialized) return;
    void runFlow();
  }, [isInitialized, runFlow]);

  React.useEffect(() => {
    if (fatalError) return;
    const t = setTimeout(() => {
      setTimedOut(true);
      setStatusMessage("Sign-in is taking longer than expected.");
    }, 15000);
    return () => clearTimeout(t);
  }, [fatalError]);

  const onRetry = async () => {
    setIsRetrying(true);
    try {
      await runFlow();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2">
        <AuthBackHeader fallbackHref="/login" label="Sign in" />
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color={Colors.sage[500]} />
        <Text className="text-charcoal-600 mt-4 text-center">
          {statusMessage}
        </Text>

        {fatalError && (
          <View className="w-full mt-6">
            <View className="bg-errorLight px-4 py-3 rounded-lg mb-3">
              <Text className="text-error text-sm">{fatalError}</Text>
            </View>
            <Button
              variant="primary"
              onPress={() => void onRetry()}
              isLoading={isRetrying}
            >
              Retry
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => router.replace("/login")}
            >
              Back to sign in
            </Button>
          </View>
        )}

        {!fatalError && timedOut && (
          <View className="w-full mt-6">
            <Button
              variant="outline"
              onPress={() => void onRetry()}
              isLoading={isRetrying}
            >
              Try again
            </Button>
            <Button
              variant="primary"
              className="mt-3"
              onPress={() => router.replace("/login")}
            >
              <Text className="text-white font-semibold">Back to sign in</Text>
            </Button>
          </View>
        )}

        {!fatalError && !timedOut && isRetrying && (
          <View className="w-full mt-6">
            <Button
              variant="primary"
              onPress={() => router.replace("/login")}
            >
              <Text className="text-white font-semibold">Back to sign in</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
