/** Normalize unknown catch values for logging and UI messages. */
export function unknownToError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
