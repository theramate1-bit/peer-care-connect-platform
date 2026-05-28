/**
 * Extended tests for ErrorMessageService
 */
import { ErrorMessageService } from "@/lib/error-messages";

describe("error-messages extended", () => {
  describe("getErrorMessage", () => {
    it("maps timeout", () => {
      expect(ErrorMessageService.getErrorMessage(new Error("request timeout"))).toContain("try again");
    });
    it("maps insufficient_funds", () => {
      expect(ErrorMessageService.getErrorMessage(new Error("insufficient_funds"))).toContain("Insufficient");
    });
    it("maps expired_card", () => {
      expect(ErrorMessageService.getErrorMessage(new Error("expired_card"))).toContain("expired");
    });
  });

  describe("getErrorSeverity", () => {
    it("returns severity for each error type", () => {
      expect(["critical", "high", "medium", "low"]).toContain(
        ErrorMessageService.getErrorSeverity(new Error("required"))
      );
    });
  });
});
