import { supabase } from "@/integrations/supabase/client";

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export class AuthErrorHandler {
  static isAuthenticationError(error: unknown): boolean {
    const e = error as AuthErrorLike;
    const msg = (e?.message ?? "").toLowerCase();
    const code = (e?.code ?? "").toLowerCase();
    if (e?.status === 401 || e?.status === 403) return true;
    if (code.includes("jwt") || code === "pgrst301") return true;
    return (
      msg.includes("jwt") ||
      msg.includes("invalid claim") ||
      msg.includes("not authenticated") ||
      msg.includes("session")
    );
  }

  static async performSilentLogout(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
  }

  /** Returns true if caller should retry once after refresh. */
  static async handleAuthError(error: unknown): Promise<boolean> {
    if (!AuthErrorHandler.isAuthenticationError(error)) return false;
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      return !refreshError;
    } catch {
      return false;
    }
  }
}
