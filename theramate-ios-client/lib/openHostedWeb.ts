import { router } from "expo-router";

import {
  setPendingHostedWebSession,
  type HostedWebSessionKind,
} from "@/lib/pendingHostedWebSession";

/**
 * Navigate to in-app hosted WebView (see `app/hosted-web.tsx`).
 */
export function openHostedWebSession(params: {
  kind: HostedWebSessionKind;
  url: string;
}): void {
  setPendingHostedWebSession({ kind: params.kind, url: params.url });
  router.push("/hosted-web" as never);
}
