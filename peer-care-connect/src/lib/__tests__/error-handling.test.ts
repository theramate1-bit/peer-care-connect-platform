import {
  ErrorType,
  getErrorType,
  createLoadingState,
  createRetryConfig,
  createRetryWithBackoff,
  TOAST_DURATIONS,
} from "@/lib/error-handling";

describe("error-handling", () => {
  describe("getErrorType", () => {
    it("returns UNKNOWN for null/undefined", () => {
      expect(getErrorType(null)).toBe(ErrorType.UNKNOWN);
      expect(getErrorType(undefined)).toBe(ErrorType.UNKNOWN);
    });

    it("maps NETWORK_ERROR to NETWORK", () => {
      expect(getErrorType({ code: "NETWORK_ERROR" })).toBe(ErrorType.NETWORK);
    });

    it("maps PGRST116 (no rows) to NOT_FOUND", () => {
      expect(getErrorType({ code: "PGRST116" })).toBe(ErrorType.NOT_FOUND);
    });

    it("maps invalid_credentials to AUTHENTICATION", () => {
      expect(getErrorType({ code: "invalid_credentials" })).toBe(ErrorType.AUTHENTICATION);
    });

    it("maps 42501 to AUTHORIZATION", () => {
      expect(getErrorType({ code: "42501" })).toBe(ErrorType.AUTHORIZATION);
    });

    it("maps 23502 (not null violation) to VALIDATION", () => {
      expect(getErrorType({ code: "23502" })).toBe(ErrorType.VALIDATION);
    });

    it("uses message content for network when no code", () => {
      expect(getErrorType({ message: "Failed to fetch" })).toBe(ErrorType.NETWORK);
    });

    it("uses message content for authentication", () => {
      expect(getErrorType({ message: "Invalid login credentials" })).toBe(ErrorType.AUTHENTICATION);
    });

    it("uses message content for not found", () => {
      expect(getErrorType({ message: "No rows returned" })).toBe(ErrorType.NOT_FOUND);
    });

    it("uses status 500 for SERVER", () => {
      expect(getErrorType({ status: 500 })).toBe(ErrorType.SERVER);
    });

    it("returns UNKNOWN when nothing matches", () => {
      expect(getErrorType({ code: "SOME_OTHER_CODE" })).toBe(ErrorType.UNKNOWN);
    });
    it("maps ECONNREFUSED to NETWORK", () => {
      expect(getErrorType({ code: "ECONNREFUSED" })).toBe(ErrorType.NETWORK);
    });
    it("maps ETIMEDOUT to NETWORK", () => {
      expect(getErrorType({ code: "ETIMEDOUT" })).toBe(ErrorType.NETWORK);
    });
    it("maps 23505 (unique violation) to NOT_FOUND", () => {
      expect(getErrorType({ code: "23505" })).toBe(ErrorType.NOT_FOUND);
    });
    it("maps token_expired to AUTHENTICATION", () => {
      expect(getErrorType({ code: "token_expired" })).toBe(ErrorType.AUTHENTICATION);
    });
    it("maps invalid_token to AUTHENTICATION", () => {
      expect(getErrorType({ code: "invalid_token" })).toBe(ErrorType.AUTHENTICATION);
    });
    it("maps message 'unauthorized' to AUTHENTICATION", () => {
      expect(getErrorType({ message: "Request unauthorized" })).toBe(ErrorType.AUTHENTICATION);
    });
    it("maps message 'forbidden' to AUTHORIZATION", () => {
      expect(getErrorType({ message: "Access forbidden" })).toBe(ErrorType.AUTHORIZATION);
    });
  });

  describe("createLoadingState", () => {
    it("returns isLoading true with default message", () => {
      const state = createLoadingState();
      expect(state.isLoading).toBe(true);
      expect(state.message).toBe("Loading...");
    });
    it("uses custom message when provided", () => {
      const state = createLoadingState("Saving...");
      expect(state.message).toBe("Saving...");
    });
  });

  describe("createRetryConfig", () => {
    it("returns default label when not provided", () => {
      const fn = () => {};
      expect(createRetryConfig(fn).label).toBe("Try Again");
      expect(createRetryConfig(fn).onRetry).toBe(fn);
    });
    it("uses custom label when provided", () => {
      const fn = () => {};
      expect(createRetryConfig(fn, "Retry").label).toBe("Retry");
    });
  });

  describe("createRetryWithBackoff", () => {
    it("returns result on first success", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      const retry = createRetryWithBackoff(fn);
      await expect(retry()).resolves.toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure until success", async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error("fail1"))
        .mockRejectedValueOnce(new Error("fail2"))
        .mockResolvedValueOnce("ok");
      const retry = createRetryWithBackoff(fn, { initialDelay: 10, maxDelay: 50 });
      await expect(retry()).resolves.toBe("ok");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("throws after max retries exhausted", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("always fail"));
      const retry = createRetryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 });
      await expect(retry()).rejects.toThrow("always fail");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe("TOAST_DURATIONS", () => {
    it("defines expected duration keys", () => {
      expect(TOAST_DURATIONS.SUCCESS).toBe(3000);
      expect(TOAST_DURATIONS.ERROR).toBe(5000);
      expect(TOAST_DURATIONS.INFO).toBe(4000);
      expect(TOAST_DURATIONS.WARNING).toBe(4000);
    });
  });
});
