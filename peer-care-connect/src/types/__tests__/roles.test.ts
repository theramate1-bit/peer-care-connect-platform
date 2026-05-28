import {
  ROLE_PERMISSIONS,
  hasRole,
  isClient,
  isPractitioner,
  isAdmin,
  hasPermission,
  getRoleDisplayName,
  type UserRole,
  type Permission,
} from "@/types/roles";

describe("roles", () => {
  const practitionerRoles: UserRole[] = ["sports_therapist", "massage_therapist", "osteopath"];

  describe("hasRole", () => {
    it("returns true for non-null roles", () => {
      expect(hasRole("client")).toBe(true);
      practitionerRoles.forEach((r) => expect(hasRole(r)).toBe(true));
      expect(hasRole("admin")).toBe(true);
    });
    it("returns false for null", () => {
      expect(hasRole(null)).toBe(false);
    });
  });

  describe("isClient", () => {
    it("returns true only for client", () => {
      expect(isClient("client")).toBe(true);
      practitionerRoles.forEach((r) => expect(isClient(r)).toBe(false));
      expect(isClient("admin")).toBe(false);
      expect(isClient(null)).toBe(false);
    });
  });

  describe("isPractitioner", () => {
    it("returns true for all practitioner types", () => {
      expect(isPractitioner("sports_therapist")).toBe(true);
      expect(isPractitioner("massage_therapist")).toBe(true);
      expect(isPractitioner("osteopath")).toBe(true);
    });
    it("returns false for client and admin", () => {
      expect(isPractitioner("client")).toBe(false);
      expect(isPractitioner("admin")).toBe(false);
      expect(isPractitioner(null)).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true only for admin", () => {
      expect(isAdmin("admin")).toBe(true);
      expect(isAdmin("client")).toBe(false);
      practitionerRoles.forEach((r) => expect(isAdmin(r)).toBe(false));
    });
  });

  describe("getRoleDisplayName", () => {
    it("returns display names for all roles", () => {
      expect(getRoleDisplayName("client")).toBe("Client");
      expect(getRoleDisplayName("sports_therapist")).toBe("Sports Therapist");
      expect(getRoleDisplayName("massage_therapist")).toBe("Massage Therapist");
      expect(getRoleDisplayName("osteopath")).toBe("Osteopath");
      expect(getRoleDisplayName("admin")).toBe("Administrator");
    });
    it("returns fallback for null", () => {
      expect(getRoleDisplayName(null)).toBe("Role Not Selected");
    });
  });

  describe("ROLE_PERMISSIONS", () => {
    it("all practitioner types have same permissions", () => {
      const sportsPerms = ROLE_PERMISSIONS.sports_therapist;
      const massagePerms = ROLE_PERMISSIONS.massage_therapist;
      const osteopathPerms = ROLE_PERMISSIONS.osteopath;

      expect(sportsPerms).toEqual(massagePerms);
      expect(massagePerms).toEqual(osteopathPerms);
      expect(sportsPerms).toContain("practitioner:view_dashboard");
      expect(sportsPerms).toContain("practitioner:manage_clients");
      expect(sportsPerms).toContain("practitioner:manage_schedule");
      expect(sportsPerms).toContain("practitioner:create_notes");
      expect(sportsPerms).toContain("practitioner:manage_billing");
      expect(sportsPerms).toContain("practitioner:view_marketplace");
      expect(sportsPerms).toContain("practitioner:manage_profile");
    });

    it("client has client permissions only", () => {
      const perms = ROLE_PERMISSIONS.client;
      expect(perms).toContain("client:view_dashboard");
      expect(perms).toContain("client:book_sessions");
      expect(perms).not.toContain("practitioner:view_dashboard");
    });

    it("admin has both admin and practitioner permissions", () => {
      const perms = ROLE_PERMISSIONS.admin;
      expect(perms).toContain("admin:manage_users");
      expect(perms).toContain("practitioner:view_dashboard");
    });
  });

  describe("hasPermission", () => {
    it("grants practitioner permissions to all practitioner types", () => {
      const perm: Permission = "practitioner:view_dashboard";
      practitionerRoles.forEach((role) => {
        expect(hasPermission(role, perm)).toBe(true);
      });
    });
    it("denies practitioner permissions to client", () => {
      expect(hasPermission("client", "practitioner:view_dashboard")).toBe(false);
    });
    it("denies client permissions to practitioners", () => {
      practitionerRoles.forEach((role) => {
        expect(hasPermission(role, "client:book_sessions")).toBe(false);
      });
    });
    it("returns false for null role", () => {
      expect(hasPermission(null, "client:view_dashboard")).toBe(false);
    });
    it("grants admin permissions to admin", () => {
      expect(hasPermission("admin", "admin:manage_users")).toBe(true);
    });
    it("grants client:book_sessions to client", () => {
      expect(hasPermission("client", "client:book_sessions")).toBe(true);
    });
  });
});
