import React from "react";
import RouteChangeTracker from "./analytics/RouteChangeTracker";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SimpleProtectedRoute } from "@/components/auth/SimpleProtectedRoute";
import { Header } from "@/components/Header";
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
import Messages from "../pages/Messages";
import CPDInfo from "../pages/cpd/CPDInfo";
import { SettingsProfile } from "../pages/settings/SettingsProfile";
import SettingsPrivacyTools from "../pages/settings/SettingsPrivacyTools";
import ClientManagement from "../pages/practice/ClientManagement";
import PracticeClientManagement from "../pages/practice/PracticeClientManagement";
import AppointmentScheduler from "../pages/practice/AppointmentScheduler";
import TreatmentNotes from "../pages/practice/TreatmentNotes";
import Billing from "../pages/practice/Billing";
import BusinessAnalytics from "../pages/practice/BusinessAnalytics";
import EnhancedTreatmentNotes from "../pages/practice/EnhancedTreatmentNotes";
import CalendarSettings from "../pages/practice/CalendarSettings";
import TreatmentExchange from "../pages/practice/TreatmentExchange";
import ExchangeRequests from "../pages/practice/ExchangeRequests";
import CreateProfile from "../pages/profiles/CreateProfile";
import EditProfile from "../pages/profiles/EditProfile";
import ViewProfile from "../pages/profiles/ViewProfile";
import AdminVerificationDashboard from "../pages/admin/VerificationDashboard";
import SubmitReview from "../pages/reviews/SubmitReview";
import Projects from "../pages/projects/Projects";
import CreateProject from "../pages/projects/CreateProject";
import Analytics from "../pages/analytics/Analytics";
import AnalyticsDashboard from "../pages/AnalyticsDashboard";
import DashboardProjects from "../pages/DashboardProjects";
import Marketplace from "../pages/Marketplace";
import Payments from "../pages/payments/Payments";
import ClientDashboard from "../pages/client/ClientDashboard";
import ClientBooking from "../pages/client/ClientBooking";
import ClientProfile from "../pages/client/ClientProfile";
import ClientSessions from "../pages/client/ClientSessions";
import PeerTreatmentBooking from "../pages/practice/PeerTreatmentBooking";
import ConnectAccount from "../pages/payments/ConnectAccount";
import BookingDashboard from "../pages/booking/BookingDashboard";
import AuthCallback from "../components/auth/AuthCallback";
import RoleSelection from "../pages/auth/RoleSelection";
import OAuthCompletion from "../pages/auth/OAuthCompletion";
import Unauthorized from "../pages/Unauthorized";
import PublicMarketplace from "../pages/public/PublicMarketplace";
import PublicTherapistProfile from "../pages/public/PublicTherapistProfile";
import ProfileRedirect from "./ProfileRedirect";
// import { shouldRedirectToOnboarding } from "@/lib/dashboard-routing";

// Layout wrapper for authenticated routes
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

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
        
        {/* Public Marketplace */}
        <Route path="/marketplace" element={<PublicMarketplace />} />
        <Route path="/therapist/:therapistId/public" element={<PublicTherapistProfile />} />
        
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
        
        {/* Practitioner Routes - AuthRouter handles role access */}
        <Route path="/dashboard" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/find-therapists" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><FindTherapists /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/bookings" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><MyBookings /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/offer-services" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><OfferServices /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/credits" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Credits /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/profile/create" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CreateProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/profile/edit" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><EditProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/therapist/:therapistId" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ViewProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/reviews" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Reviews /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/reviews/submit/:sessionId" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><SubmitReview /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/messages" element={<SimpleProtectedRoute><AuthenticatedLayout><Messages /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/settings" element={<SimpleProtectedRoute><AuthenticatedLayout><SettingsProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/settings/privacy" element={<SimpleProtectedRoute><AuthenticatedLayout><SettingsPrivacyTools /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Client Routes - AuthRouter handles role access */}
        <Route path="/client/dashboard" element={<SimpleProtectedRoute><AuthenticatedLayout><ClientDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/booking" element={<SimpleProtectedRoute><AuthenticatedLayout><ClientBooking /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/profile" element={<SimpleProtectedRoute><AuthenticatedLayout><ClientProfile /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/client/sessions" element={<SimpleProtectedRoute><AuthenticatedLayout><ClientSessions /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Universal Profile Route */}
        <Route path="/profile" element={<SimpleProtectedRoute><AuthenticatedLayout><ProfileRedirect /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Project Management Routes */}
        <Route path="/dashboard/projects" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><DashboardProjects /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/dashboard/projects/create" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CreateProject /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Analytics Routes */}
        <Route path="/analytics" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><AnalyticsDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Marketplace Routes */}
        <Route path="/marketplace" element={<SimpleProtectedRoute><AuthenticatedLayout><Marketplace /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Payment Routes */}
        <Route path="/payments" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Payments /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/payments/connect" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ConnectAccount /></AuthenticatedLayout></SimpleProtectedRoute>} />
        {/** Demo route removed in production */}
        
        {/* Booking Routes */}
        <Route path="/booking" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><BookingDashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Professional Development Routes */}
        <Route path="/cpd" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CPDInfo /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
        {/* Practice Management Routes */}
        <Route path="/practice" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/dashboard" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/clients" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><PracticeClientManagement /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/scheduler" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><AppointmentScheduler /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/notes" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><TreatmentNotes /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/clinical-files" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><EnhancedTreatmentNotes /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/peer-treatment" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><PeerTreatmentBooking /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/treatment-exchange" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><TreatmentExchange /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/exchange-requests" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><ExchangeRequests /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/billing" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><Billing /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/analytics" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><BusinessAnalytics /></AuthenticatedLayout></SimpleProtectedRoute>} />
        <Route path="/practice/calendar" element={<SimpleProtectedRoute requireSubscription={true}><AuthenticatedLayout><CalendarSettings /></AuthenticatedLayout></SimpleProtectedRoute>} />
        
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
