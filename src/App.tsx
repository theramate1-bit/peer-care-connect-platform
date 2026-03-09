import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityService } from "@/lib/security";
import { PerformanceService } from "@/lib/performance";
import "@/lib/manual-logout"; // Import manual logout utility

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

const SafeTooltipProvider = TooltipProvider as React.ComponentType<{ children: React.ReactNode }>;

const App = () => {
  // CACHE BUST v3.0 - CLEAN VERSION WITH LIVE CHAT ENABLED
  // Initialize security and performance optimizations
  React.useEffect(() => {
    // PerformanceService.initialize() is called automatically
    // SecurityService doesn't need initialization
  }, []);

  // Ensure React is available before rendering
  if (!React) {
    console.error('React is not available in App component');
    return null;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <PlanProvider>
              <NavigationProvider>
                <SafeTooltipProvider>
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
                </SafeTooltipProvider>
              </NavigationProvider>
              </PlanProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;

// Add defensive checks for undefined components to prevent React error #300
// Moved to runtime check inside component to avoid module-level execution issues
if (typeof window !== 'undefined') {
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

  // Log any undefined components (only in browser, after React is loaded)
  Object.entries(componentChecks).forEach(([name, component]) => {
    if (!component) {
      console.error(`Component ${name} is undefined`);
    }
  });
}