import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AuthLoadingShell } from "@/components/auth/AuthLoadingShell";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRedirectPath } from "@/lib/access-policy";
import type { AccessProfile } from "@/lib/access-policy";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth / magic-link callback — exchanges `?code=` and lands user on dashboard.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const code = searchParams.get("code");
        const hash = window.location.hash;

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (hash.includes("access_token")) {
          const { error: sessErr } = await supabase.auth.getSession();
          if (sessErr) throw sessErr;
        } else {
          const { error: sessErr } = await supabase.auth.getSession();
          if (sessErr) throw sessErr;
        }

        await refreshProfile?.();

        const redirect = searchParams.get("redirect");
        if (redirect && redirect.startsWith("/")) {
          navigate(redirect, { replace: true });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id, user_role, onboarding_status, first_name, last_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const target = profile
          ? getPostAuthRedirectPath(profile as AccessProfile)
          : "/marketplace";
        if (!cancelled) navigate(target, { replace: true });
      } catch (e) {
        console.error("[auth/callback]", e);
        const msg = e instanceof Error ? e.message : "Sign-in failed";
        setError(msg);
        toast.error(msg);
        if (!cancelled) {
          setTimeout(() => navigate("/login", { replace: true }), 2500);
        }
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, refreshProfile]);

  if (error) {
    return (
      <AuthLoadingShell
        message={`Sign-in issue: ${error}. Redirecting to login…`}
      />
    );
  }

  return <AuthLoadingShell message="Completing sign-in…" />;
};

export default AuthCallback;
