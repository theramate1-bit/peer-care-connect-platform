import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityService } from "@/lib/security";
import { PerformanceService } from "@/lib/performance";
import { initGlobalErrorHandler } from "@/lib/error-handler";
import { initErrorSuppression } from "@/lib/error-suppression";

// Defensive check: Ensure React is properly imported and available
if (!React) {
  throw new Error('React is not available');
}

const queryClient = new QueryClient();

import AppContent from "./components/AppContent";
import UrlFragmentHandler from "./components/auth/UrlFragmentHandler";
import AuthRouter from "./components/auth/AuthRouter";
import LiveChat from "./components/LiveChat";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import CookieConsent from "./components/analytics/CookieConsent";

const App = () => {
  // CACHE BUST v3.0 - CLEAN VERSION WITH LIVE CHAT ENABLED
  // Initialize security, performance optimizations, and error handling
  useEffect(() => {
    // PerformanceService.initialize() is called automatically
    // SecurityService doesn't need initialization
    
    // Initialize error suppression for third-party services
    initErrorSuppression({
      suppressTawkToErrors: false, // DISABLED: Don't suppress logs to debug React error #300
      suppressStripeErrors: false, // DISABLED: Don't suppress logs to debug React error #300
      suppressAdBlockerErrors: false, // DISABLED: Don't suppress logs to debug React error #300
      logSuppressedErrors: true, // ENABLED: Show all logs to debug React error #300
    });
    
    // DISABLED: Don't suppress console errors to debug React error #300
    // if (typeof window !== 'undefined') {
    //   // Suppress Stripe analytics errors immediately
    //   const originalConsoleError = console.error;
    //   console.error = (...args: any[]) => {
    //     const message = args.join(' ').toLowerCase();
    //     if (message.includes('r.stripe.com') || 
    //         message.includes('stripe') && message.includes('blocked') ||
    //         message.includes('net::err_blocked_by_client') ||
    //         message.includes('elements is not defined') ||
    //         message.includes('lazystripeprovider') ||
    //         message.includes('va.tawk.to') ||
    //         message.includes('tawk.to')) {
    //       return; // Suppress all third-party errors
    //     }
    //     originalConsoleError.apply(console, args);
    //   };
    // }
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SubscriptionProvider>
                <NavigationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <UrlFragmentHandler />
                    <AuthRouter>
                      <RealtimeProvider>
                        <AppContent />
                      </RealtimeProvider>
                    </AuthRouter>
                    <LiveChat />
                    <CookieConsent />
                  </TooltipProvider>
                </NavigationProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;

// Add defensive checks for undefined components to prevent React error #300
const componentChecks = {
  AuthProvider,
  SubscriptionProvider,
  NavigationProvider,
  TooltipProvider,
  RealtimeProvider,
  AppContent,
  AuthRouter,
  UrlFragmentHandler,
  LiveChat,
  CookieConsent
};

// Log any undefined components
Object.entries(componentChecks).forEach(([name, component]) => {
  if (!component) {
    console.error(`Component ${name} is undefined`);
  }
});