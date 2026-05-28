import {
  getDashboardRoute,
  shouldRedirectToOnboarding,
  getOnboardingRoute,
  canAccessRoute,
  type UserProfile,
} from "@/lib/dashboard-routing";

const baseProfile: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  user_role: "client",
  onboarding_status: "completed",
  profile_completed: true,
};

describe("dashboard-routing integration", () => {
  describe("getDashboardRoute", () => {
    it("routes completed clients to the client dashboard", () => {
      expect(getDashboardRoute({ userProfile: baseProfile })).toBe("/client/dashboard");
    });

    it("returns /login when no profile", () => {
      expect(getDashboardRoute({ userProfile: null })).toBe("/login");
    });

    it("forces incomplete practitioners back through onboarding", () => {
      const practitioner = {
        ...baseProfile,
        user_role: "osteopath" as const,
        onboarding_status: "in_progress" as const,
        profile_completed: false,
      };
      expect(getDashboardRoute({ userProfile: practitioner })).toBe("/onboarding");
    });

    it("routes all practitioner types to /dashboard", () => {
      expect(getDashboardRoute({ userProfile: { ...baseProfile, user_role: "sports_therapist" } })).toBe("/dashboard");
      expect(getDashboardRoute({ userProfile: { ...baseProfile, user_role: "massage_therapist" } })).toBe("/dashboard");
      expect(getDashboardRoute({ userProfile: { ...baseProfile, user_role: "osteopath" } })).toBe("/dashboard");
    });

    it("routes admins to admin dashboard", () => {
      const admin = { ...baseProfile, user_role: "admin" as const };
      expect(getDashboardRoute({ userProfile: admin })).toBe("/admin/dashboard");
    });

    it("redirects to onboarding when user has no role (security)", () => {
      const unknown = { ...baseProfile, user_role: null as any };
      expect(getDashboardRoute({ userProfile: unknown, intendedRole: "professional" })).toBe("/onboarding");
      expect(getDashboardRoute({ userProfile: unknown, defaultRoute: "/custom" })).toBe("/onboarding");
    });
  });

  describe("shouldRedirectToOnboarding", () => {
    it("returns false for null profile", () => {
      expect(shouldRedirectToOnboarding(null)).toBe(false);
    });

    it("forces incomplete practitioners back", () => {
      const practitioner = {
        ...baseProfile,
        user_role: "osteopath" as const,
        onboarding_status: "in_progress" as const,
        profile_completed: false,
      };
      expect(shouldRedirectToOnboarding(practitioner)).toBe(true);
    });

    it("does not redirect client with completed onboarding even if profile incomplete", () => {
      const profile = {
        ...baseProfile,
        user_role: "client" as const,
        onboarding_status: "completed" as const,
        profile_completed: false,
      };
      expect(shouldRedirectToOnboarding(profile)).toBe(false);
    });
  });

  describe("getOnboardingRoute", () => {
    it("returns type=client for client role", () => {
      expect(getOnboardingRoute({ ...baseProfile, user_role: "client" })).toBe("/onboarding?type=client");
    });
    it("returns type=practitioner for all practitioner types", () => {
      expect(getOnboardingRoute({ ...baseProfile, user_role: "sports_therapist" })).toBe("/onboarding?type=practitioner");
      expect(getOnboardingRoute({ ...baseProfile, user_role: "massage_therapist" })).toBe("/onboarding?type=practitioner");
      expect(getOnboardingRoute({ ...baseProfile, user_role: "osteopath" })).toBe("/onboarding?type=practitioner");
    });
    it("returns /onboarding for null profile", () => {
      expect(getOnboardingRoute(null)).toBe("/onboarding");
    });
  });

  describe("canAccessRoute", () => {
    it("returns false for null profile", () => {
      expect(canAccessRoute(null, "/client/dashboard")).toBe(false);
    });

    it("allows public routes for users with no role", () => {
      const noRole = { ...baseProfile, user_role: null as any };
      expect(canAccessRoute(noRole, "/marketplace")).toBe(true);
      expect(canAccessRoute(noRole, "/login")).toBe(true);
    });

    it("allows client routes only for client role", () => {
      expect(canAccessRoute(baseProfile, "/client/dashboard")).toBe(true);
      expect(canAccessRoute({ ...baseProfile, user_role: "sports_therapist" }, "/client/dashboard")).toBe(false);
    });

    it("allows practice routes for all practitioner types", () => {
      expect(canAccessRoute({ ...baseProfile, user_role: "sports_therapist" }, "/dashboard")).toBe(true);
      expect(canAccessRoute({ ...baseProfile, user_role: "massage_therapist" }, "/practice/sessions")).toBe(true);
      expect(canAccessRoute({ ...baseProfile, user_role: "osteopath" }, "/practice/schedule")).toBe(true);
    });

    it("getOnboardingRoute for admin returns /onboarding", () => {
      expect(getOnboardingRoute({ ...baseProfile, user_role: "admin" })).toBe("/onboarding");
    });

    it("canAccessRoute denies practice for client", () => {
      expect(canAccessRoute(baseProfile, "/practice/sessions")).toBe(false);
    });

    it("allows admin routes only for admin", () => {
      const admin = { ...baseProfile, user_role: "admin" as const };
      expect(canAccessRoute(admin, "/admin/dashboard")).toBe(true);
      expect(canAccessRoute(baseProfile, "/admin/dashboard")).toBe(false);
    });
  });
});
