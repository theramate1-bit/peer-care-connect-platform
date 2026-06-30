/**
 * In-app WebView for Stripe Checkout / Customer Portal / signed document URLs.
 * Payload: `setPendingHostedWebSession` immediately before `router.push("/hosted-web")`.
 */

import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, Alert } from "react-native";
import { router } from "expo-router";

import { ControlledHostedWebView } from "@/components/web/ControlledHostedWebView";
import { Colors } from "@/constants/colors";
import { parseCheckoutRedirectFromUrl } from "@/lib/hostedWebViewRedirects";
import {
  peekPendingHostedWebSession,
  takePendingHostedWebSession,
} from "@/lib/pendingHostedWebSession";
import { clearStashedMobileCheckoutUrl } from "@/lib/mobileCheckoutUrlCache";
import { AppStackHeader, AppScreen } from "@/components/navigation";

export default function HostedWebScreen() {
  const session = useMemo(() => peekPendingHostedWebSession(), []);
  const consumed = useRef(false);

  const finish = useCallback(() => {
    if (!consumed.current) {
      takePendingHostedWebSession();
      consumed.current = true;
    }
  }, []);

  const handleClose = useCallback(() => {
    const dismissPath = session?.dismissPath?.trim();
    finish();
    if (dismissPath) {
      router.replace(dismissPath as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as never);
    }
  }, [session?.dismissPath, finish]);

  const handleHttpUrl = useCallback(
    (url: string) => {
      if (
        !session ||
        (session.kind !== "stripe_checkout" && session.kind !== "web_app")
      ) {
        return;
      }
      const redir = parseCheckoutRedirectFromUrl(url);
      if (!redir) return;

      if (redir.type === "connect_onboarding_return") {
        finish();
        router.replace("/onboarding/stripe-return" as never);
        return;
      }

      if (redir.type === "clinic_success") {
        finish();
        router.replace({
          pathname: "/booking-success",
          params: { session_id: redir.checkoutSessionId },
        } as never);
        return;
      }

      if (redir.type === "mobile_success") {
        finish();
        clearStashedMobileCheckoutUrl(redir.mobileRequestId);
        router.replace({
          pathname: "/mobile-booking/success",
          params: {
            mobile_request_id: redir.mobileRequestId,
            mobile_checkout_session_id: redir.checkoutSessionId,
          },
        } as never);
        return;
      }

      if (redir.type === "subscription_success") {
        finish();
        router.replace({
          pathname: "/subscription-success",
          params: { session_id: redir.checkoutSessionId },
        } as never);
        return;
      }

      if (redir.type === "canceled") {
        finish();
        router.back();
      }
    },
    [session, finish],
  );

  if (!session) {
    return (
      <AppScreen>
        <AppStackHeader title="Browser" onBackPress={() => router.back()} />
        <View className="flex-1 px-6 justify-center">
          <Text className="text-charcoal-900 text-lg font-semibold text-center">
            Nothing to open
          </Text>
          <Text className="text-charcoal-500 text-center mt-3">
            Go back and try the action again.
          </Text>
        </View>
      </AppScreen>
    );
  }

  const title =
    session.kind === "stripe_checkout"
      ? "Secure checkout"
      : session.kind === "stripe_portal"
        ? "Billing"
        : session.kind === "web_app"
          ? "Theramate"
          : "Document";

  return (
    <AppScreen>
      <AppStackHeader title={title} onBackPress={handleClose} />
      <ControlledHostedWebView
        initialUrl={session.url}
        kind={session.kind}
        onClose={handleClose}
        onUrlBlocked={(url) => {
          Alert.alert("Blocked navigation", "This link cannot be opened here.");
        }}
        onHttpUrl={handleHttpUrl}
      />
    </AppScreen>
  );
}
