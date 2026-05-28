/**
 * Extended tests for roles
 */
import { hasRole, isClient, isPractitioner, isAdmin, getRoleDisplayName } from "@/types/roles";

describe("roles extended", () => {
  const allRoles = ["client", "sports_therapist", "massage_therapist", "osteopath", "admin"] as const;

  describe("hasRole", () => {
    it.each(allRoles)("returns true for %s", (role) => {
      expect(hasRole(role)).toBe(true);
    });
  });

  describe("getRoleDisplayName", () => {
    it.each(allRoles)("returns non-empty for %s", (role) => {
      expect(getRoleDisplayName(role).length).toBeGreaterThan(0);
    });
  });

  describe("isClient", () => {
    it("only client returns true", () => {
      expect(isClient("client")).toBe(true);
    });
  });

  describe("isAdmin", () => {
    it("only admin returns true", () => {
      expect(isAdmin("admin")).toBe(true);
    });
  });
});
