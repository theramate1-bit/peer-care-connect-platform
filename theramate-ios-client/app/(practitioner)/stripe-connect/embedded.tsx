import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ChevronLeft } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { APP_CONFIG, API_CONFIG } from "@/constants/config";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createConnectAccountSession } from "@/lib/api/stripeConnectEmbedded";
import { fetchConnectAccountStatus } from "@/lib/api/stripeConnect";

function buildEmbeddedConnectHtml(
  publishableKey: string,
  clientSecret: string,
): string {
  const pk = JSON.stringify(publishableKey);
  const cs = JSON.stringify(clientSecret);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
  html,body{margin:0;padding:0;min-height:100%;background:#faf9f6;}
  #root{min-height:100%;}
  #err{color:#b45309;padding:16px;font-size:14px;}
</style>
</head>
<body>
<div id="root"></div>
<div id="err"></div>
<script type="module">
const pk = ${pk};
const cs = ${cs};
const errEl = document.getElementById('err');
function post(msg) {
  try { window.ReactNativeWebView?.postMessage(String(msg)); } catch (e) {}
}
(async () => {
  try {
    const mod = await import('https://esm.sh/@stripe/connect-js@3.3.27');
    const load = mod.loadConnectAndInitialize;
    if (typeof load !== 'function') throw new Error('Stripe Connect loader unavailable');
    const instance = load({
      publishableKey: pk,
      fetchClientSecret: async () => cs,
      appearance: { overlays: 'dialog' },
    });
    const el = instance.create('account-onboarding');
    if (el && typeof el.setOnExit === 'function') {
      el.setOnExit(() => post('exit'));
    }
    document.getElementById('root').appendChild(el);
    post('ready');
  } catch (e) {
    const m = e && e.message ? e.message : String(e);
    errEl.textContent = m;
    post('error:' + m);
  }
})();
</script>
</body>
</html>`;
}

export default function StripeConnectEmbeddedScreen() {
  const tabRoot = useTabRoot();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  const baseUrl = useMemo(
    () => APP_CONFIG.WEB_URL.replace(/\/$/, "") || "https://theramate.com",
    [],
  );

  const pk = API_CONFIG.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

  const bootstrap = useCallback(async () => {
    if (!userId || !pk) {
      setErr(
        !pk
          ? "Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to build embedded Connect."
          : "Not signed in.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const status = await fetchConnectAccountStatus(userId);
      if (status.error) throw status.error;
      if (status.notConnected || !status.data?.stripe_account_id) {
        setErr(
          "Create a Connect account in the app first, then return here.",
        );
        setLoading(false);
        return;
      }
      const session = await createConnectAccountSession({
        stripeAccountId: status.data.stripe_account_id,
      });
      if (session.error || !session.clientSecret) {
        throw session.error ?? new Error("No client secret from server");
      }
      setHtml(buildEmbeddedConnectHtml(pk, session.clientSecret));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, pk]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    const d = e.nativeEvent.data;
    if (d === "exit") {
      void queryClient.invalidateQueries({
        queryKey: ["stripe_connect_status", userId],
      });
      goBackOrReplace(tabPath(tabRoot, "stripe-connect"));
      return;
    }
    if (d.startsWith("error:")) {
      Alert.alert("Stripe Connect", d.slice(6));
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "stripe-connect"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Stripe onboarding
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Embedded Connect — finish requirements without leaving the app.
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={Colors.sage[500]} />
          <Text className="text-charcoal-500 text-sm mt-4 px-6 text-center">
            Loading secure onboarding…
          </Text>
        </View>
      ) : err ? (
        <View className="flex-1 px-6 pt-6">
          <Text className="text-charcoal-700 leading-6">{err}</Text>
          <TouchableOpacity
            className="mt-6 bg-sage-600 rounded-xl py-3 px-4"
            onPress={() => void bootstrap()}
          >
            <Text className="text-white font-semibold text-center">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : html ? (
        <WebView
          source={{ html, baseUrl: `${baseUrl}/` }}
          style={{ flex: 1, backgroundColor: Colors.cream[50] }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          originWhitelist={["https://*", "http://*"]}
          startInLoadingState
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
        />
      ) : null}
    </SafeAreaView>
  );
}
