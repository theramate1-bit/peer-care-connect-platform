import type { LegalDocument } from "@/constants/legal/types";

/**
 * In-app help / FAQ (static). Replace or extend as product support processes evolve.
 */
export const HELP_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 9 April 2026",
  sections: [
    {
      heading: "Getting started",
      paragraphs: [
        "Create an account, choose your role where prompted, and complete any verification steps. Clients can browse practitioners, book sessions, and manage requests from the Home and Explore areas.",
        "Practitioners use a dedicated workspace: Home shows today’s diary and quick actions; the bottom bar opens Diary (calendar), Sessions, Messages, and Profile.",
      ],
    },
    {
      heading: "For practitioners",
      paragraphs: [
        "Diary: view the month, tap a day for sessions and blocked time. Add or remove internal blocks here; external calendar blocks show as read-only.",
        "Sessions: open a booking for details, notes, care plans, and messages with that client. Profile → Clients lists everyone you treat; open a client for history and shortcuts.",
        "Weekly hours & services: Profile → Weekly hours and Services & products control when you can be booked and what you sell. Marketplace links to products you offer online.",
        "Treatment exchange: accept or decline requests, then book your return session when prompted. Mobile visit requests appear on Home when action is needed and under Profile routes.",
        "Money & analytics: Billing and Stripe Connect (from Profile) cover payouts and account status. Analytics summarises sessions and reports; generate exports where your plan allows.",
        "Notifications: use the bell on Home or the global Notifications screen so booking and exchange updates are not missed.",
      ],
    },
    {
      heading: "Bookings and payments",
      paragraphs: [
        "Select a service, pick an available time, and confirm payment where required. Cancellation and refund rules depend on the practitioner’s policy and what you agreed to at booking.",
        "Mobile visit requests (where offered): track status under Profile → Mobile requests; you may complete payment steps from there when a checkout link is provided.",
        "If a payment fails, check your card in Subscription & billing or Payment methods under Profile, then try again.",
      ],
    },
    {
      heading: "Messages and notifications",
      paragraphs: [
        "Use the Messages tab for conversations linked to your account. Enable notifications in App preferences so you do not miss booking updates.",
      ],
    },
    {
      heading: "Subscription and billing",
      paragraphs: [
        "Manage your plan and payment methods from Profile → Subscription & billing or Payment methods. Use the secure billing area in the app to update cards or invoices where available.",
      ],
    },
    {
      heading: "Privacy and security",
      paragraphs: [
        "Review Privacy & security in Profile. Use a strong password and sign out on shared devices. Read the Privacy policy in the app for how we handle data.",
      ],
    },
    {
      heading: "Something went wrong",
      paragraphs: [
        "Try updating the app, checking your connection, and signing out and back in. If the problem persists, contact support with the approximate time, screen, and what you were trying to do.",
      ],
    },
    {
      heading: "Contact support",
      paragraphs: [
        "Email: support@theramate.com",
        "We aim to respond within business days. Include your account email and any booking or session reference if relevant.",
      ],
    },
  ],
};
