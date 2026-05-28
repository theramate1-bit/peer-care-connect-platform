import { ErrorMessageService } from "../error-messages";

describe("ErrorMessageService", () => {
  describe("getErrorMessage", () => {
    it("maps Invalid login credentials", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("Invalid login credentials"))
      ).toContain("incorrect");
    });

    it("maps Email not confirmed", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("Email not confirmed"))
      ).toContain("verify");
    });

    it("maps Network errors", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("Failed to fetch"))
      ).toContain("internet");
    });

    it("maps card_declined", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("card_declined"))
      ).toContain("declined");
    });

    it("maps duplicate key", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("duplicate key violation"))
      ).toContain("already exists");
    });

    it("maps permission denied", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("permission denied"))
      ).toContain("permission");
    });

    it("uses errorCode when provided", () => {
      expect(
        ErrorMessageService.getErrorMessage(
          { message: "x", code: "card_declined" },
          { code: "card_declined" }
        )
      ).toContain("declined");
    });

    it("returns original message when no match", () => {
      expect(
        ErrorMessageService.getErrorMessage(new Error("Custom error"))
      ).toContain("Custom error");
    });

    it("handles null/undefined", () => {
      expect(ErrorMessageService.getErrorMessage(null)).toContain("unexpected");
    });
  });

  describe("getRecoverySuggestion", () => {
    it("returns suggestion for login credentials", () => {
      expect(
        ErrorMessageService.getRecoverySuggestion(new Error("Invalid login credentials"))
      ).toContain("reset");
    });

    it("returns null when no suggestion", () => {
      expect(ErrorMessageService.getRecoverySuggestion(new Error("Unknown"))).toBeNull();
    });
  });

  describe("getErrorSeverity", () => {
    it("returns critical for permission errors", () => {
      expect(
        ErrorMessageService.getErrorSeverity(new Error("permission denied"))
      ).toBe("critical");
    });

    it("returns high for payment errors", () => {
      expect(
        ErrorMessageService.getErrorSeverity(new Error("card_declined"))
      ).toBe("high");
    });

    it("returns medium for auth errors", () => {
      expect(
        ErrorMessageService.getErrorSeverity(new Error("Invalid login credentials"))
      ).toBe("medium");
    });

    it("returns low for validation errors", () => {
      expect(
        ErrorMessageService.getErrorSeverity(new Error("required field"))
      ).toBe("low");
    });

    it("returns medium as default", () => {
      expect(ErrorMessageService.getErrorSeverity(new Error("other"))).toBe("medium");
    });
  });
});
