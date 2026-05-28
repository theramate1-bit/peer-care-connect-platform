/**
 * Extended tests for form validation
 */
import { formValidation } from "@/lib/form-utils";

describe("form-utils extended", () => {
  describe("isValidEmail", () => {
    it.each(["user@example.com", "a@b.co", "test+tag@domain.org"])(
      "accepts %s",
      (email) => {
        expect(formValidation.isValidEmail(email)).toBe(true);
      }
    );
    it.each(["", "no-at", "spaces in@email.com"])("rejects %s", (email) => {
      expect(formValidation.isValidEmail(email)).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it.each(["+441234567890", "+12025551234"])("accepts %s", (phone) => {
      expect(formValidation.isValidPhone(phone)).toBe(true);
    });
  });

  describe("isStrongPassword", () => {
    it("rejects all lowercase", () => {
      expect(formValidation.isStrongPassword("password123").isValid).toBe(false);
    });
  });

  describe("validateLength", () => {
    it("returns null for valid length", () => {
      expect(formValidation.validateLength("hello", 2, 10, "Field")).toBeNull();
    });
    it("returns error for too long", () => {
      expect(formValidation.validateLength("abcdefghij", 2, 5, "Field")).not.toBeNull();
    });
  });
  describe("validateRequired", () => {
    it("returns empty when all present", () => {
      expect(formValidation.validateRequired({ a: "x", b: "y" }, ["a", "b"])).toHaveLength(0);
    });
  });
});
