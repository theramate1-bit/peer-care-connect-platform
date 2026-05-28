/**
 * Web app URLs for treatment exchange — map to native practitioner routes when possible.
 * @see docs/product/PRACTITIONER_MOBILE_REMAINING.md (practice/exchange-requests deep link)
 */

const EXCHANGE_REQUEST_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isExchangeRequestUuid(
  value: string | null | undefined,
): boolean {
  if (!value || typeof value !== "string") return false;
  const t = value.trim();
  return t.length > 0 && !t.includes(" ") && EXCHANGE_REQUEST_UUID_RE.test(t);
}

/** Extract request id from `/practice/exchange-requests?request=<uuid>`. */
export function parsePracticeExchangeRequestId(
  urlOrPath: string,
): string | null {
  const raw = (urlOrPath || "").trim();
  if (!raw) return null;

  let pathname = raw;
  let search = "";

  try {
    const u = new URL(
      raw.includes("://")
        ? raw
        : `https://local.invalid${raw.startsWith("/") ? "" : "/"}${raw}`,
    );
    pathname = u.pathname;
    search = u.search;
  } catch {
    const q = raw.indexOf("?");
    if (q >= 0) {
      pathname = raw.slice(0, q);
      search = raw.slice(q);
    }
  }

  const path = pathname.replace(/\/+$/, "").toLowerCase();
  if (path !== "/practice/exchange-requests") return null;

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const id =
    params.get("request") ??
    params.get("request_id") ??
    params.get("requestId");
  return isExchangeRequestUuid(id) ? id!.trim() : null;
}
