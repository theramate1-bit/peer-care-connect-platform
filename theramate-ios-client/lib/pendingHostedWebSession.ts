/**
 * One-shot payload for in-app WebView flows (Stripe checkout/portal, signed docs).
 * Avoids passing multi-kB URLs through Expo Router params.
 */

export type HostedWebSessionKind =
  | "stripe_checkout"
  | "stripe_portal"
  | "signed_document"
  /** Same-origin marketing / help pages from notification payloads */
  | "web_app";

export type PendingHostedWebSession = {
  kind: HostedWebSessionKind;
  url: string;
  /** Optional: return here when user closes WebView without a detected success URL */
  dismissPath?: string;
};

let session: PendingHostedWebSession | null = null;

export function setPendingHostedWebSession(next: PendingHostedWebSession): void {
  session = next;
}

export function takePendingHostedWebSession(): PendingHostedWebSession | null {
  const s = session;
  session = null;
  return s;
}

export function peekPendingHostedWebSession(): PendingHostedWebSession | null {
  return session;
}

export function clearPendingHostedWebSession(): void {
  session = null;
}
