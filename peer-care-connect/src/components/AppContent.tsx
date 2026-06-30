import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AuthRouter from "@/components/auth/AuthRouter";
import { AppRoute } from "@/components/AppRoute";
import { AuthLoadingShell } from "@/components/auth/AuthLoadingShell";
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";
import ResetPasswordConfirm from "@/pages/auth/ResetPasswordConfirm";
import GuestMobileRequests from "@/pages/guest/GuestMobileRequests";
import FindBooking from "@/pages/booking/FindBooking";
import GuestBookingView from "@/pages/booking/GuestBookingView";
import MobileBookingSuccess from "@/pages/MobileBookingSuccess";
import RoutePlaceholder from "@/pages/RoutePlaceholder";
import PractitionerMobileRequests from "@/pages/practice/PractitionerMobileRequests";
import ExchangeRequests from "@/pages/practice/ExchangeRequests";
import ClientDashboard from "@/pages/client/ClientDashboard";

import TherapistSearch from "@web/pages/discovery/TherapistSearch";
import ClientBooking from "@web/pages/client/ClientBooking";
import DirectBooking from "@web/pages/booking/DirectBooking";
import PublicTherapistProfile from "@web/pages/therapist/PublicTherapistProfile";
import BookingSuccess from "@web/pages/BookingSuccess";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import StripeReturn from "@/pages/onboarding/StripeReturn";
import { RoleAwareProfileRedirect } from "@/components/routing/CanonicalRouteRedirects";
import { LegalStaticPageRedirect } from "@/components/legal/LegalStaticPageRedirect";

/** Heavy / optional surfaces — lazy so booking core can ship if a dep is missing. */
const MyBookings = lazy(() => import("@/pages/MyBookings"));
const Messages = lazy(() => import("@web/pages/messages/Messages"));
const Analytics = lazy(() => import("@web/pages/analytics/Analytics"));
const Projects = lazy(() => import("@web/pages/projects/Projects"));
const CreateProject = lazy(() => import("@web/pages/projects/CreateProject"));
const Payments = lazy(() => import("@web/pages/payments/Payments"));
const ConnectAccount = lazy(() => import("@web/pages/payments/ConnectAccount"));
const PaymentHistory = lazy(() => import("@web/pages/payments/PaymentHistory"));
const ManualBooking = lazy(() => import("@web/pages/practice/ManualBooking"));
const UpcomingSessions = lazy(
  () => import("@web/pages/practice/UpcomingSessions"),
);
const PracticeDashboard = lazy(
  () => import("@web/pages/practice/PracticeDashboard"),
);
const CreditsPage = lazy(() => import("@web/pages/credits/CreditsPage"));
const ClientSessions = lazy(() => import("@web/pages/client/ClientSessions"));
const NotificationsPage = lazy(() => import("@web/pages/NotificationsPage"));
const PricingPage = lazy(() => import("@web/pages/PricingPage"));
const AdminVerification = lazy(
  () => import("@web/pages/admin/AdminVerification"),
);
const ClientExercises = lazy(() => import("@web/pages/client/ClientExercises"));
const ClientFavorites = lazy(() => import("@web/pages/client/ClientFavorites"));
const ClientTreatmentPlans = lazy(
  () => import("@web/pages/client/ClientTreatmentPlans"),
);
const ClientProgressGoals = lazy(
  () => import("@web/pages/client/ClientProgressGoals"),
);
const PracticeClients = lazy(
  () => import("@web/pages/practice/PracticeClients"),
);
const PracticeAvailability = lazy(
  () => import("@web/pages/practice/PracticeAvailability"),
);
const PracticeTreatmentPlans = lazy(
  () => import("@web/pages/practice/PracticeTreatmentPlans"),
);
const PracticeClinicalFiles = lazy(
  () => import("@web/pages/practice/PracticeClinicalFiles"),
);
const ClinicalNotesEditor = lazy(
  () => import("@web/pages/practice/ClinicalNotesEditor"),
);
const SubscriptionSettings = lazy(
  () => import("@web/pages/settings/SubscriptionSettings"),
);
const PaymentPreferences = lazy(
  () => import("@web/pages/practice/PaymentPreferences"),
);
const ClientOnboarding = lazy(
  () => import("@web/pages/onboarding/ClientOnboarding"),
);
const Reviews = lazy(() => import("@web/pages/reviews/Reviews"));
const SubmitReview = lazy(() => import("@web/pages/reviews/SubmitReview"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const RegistrationSuccess = lazy(
  () => import("@/pages/auth/RegistrationSuccess"),
);
const AuthCallback = lazy(() => import("@/pages/auth/AuthCallback"));
const HowItWorks = lazy(() => import("@web/pages/marketing/HowItWorks"));
const About = lazy(() => import("@web/pages/marketing/About"));
const Contact = lazy(() => import("@web/pages/marketing/Contact"));
const HelpCentre = lazy(() => import("@web/pages/marketing/HelpCentre"));
const TermsPage = lazy(() => import("@web/pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@web/pages/legal/PrivacyPage"));
const CookiesPage = lazy(() => import("@web/pages/legal/CookiesPage"));
const PracticeSchedule = lazy(
  () => import("@/pages/practice/PracticeSchedule"),
);
const CalendarSettings = lazy(
  () => import("@/pages/practice/CalendarSettings"),
);
const ClientProfile = lazy(() => import("@/pages/client/ClientProfile"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const SettingsPrivacyTools = lazy(
  () => import("@/pages/settings/SettingsPrivacyTools"),
);
const FindTherapists = lazy(() => import("@/pages/FindTherapists"));
const RoleSelection = lazy(() => import("@/pages/auth/RoleSelection"));
const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));
const OAuthCompletion = lazy(() => import("@/pages/auth/OAuthCompletion"));
const GoogleCalendarCallback = lazy(
  () => import("@/pages/auth/google-calendar-callback"),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AuthLoadingShell message="Loading…" compact />}>
      {children}
    </Suspense>
  );
}

/**
 * Web route table — booking + guest public paths are eager; practice/client
 * extensions are lazy-loaded.
 */
export default function AppContent() {
  return (
    <AuthRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/sign-in" element={<Navigate to="/login" replace />} />
        <Route
          path="/auth/sign-in"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/register"
          element={
            <Lazy>
              <Register />
            </Lazy>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Lazy>
              <ResetPassword />
            </Lazy>
          }
        />
        <Route
          path="/auth/reset-password-confirm"
          element={<ResetPasswordConfirm />}
        />
        <Route
          path="/auth/registration-success"
          element={
            <Lazy>
              <RegistrationSuccess />
            </Lazy>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <Lazy>
              <AuthCallback />
            </Lazy>
          }
        />
        <Route
          path="/auth/verify-email"
          element={
            <Lazy>
              <VerifyEmail />
            </Lazy>
          }
        />
        <Route
          path="/auth/role-selection"
          element={
            <Lazy>
              <RoleSelection />
            </Lazy>
          }
        />
        <Route
          path="/auth/oauth-completion"
          element={
            <Lazy>
              <OAuthCompletion />
            </Lazy>
          }
        />
        <Route
          path="/auth/google-calendar-callback"
          element={
            <Lazy>
              <GoogleCalendarCallback />
            </Lazy>
          }
        />

        <Route
          path="/how-it-works"
          element={
            <Lazy>
              <HowItWorks />
            </Lazy>
          }
        />
        <Route
          path="/about"
          element={
            <Lazy>
              <About />
            </Lazy>
          }
        />
        <Route
          path="/contact"
          element={
            <Lazy>
              <Contact />
            </Lazy>
          }
        />
        <Route
          path="/help"
          element={
            <Lazy>
              <HelpCentre />
            </Lazy>
          }
        />
        <Route
          path="/terms"
          element={
            <Lazy>
              <TermsPage />
            </Lazy>
          }
        />
        <Route
          path="/privacy"
          element={
            <Lazy>
              <PrivacyPage />
            </Lazy>
          }
        />
        <Route
          path="/cookies"
          element={
            <Lazy>
              <CookiesPage />
            </Lazy>
          }
        />
        <Route path="/dpa" element={<LegalStaticPageRedirect doc="dpa" />} />
        <Route
          path="/subprocessors"
          element={<LegalStaticPageRedirect doc="subprocessors" />}
        />

        <Route path="/marketplace" element={<TherapistSearch />} />
        <Route
          path="/explore"
          element={<Navigate to="/marketplace" replace />}
        />

        <Route path="/client/booking" element={<ClientBooking />} />
        <Route
          path="/client/ClientBooking"
          element={<Navigate to="/client/booking" replace />}
        />

        <Route path="/book/:slug" element={<DirectBooking />} />
        <Route
          path="/therapist/:therapistId/public"
          element={<PublicTherapistProfile />}
        />

        <Route path="/booking/find" element={<FindBooking />} />
        <Route path="/booking/view/:sessionId" element={<GuestBookingView />} />
        <Route
          path="/mobile-booking/success"
          element={<MobileBookingSuccess />}
        />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
        <Route path="/onboarding/stripe-return" element={<StripeReturn />} />
        <Route path="/stripe-return" element={<StripeReturn />} />
        <Route
          path="/guest/mobile-requests"
          element={<GuestMobileRequests />}
        />

        <Route
          path="/client/dashboard"
          element={
            <AppRoute>
              <ClientDashboard />
            </AppRoute>
          }
        />
        <Route
          path="/client/sessions"
          element={
            <AppRoute>
              <Lazy>
                <ClientSessions />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/mobile-requests"
          element={
            <AppRoute>
              <GuestMobileRequests />
            </AppRoute>
          }
        />
        <Route
          path="/client/messages"
          element={
            <AppRoute>
              <Lazy>
                <Messages />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/exercises"
          element={
            <AppRoute>
              <Lazy>
                <ClientExercises />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/progress"
          element={
            <AppRoute>
              <Lazy>
                <ClientProgressGoals />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/goals"
          element={<Navigate to="/client/progress" replace />}
        />
        <Route
          path="/client/favorites"
          element={
            <AppRoute>
              <Lazy>
                <ClientFavorites />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/treatment-plans"
          element={
            <AppRoute>
              <Lazy>
                <ClientTreatmentPlans />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/client/profile"
          element={
            <AppRoute>
              <Lazy>
                <ClientProfile />
              </Lazy>
            </AppRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeDashboard />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <AppRoute>
              <Lazy>
                <MyBookings />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/find-therapists"
          element={
            <AppRoute>
              <Lazy>
                <FindTherapists />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={<Navigate to="/bookings" replace />}
        />
        <Route
          path="/practice/upcoming-sessions"
          element={
            <AppRoute>
              <Lazy>
                <UpcomingSessions />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/manual-booking"
          element={
            <AppRoute>
              <Lazy>
                <ManualBooking />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/payment-preferences"
          element={
            <AppRoute>
              <Lazy>
                <PaymentPreferences />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/billing"
          element={
            <AppRoute>
              <Lazy>
                <Payments />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/mobile-requests"
          element={
            <AppRoute>
              <PractitionerMobileRequests />
            </AppRoute>
          }
        />
        <Route
          path="/practice/exchange-requests"
          element={
            <AppRoute>
              <ExchangeRequests />
            </AppRoute>
          }
        />
        <Route
          path="/practice/clients"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeClients />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/scheduler"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeAvailability />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/schedule"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeSchedule />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/calendar"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <CalendarSettings />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/treatment-plans"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeTreatmentPlans />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/clinical-files"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <PracticeClinicalFiles />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/clinical-notes/:sessionId"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <ClinicalNotesEditor />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/practice/analytics"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <Analytics />
              </Lazy>
            </AppRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <AppRoute>
              <Lazy>
                <Messages />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <AppRoute requireSubscription>
              <Lazy>
                <Analytics />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/dashboard/projects"
          element={<Navigate to="/projects" replace />}
        />
        <Route
          path="/dashboard/projects/create"
          element={<Navigate to="/projects/new" replace />}
        />
        <Route
          path="/projects"
          element={
            <AppRoute>
              <Lazy>
                <Projects />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <AppRoute>
              <Lazy>
                <CreateProject />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <AppRoute>
              <Lazy>
                <Payments />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/payments/connect"
          element={
            <AppRoute>
              <Lazy>
                <ConnectAccount />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/payments/history"
          element={
            <AppRoute>
              <Lazy>
                <PaymentHistory />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/credits"
          element={
            <AppRoute>
              <Lazy>
                <CreditsPage />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <AppRoute>
              <Lazy>
                <ClientOnboarding />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/review"
          element={
            <Lazy>
              <SubmitReview />
            </Lazy>
          }
        />
        <Route
          path="/reviews"
          element={
            <AppRoute>
              <Lazy>
                <Reviews />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <AppRoute>
              <Lazy>
                <NotificationsPage />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <AppRoute>
              <Lazy>
                <ProfilePage />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/settings"
          element={<Navigate to="/settings/privacy" replace />}
        />
        <Route
          path="/settings/profile"
          element={
            <AppRoute>
              <RoleAwareProfileRedirect />
            </AppRoute>
          }
        />
        <Route
          path="/settings/subscription"
          element={
            <AppRoute>
              <Lazy>
                <SubscriptionSettings />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/settings/privacy"
          element={
            <AppRoute>
              <Lazy>
                <SettingsPrivacyTools />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/settings/notifications"
          element={<Navigate to="/notifications" replace />}
        />
        <Route
          path="/settings/help"
          element={<Navigate to="/help" replace />}
        />
        <Route
          path="/pricing"
          element={
            <Lazy>
              <PricingPage />
            </Lazy>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <AppRoute>
              <Lazy>
                <AdminVerification />
              </Lazy>
            </AppRoute>
          }
        />
        <Route
          path="/unauthorized"
          element={<RoutePlaceholder title="Unauthorized" />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthRouter>
  );
}
