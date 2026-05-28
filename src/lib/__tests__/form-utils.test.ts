import { formValidation } from "../form-utils";

describe("formValidation", () => {
  describe("isValidEmail", () => {
    it("accepts valid emails", () => {
      expect(formValidation.isValidEmail("user@example.com")).toBe(true);
      expect(formValidation.isValidEmail("a@b.co")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(formValidation.isValidEmail("")).toBe(false);
      expect(formValidation.isValidEmail("no-at")).toBe(false);
      expect(formValidation.isValidEmail("@nodomain.com")).toBe(false);
      expect(formValidation.isValidEmail("user@")).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("accepts valid phone numbers", () => {
      expect(formValidation.isValidPhone("+441234567890")).toBe(true);
      expect(formValidation.isValidPhone("1234567890")).toBe(true);
    });

    it("strips spaces before validation", () => {
      expect(formValidation.isValidPhone("+44 123 456 7890")).toBe(true);
    });

    it("rejects invalid formats", () => {
      expect(formValidation.isValidPhone("")).toBe(false);
      expect(formValidation.isValidPhone("abc")).toBe(false);
    });
  });

  describe("isStrongPassword", () => {
    it("rejects short passwords", () => {
      const r = formValidation.isStrongPassword("Ab1!");
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain("Password must be at least 8 characters long");
    });

    it("rejects passwords without uppercase", () => {
      const r = formValidation.isStrongPassword("password1!");
      expect(r.isValid).toBe(false);
      expect(r.errors.some((e) => e.includes("uppercase"))).toBe(true);
    });

    it("rejects passwords without number", () => {
      const r = formValidation.isStrongPassword("Password!");
      expect(r.isValid).toBe(false);
      expect(r.errors.some((e) => e.includes("number"))).toBe(true);
    });

    it("accepts strong password", () => {
      const r = formValidation.isStrongPassword("MyP@ssw0rd");
      expect(r.isValid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
  });

  describe("validateRequired", () => {
    it("returns errors for missing fields", () => {
      const errors = formValidation.validateRequired({ name: "" }, ["name"]);
      expect(errors).toContain("name is required");
    });

    it("returns empty for present fields", () => {
      const errors = formValidation.validateRequired({ name: "Jane" }, ["name"]);
      expect(errors).toHaveLength(0);
    });

    it("checks multiple fields", () => {
      const errors = formValidation.validateRequired(
        { a: "x", b: "", c: "   " },
        ["a", "b", "c"]
      );
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("validateLength", () => {
    it("returns error when too short", () => {
      expect(formValidation.validateLength("ab", 3, 10, "Name")).toContain("at least 3");
    });

    it("returns error when too long", () => {
      expect(formValidation.validateLength("abcdefghijklmn", 2, 5, "Field")).toContain("less than 5");
    });

    it("returns null when valid", () => {
      expect(formValidation.validateLength("hello", 3, 10, "Name")).toBeNull();
    });
  });
});
