import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { isAllowedHostedNavigationUrl } from "@/lib/hostedWebViewAllowlist";
import type { HostedWebSessionKind } from "@/lib/pendingHostedWebSession";

export type ControlledHostedWebViewProps = {
  initialUrl: string;
  kind: HostedWebSessionKind;
  onClose: () => void;
  /** Fired when a URL is about to load; return false to block. */
  onUrlBlocked?: (url: string) => void;
  /** Observed navigations (https only) for success detection */
  onHttpUrl?: (url: string) => void;
  /** When false, only the WebView is shown (parent supplies the app header). */
  showToolbar?: boolean;
};

function kindToMode(
  kind: HostedWebSessionKind,
):
  | "stripe_checkout"
  | "stripe_portal"
  | "signed_document"
  | "web_app" {
  if (kind === "signed_document") return "signed_document";
  if (kind === "stripe_portal") return "stripe_portal";
  if (kind === "web_app") return "web_app";
  return "stripe_checkout";
}

export function ControlledHostedWebView({
  initialUrl,
  kind,
  onClose,
  onUrlBlocked,
  onHttpUrl,
  showToolbar = true,
}: ControlledHostedWebViewProps) {
  const mode = useMemo(() => kindToMode(kind), [kind]);

  const allowRequest = useCallback(
    (url: string): boolean => {
      const ok = isAllowedHostedNavigationUrl(url, mode);
      if (!ok) onUrlBlocked?.(url);
      return ok;
    },
    [mode, onUrlBlocked],
  );

  const onNavChange = useCallback(
    (nav: { url?: string }) => {
      const url = nav.url;
      if (!url) return;
      if (url.startsWith("http")) {
        onHttpUrl?.(url);
      }
    },
    [onHttpUrl],
  );

  return (
    <View style={styles.flex}>
      {showToolbar ? (
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <WebView
        source={{ uri: initialUrl }}
        style={styles.flex}
        startInLoadingState
        onNavigationStateChange={onNavChange}
        onShouldStartLoadWithRequest={(req) => {
          const ok = allowRequest(req.url);
          if (ok && req.url.startsWith("http")) {
            onHttpUrl?.(req.url);
          }
          return ok;
        }}
        setSupportMultipleWindows={false}
        originWhitelist={["https", "http"]}
        renderLoading={() => (
          <View style={styles.webLoading}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.cream[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream[200],
  },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: {
    color: Colors.sage[600],
    fontWeight: "600",
    fontSize: 16,
  },
  webLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.cream[50],
  },
  loadingText: {
    marginTop: 8,
    color: Colors.charcoal[500],
  },
});
