// Screen capture list - all 77 screens from FRONTEND_UX_AUDIT_PROGRESS.md
const screens = [
  // Phase 1: Public & Marketing (12 screens) - DONE: 1-11
  { num: 1, path: "/", name: "landing-page" },
  { num: 2, path: "/how-it-works", name: "how-it-works" },
  { num: 3, path: "/client/how-it-works", name: "client-how-it-works" },
  { num: 4, path: "/pricing", name: "pricing" },
  { num: 5, path: "/about", name: "about" },
  { num: 6, path: "/contact", name: "contact" },
  { num: 7, path: "/help", name: "help-centre" },
  { num: 8, path: "/terms", name: "terms-conditions" },
  { num: 9, path: "/privacy", name: "privacy-policy" },
  { num: 10, path: "/cookies", name: "cookies-policy" },
  { num: 11, path: "/marketplace", name: "marketplace" },
  {
    num: 12,
    path: "/therapist/:therapistId/public",
    name: "public-therapist-profile",
    note: "NEEDS ID",
  },

  // Phase 2: Authentication & Onboarding (12 screens) - DONE: 12-18
  { num: 13, path: "/register", name: "register" },
  { num: 14, path: "/login", name: "login" },
  { num: 15, path: "/reset-password", name: "reset-password" },
  {
    num: 16,
    path: "/auth/reset-password-confirm",
    name: "reset-password-confirm",
  },
  { num: 17, path: "/auth/verify-email", name: "email-verification" },
  { num: 18, path: "/auth/registration-success", name: "registration-success" },
  { num: 19, path: "/auth/callback", name: "auth-callback" },
  { num: 20, path: "/auth/role-selection", name: "role-selection" },
  { num: 21, path: "/auth/oauth-completion", name: "oauth-completion" },
  { num: 22, path: "/onboarding", name: "onboarding", auth: true },
  {
    num: 23,
    path: "/onboarding/stripe-return",
    name: "stripe-return",
    auth: true,
  },
  {
    num: 24,
    path: "/auth/google-calendar-callback",
    name: "google-calendar-callback",
  },

  // Phase 3: Client-Facing Screens (9 screens)
  { num: 25, path: "/client/dashboard", name: "client-dashboard", auth: true },
  { num: 26, path: "/client/booking", name: "client-booking", auth: true },
  { num: 27, path: "/client/profile", name: "client-profile", auth: true },
  { num: 28, path: "/client/sessions", name: "client-sessions", auth: true },
  { num: 29, path: "/client/messages", name: "client-messages", auth: true },
  { num: 30, path: "/client/notes", name: "client-notes", auth: true },
  {
    num: 31,
    path: "/client/plans",
    name: "client-treatment-plans",
    auth: true,
  },
  { num: 32, path: "/client/favorites", name: "client-favorites", auth: true },
  { num: 33, path: "/booking-success", name: "booking-success" },

  // Phase 4: Practitioner Core Screens (12 screens)
  { num: 34, path: "/dashboard", name: "practitioner-dashboard", auth: true },
  { num: 35, path: "/find-therapists", name: "find-therapists", auth: true },
  { num: 36, path: "/bookings", name: "my-bookings", auth: true },
  { num: 37, path: "/offer-services", name: "offer-services", auth: true },
  { num: 38, path: "/credits", name: "credits", auth: true },
  { num: 39, path: "/profile", name: "profile", auth: true },
  { num: 40, path: "/profile/create", name: "create-profile", auth: true },
  { num: 41, path: "/profile/edit", name: "edit-profile", auth: true },
  {
    num: 42,
    path: "/therapist/:therapistId",
    name: "view-profile",
    auth: true,
    note: "NEEDS ID",
  },
  { num: 43, path: "/reviews", name: "reviews", auth: true },
  {
    num: 44,
    path: "/reviews/submit/:sessionId",
    name: "submit-review",
    auth: true,
    note: "NEEDS ID",
  },
  { num: 45, path: "/messages", name: "messages", auth: true },

  // Phase 5: Practice Management Screens (15 screens)
  {
    num: 46,
    path: "/practice/dashboard",
    name: "practice-dashboard",
    auth: true,
  },
  {
    num: 47,
    path: "/practice/clients",
    name: "practice-client-management",
    auth: true,
  },
  { num: 48, path: "/practice/scheduler", name: "scheduler", auth: true },
  { num: 49, path: "/practice/notes", name: "practice-notes", auth: true },
  {
    num: 50,
    path: "/practice/treatment-notes",
    name: "treatment-notes",
    auth: true,
  },
  {
    num: 51,
    path: "/practice/sessions/:sessionId",
    name: "session-detail",
    auth: true,
    note: "NEEDS ID",
  },
  {
    num: 52,
    path: "/practice/clinical-files",
    name: "clinical-files",
    auth: true,
  },
  {
    num: 53,
    path: "/practice/treatment-plans",
    name: "treatment-plans",
    auth: true,
  },
  {
    num: 54,
    path: "/practice/treatment-exchange",
    name: "treatment-exchange",
    auth: true,
  },
  {
    num: 55,
    path: "/practice/exchange-requests",
    name: "exchange-requests",
    auth: true,
  },
  { num: 56, path: "/practice/billing", name: "billing", auth: true },
  {
    num: 57,
    path: "/practice/analytics",
    name: "business-analytics",
    auth: true,
  },
  {
    num: 58,
    path: "/practice/calendar",
    name: "calendar-settings",
    auth: true,
  },
  {
    num: 59,
    path: "/practice/peer-treatment",
    name: "peer-treatment",
    auth: true,
  },
  { num: 60, path: "/booking", name: "booking-dashboard", auth: true },

  // Phase 6: Settings & Configuration (6 screens)
  { num: 61, path: "/settings", name: "settings-profile", auth: true },
  {
    num: 62,
    path: "/settings/privacy",
    name: "settings-privacy-tools",
    auth: true,
  },
  {
    num: 63,
    path: "/settings/subscription",
    name: "settings-subscription",
    auth: true,
  },
  { num: 64, path: "/settings/payouts", name: "settings-payouts", auth: true },
  { num: 65, path: "/payments", name: "payments", auth: true },
  { num: 66, path: "/payments/connect", name: "connect-account", auth: true },

  // Phase 7: Analytics & Reporting (3 screens)
  { num: 67, path: "/analytics", name: "analytics-dashboard", auth: true },
  { num: 68, path: "/analytics/reports", name: "advanced-reports", auth: true },
  {
    num: 69,
    path: "/marketplace",
    name: "marketplace-authenticated",
    auth: true,
  },

  // Phase 8: Additional Features (8 screens)
  {
    num: 70,
    path: "/dashboard/projects",
    name: "dashboard-projects",
    auth: true,
  },
  {
    num: 71,
    path: "/dashboard/projects/create",
    name: "create-project",
    auth: true,
  },
  { num: 72, path: "/cpd", name: "cpd-info", auth: true },
  { num: 73, path: "/review", name: "guest-review" },
  { num: 74, path: "/design-system", name: "design-system" },
  {
    num: 75,
    path: "/admin/verification",
    name: "admin-verification",
    auth: true,
  },
  { num: 76, path: "/unauthorized", name: "unauthorized" },
  { num: 77, path: "/404", name: "not-found" },
];

console.log(`Total screens: ${screens.length}`);
console.log(`Screens requiring auth: ${screens.filter((s) => s.auth).length}`);
console.log(
  `Screens needing IDs: ${screens.filter((s) => s.note?.includes("ID")).length}`,
);
