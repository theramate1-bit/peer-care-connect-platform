import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionContextValue = {
  subscribed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined,
);

const PRACTITIONER_ROLES = new Set([
  "sports_therapist",
  "massage_therapist",
  "osteopath",
]);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id || !userProfile?.user_role) {
      setSubscribed(false);
      setLoading(false);
      return;
    }

    if (!PRACTITIONER_ROLES.has(userProfile.user_role)) {
      setSubscribed(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[subscription] lookup failed:", error.message);
        setSubscribed(false);
        return;
      }
      setSubscribed(!!data);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile?.user_role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ subscribed, loading, refresh }),
    [subscribed, loading, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
