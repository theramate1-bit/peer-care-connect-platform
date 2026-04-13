/**
 * Normalize thrown values from Supabase / fetch helpers so UI never shows "[object Object]".
 */

export function unknownToError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "string") return new Error(e);
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.trim() !== "") return new Error(msg);
    const details = o.details;
    if (typeof details === "string" && details.trim() !== "")
      return new Error(details);
    const hint = o.hint;
    if (typeof hint === "string" && hint.trim() !== "") return new Error(hint);
    try {
      return new Error(JSON.stringify(e));
    } catch {
      return new Error("Something went wrong");
    }
  }
  return new Error(String(e));
}

/** Human-readable line for React Query / UI error surfaces. */
export function formatUnknownError(e: unknown): string {
  return unknownToError(e).message;
}
