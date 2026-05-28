import type { ReactNode } from "react";

import { SimpleProtectedRoute } from "@/components/auth/SimpleProtectedRoute";

type AppRouteProps = {
  children: ReactNode;
  requireSubscription?: boolean;
};

export function AppRoute({
  children,
  requireSubscription = false,
}: AppRouteProps) {
  return (
    <SimpleProtectedRoute requireSubscription={requireSubscription}>
      {children}
    </SimpleProtectedRoute>
  );
}
