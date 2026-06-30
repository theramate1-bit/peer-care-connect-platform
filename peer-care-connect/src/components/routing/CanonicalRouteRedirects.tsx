import { Navigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

/** One profile surface per role — avoids /settings/profile duplicating /profile or /client/profile. */
export function RoleAwareProfileRedirect() {
  const { userProfile } = useAuth();
  if (userProfile?.user_role === "client") {
    return <Navigate to="/client/profile" replace />;
  }
  return <Navigate to="/profile" replace />;
}
