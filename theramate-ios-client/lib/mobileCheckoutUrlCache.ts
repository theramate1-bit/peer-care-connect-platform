/** Retain mobile-request Stripe Checkout URLs for reopen from pending (avoid huge route params). */

const MAX = 20;
const map = new Map<string, string>();

export function stashMobileCheckoutUrl(requestId: string, checkoutUrl: string): void {
  if (map.size >= MAX) {
    const first = map.keys().next().value;
    if (first) map.delete(first);
  }
  map.set(requestId, checkoutUrl);
}

export function getStashedMobileCheckoutUrl(requestId: string): string | null {
  return map.get(requestId) ?? null;
}

export function clearStashedMobileCheckoutUrl(requestId: string): void {
  map.delete(requestId);
}
