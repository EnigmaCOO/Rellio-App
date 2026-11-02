/**
 * useAuth — backward-compatible wrapper around AuthContext.
 *
 * All new code should import useAuthContext() from @/contexts/AuthContext.
 * This hook exists so existing consumers don't break.
 */
import { useAuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  const ctx = useAuthContext();
  return {
    user: ctx.user,
    isLoading: ctx.isLoading,
    isAuthenticated: ctx.isAuthenticated,
    isGuest: ctx.isGuest,
  };
}
