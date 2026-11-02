/**
 * Auth page — upgrade surface for guests who want to save their journey.
 *
 * On success: merges guest onboarding data and navigates to /home.
 * Never used as a hard blocker — guests can always continue from /home.
 */
import AuthForm from "@/components/auth/AuthForm";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, navigate] = useLocation();

  const handleAuthSuccess = () => {
    // Full page reload ensures AuthContext bootstraps fresh with the new JWT token.
    // SPA navigation can race with React's state batching; reload is reliable.
    window.location.href = "/home";
  };

  const handleBack = () => {
    navigate("/read");
  };

  return (
    <AuthForm
      onSuccess={handleAuthSuccess}
      onBack={handleBack}
    />
  );
}
