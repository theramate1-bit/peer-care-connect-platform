/**
 * Extended parameterized tests for error handling
 */
import { ErrorType, getErrorType, createLoadingState, createRetryConfig } from "@/lib/error-handling";

describe("error-handling extended", () => {
  describe("getErrorType message patterns", () => {
    it.each([
      ["Failed to fetch", ErrorType.NETWORK],
      ["Invalid login credentials", ErrorType.AUTHENTICATION],
      ["No rows returned", ErrorType.NOT_FOUND],
      ["permission denied", ErrorType.AUTHORIZATION],
      ["required field", ErrorType.VALIDATION],
    ] as const)("message '%s' maps to %s", (msg, expected) => {
      expect(getErrorType({ message: msg })).toBe(expected);
    });
  });

  describe("createLoadingState", () => {
    it("always returns isLoading true", () => {
      expect(createLoadingState().isLoading).toBe(true);
      expect(createLoadingState("Custom").isLoading).toBe(true);
    });
  });

  describe("createRetryConfig", () => {
    it("onRetry is the passed function", () => {
      const fn = jest.fn();
      expect(createRetryConfig(fn).onRetry).toBe(fn);
    });
  });
});
