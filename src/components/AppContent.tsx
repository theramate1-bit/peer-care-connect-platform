import React from "react";
import RouteChangeTracker from "./analytics/RouteChangeTracker";

/** Redirects legacy /sessions/:id/notes to practice treatment notes (KAN-22). */
function SessionNotesRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/practice/clients?session=${sessionId ?? ""}&tab=treatment-notes`} replace />;
}
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SimpleProtectedRoute } from "@/components/auth/SimpleProtectedRoute";
import { Header } from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "../pages/Index";
import NotFound from "../pages/NotFound";
import HowItWorks from "../pages/HowItWorks";
import ClientHowItWorks from "../pages/ClientHowItWorks";
import Pricing from "../pages/Pricing";
import About from "../pages/About";
import Contact from "../pages/Contact";
import HelpCentre from "../pages/HelpCentre";
import TermsConditions from "../pages/TermsConditions";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import Cookies from "@/pages/Cookies";
import DesignSystem from "@/pages/DesignSystem";
import Register from "../pages/auth/Register";
import Login from "../pages/auth/Login";
import ResetPassword from "../pages/auth/ResetPassword";
import ResetPasswordConfirm from "../pages/auth/ResetPasswordConfirm";
import EmailVerification from "../pages/auth/EmailVerification";
import RegistrationSuccess from "../pages/auth/RegistrationSuccess";
import Onboarding from "../pages/auth/Onboarding";
import Dashboard from "../pages/Dashboard";
import FindTherapists from "../pages/FindTherapists";
import MyBookings from "../pages/MyBookings";
import OfferServices from "../pages/OfferServices";
import Credits from "../pages/Credits";
import Profile from "../pages/Profile";
import Reviews from "../pages/Reviews";
import RealTimeMessaging from "../components/messaging/RealTimeMessaging";
import CPDInfo from "../pages/cpd/CPDInfo";
import { SettingsProfile } from "../pages/settings/SettingsProfile";
import SettingsPrivacyTools from "../pages/settings/SettingsPrivacyTools";
import { SettingsSubscription } from "../pages/settings/SettingsSubscription";
import ClientManagement from "../pages/practice/ClientManagement";
import PracticeClientManagement from "../pages/practice/PracticeClientManagement";
import PracticeSchedule from "../pages/practice/PracticeSchedule";
import ServicesManagement from "../pages/practice/ServicesManagement";
import MobileRequests from "../pages/practice/MobileRequests";
import TreatmentNotes from "../pages/practice/TreatmentNotes";
import Billing from "../pages/practice/Billing";
import BusinessAnalytics from "../pages/practice/BusinessAnalytics";
import EnhancedTreatmentNotes from "../pages/practice/EnhancedTreatmentNotes";
import CalendarSettings from "../pages/practice/CalendarSettings";
import TreatmentExchange from "../pages/practice/TreatmentExchange";
import ExchangeRequests from "../pages/practice/ExchangeRequests";
import { SessionDetailView } from "../components/sessions/SessionDetailView";
import CreateProfile from "../pages/profiles/CreateProfile";
import EditProfile from "../pages/profiles/EditProfile";
import ViewProfile from "../pages/profiles/ViewProfile";
import AdminVerificationDashboard from "../pages/admin/VerificationDashboard";
import SubmitReview from "../pages/reviews/SubmitReview";
import GuestReview from "../pages/reviews/GuestReview";
import Projects from "../pages/projects/Projects";
import CreateProject from "../pages/projects/CreateProject";
import Analytics from "../pages/analytics/Analytics";
import AdvancedReports from "../pages/analytics/AdvancedReports";
import TreatmentPlans from "../pages/practice/TreatmentPlans";
import AnalyticsDashboard from "../pages/AnalyticsDashboard";
import DashboardProjects from "../pages/DashboardProjects";
import Marketplace from "../pages/Marketplace";
import ClientDashboard from "../pages/client/ClientDashboard";
import ClientBooking from "../pages/client/ClientBooking";
import ClientProfile from "../pages/client/ClientProfile";
import ClientSessions from "../pages/client/ClientSessions";
import ClientNotes from "../pages/client/ClientNotes";
import ClientProgress from "../pages/client/ClientProgress";
import ClientGoals from "../pages/client/ClientGoals";
import MySessions from "../pages/client/MySessions";
import MyExercises from "../pages/client/MyExercises";
import ClientMobileRequests from "../pages/client/ClientMobileRequests";
import ClientFavorites from "../pages/client/ClientFavorites";
import ClientTreatmentPlans from "../pages/client/ClientTreatmentPlans";
import ConnectAccount from "../pages/payments/ConnectAccount";
import BookingDashboard from "../pages/booking/BookingDashboard";
import Notifications from "../pages/Notifications";
import AuthCallback from "../components/auth/AuthCallback";
import RoleSelection from "../pages/auth/RoleSelection";
import OAuthCompletion from "../pages/auth/OAuthCompletion";
import GoogleCalendarCallback from "../pages/auth/google-calendar-callback";
import Unauthorized from "../pages/Unauthorized";
import PublicTherapistProfile from "../pages/public/PublicTherapistProfile";
import DirectBooking from "../pages/public/DirectBooking";
import GuestMobileRequests from "../pages/public/GuestMobileRequests";
import BookingSuccess from "../pages/BookingSuccess";
import MobileBookingSuccess from "../pages/MobileBookingSuccess";
import GuestBookingView from "../pages/booking/GuestBookingView";
import FindMyBooking from "../pages/booking/FindMyBooking";
import SubscriptionSuccess from "../pages/SubscriptionSuccess";
import StripeReturn from "../pages/onboarding/StripeReturn";
import ProfileRedirect from "./ProfileRedirect";
// import { shouldRedirectToOnboarding } from "@/lib/dashboard-routing";

// Layout wrapper for authenticated routes
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="w-full max-w-none px-6 py-8">
        {children}
      </main>
    </div>
  );
};

/** Single marketplace route: unified experience for all users (with or without login). */
function MarketplaceRoute() {
  return <Marketplace />;
}

const AppContent = () => {
  const { user, userProfile } = useAuth();
  
  // Simplified: No automatic popups or modals
  // Users go directly to their appropriate dashboard after authentication

  return (
    <>
      <RouteChangeTracker />
      {/* Simplified: No automatic popups or modals */}
      {/* Users go directly to their appropriate dashboard after authentication */}

      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Index />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/client/how-it-works" element={<ClientHowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<HelpCentre />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/design-system" element={<DesignSystem />} />
        
        {/* Legacy /explore redirects to single marketplace URL */}
        <Route path="/explore" element={<Navigate to="/marketplace" replace />} />
        {/* Direct booking link - public route for practitioner booking slugs */}
        <Route path="/book/:slug" element={<DirectBooking />} />
        <Route path="/guest/mobile-requests" element={<GuestMobileRequests />} />
        {/* IMPORTANT: Public therapist profile route MUST come before the protected /therapist/:therapistId route */}
        <Route path="/therapist/:therapistId/public" element={<PublicTherapistProfile />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/mobile-booking/success" element={<MobileBookingSuccess />} />
        <Route path="/booking/view/:sessionId" element={<GuestBookingView />} />
        <Route path="/booking/find" element={<FindMyBooking />} />
        <Route path="/review" element={<GuestReview />} />
        
        {/* Authentication */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/reset-password-confirm" element={<ResetPasswordConfirm />} />
        <Route path="/auth/verify-email" element={<EmailVerification />} />
        <Route path="/auth/registration-success" element={<RegistrationSuccess />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/role-selection" element={<SimpleProtectedRoute><RoleSelection /></SimpleProtectedRoute>} />
        <Route path="/auth/oauth-completion" element={<SimpleProtectedRoute><OAuthCompletion /></SimpleProtectedRoute>} />
        <Route path="/onboarding" element={<SimpleProtectedRoute><Onboarding /></SimpleProtectedRoute>} />
        <Route path="/subscription-success" element={<SimpleProtectedRoute><SubscriptionSuccess /></SimpleProtectedRoute>} />
        <Route path="/onboarding/stripe-return" element={<SimpleProtectedRoute><StripeReturn /></SimpleProtectedRoute>} />
        <Route path="/auth/google-calendar-callback" element={<GoogleCalendarCallback />} />
        
        {/* Practitioner Routes - AuthRouter handles role access */}
        <Route path="/dashboard" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Dashboard /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/find-therapists" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><FindTherapists /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/bookings" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><MyBookings /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/offer-services" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><OfferServices /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/credits" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Credits /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/profile/create" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CreateProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/profile/edit" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><EditProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        {/* Protected therapist profile route - must come AFTER the public route */}
        <Route path="/therapist/:therapistId" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ViewProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/reviews" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Reviews /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/reviews/submit/:sessionId" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><SubmitReview /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/messages" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><RealTimeMessaging /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/settings" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><SettingsProfile /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/settings/privacy" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><SettingsPrivacyTools /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/settings/subscription" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><SettingsSubscription /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Client Routes - AuthRouter handles role access */}
        <Route path="/client/dashboard" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientDashboard /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/booking" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientBooking /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/profile" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientProfile /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/sessions" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><MySessions /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/progress" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientProgress /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/goals" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientGoals /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/exercises" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><MyExercises /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/mobile-requests" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientMobileRequests /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/messages" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><RealTimeMessaging /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/notes" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><Navigate to="/client/sessions?tab=notes" replace /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/plans" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientTreatmentPlans /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/favorites" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ClientFavorites /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Universal Profile Route */}
        <Route path="/profile" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ProfileRedirect /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Project Management Routes */}
        <Route path="/projects" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Projects /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/dashboard/projects" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><DashboardProjects /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/treatment-projects" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><DashboardProjects /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/dashboard/projects/create" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CreateProject /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Analytics Routes */}
        <Route path="/analytics" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><AnalyticsDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/analytics/reports" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><AdvancedReports /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Marketplace - public experience when not logged in, app experience when logged in */}
        <Route path="/marketplace" element={<MarketplaceRoute />} />
        
        {/* Payment Routes */}
        <Route path="/payments/connect" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ConnectAccount /></AuthenticatedLayout></SimpleProtectedRoute>} />
        {/** Demo route removed in production */}
        
        {/* Booking Routes */}
        <Route path="/booking" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><BookingDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Professional Development Routes */}
        <Route path="/cpd" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CPDInfo /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Notifications Route - Available to all authenticated users */}
        <Route path="/notifications" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><Notifications /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Practice Management Routes */}
        <Route path="/practice" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Dashboard /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/dashboard" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Dashboard /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/schedule" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><PracticeSchedule /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/sessions/:sessionId/notes" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><SessionNotesRedirect /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/clients" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><PracticeClientManagement /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/scheduler" element={<SimpleProtectedRoute><AuthenticatedLayout><ErrorBoundary><ServicesManagement /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/mobile-requests" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><MobileRequests /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/notes" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><PracticeClientManagement /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/treatment-notes" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><PracticeClientManagement /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/sessions/:sessionId" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><SessionDetailView /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/clinical-files" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><EnhancedTreatmentNotes /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/treatment-plans" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><TreatmentPlans /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/peer-treatment" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Navigate to="/credits#peer-treatment" replace /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/treatment-exchange" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Navigate to="/credits" replace /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/exchange-requests" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><ExchangeRequests /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/billing" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><Billing /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/analytics" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><BusinessAnalytics /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/calendar" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ErrorBoundary><CalendarSettings /></ErrorBoundary></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Admin Routes - AuthRouter handles role access */}
        <Route path="/admin/verification" element={<SimpleProtectedRoute><AuthenticatedLayout><AdminVerificationDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Unauthorized Access Route */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppContent;
