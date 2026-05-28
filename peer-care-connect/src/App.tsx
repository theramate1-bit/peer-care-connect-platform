import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import AppContent from "@/components/AppContent";

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
