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
  /** When user closes WebView without a detected success URL (e.g. guest booking). */
  dismissPath?: string;
}): void {
  setPendingHostedWebSession({
    kind: params.kind,
    url: params.url,
    dismissPath: params.dismissPath,
  });
  router.push("/hosted-web" as never);
}
