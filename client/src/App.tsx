import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/hooks/useOnboarding";
import { mergeGuestOnboardingToAccount } from "@/hooks/useOnboarding";
import LoadingSplash from "@/components/LoadingSplash";
import AuthPage from "@/pages/auth";
import ProfilePage from "@/pages/profile";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsOfServicePage from "@/pages/terms";
import NotFound from "@/pages/not-found";
import InstallPrompt from "@/components/InstallPrompt";
import OnboardingPage from "@/pages/onboarding";
import { AppShell } from "@/components/AppShell";
import MysteriesPage from "@/pages/MysteriesPage";
import SacredMapPage from "@/pages/SacredMapPage";
import SacredGlobe from "@/features/sacred-map/SacredGlobe";
import LibraryPage from "@/pages/library";
import ReaderPage from "@/pages/reader";
import AskPage from "@/pages/ask";
import YouPage from "@/pages/you";

// ─── Google OAuth return handler ───────────────────────────────────────────
function useGoogleAuthReturn() {
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;

    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    const pendingMerge = localStorage.getItem("rellio_pending_merge");

    if ((authParam === "success" || pendingMerge === "1") && isAuthenticated) {
      localStorage.removeItem("rellio_pending_merge");
      window.history.replaceState({}, "", window.location.pathname);
      mergeGuestOnboardingToAccount().catch(() => {});
    }

    if (params.get("error") === "auth_cancelled" || params.get("error") === "auth_failed") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isAuthenticated, isLoading]);
}

// ─── Route guards ──────────────────────────────────────────────────────────
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  if (!isOnboardingComplete()) return <Redirect to="/onboarding" />;
  return <>{children}</>;
}

// ─── Router ────────────────────────────────────────────────────────────────
function Router() {
  const { isLoading } = useAuthContext();
  useGoogleAuthReturn();

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading Rellio...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public / marketing */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />

      {/* Onboarding wizard */}
      <Route path="/onboarding" component={OnboardingPage} />

      {/* Reader — full-bleed, no shell */}
      <Route path="/reader/:id">
        <OnboardingGuard>
          <ReaderPage />
        </OnboardingGuard>
      </Route>

      {/* Exploration drawers (still routed for deep links) */}
      <Route path="/mysteries" component={MysteriesPage} />
      <Route path="/sacred-map" component={SacredMapPage} />

      {/* Profile / settings — accessible from You tab */}
      <Route path="/profile">
        <AppShell>
          <ProfilePage />
        </AppShell>
      </Route>

      {/* ── Three primary tabs ─────────────────────────────────────────── */}
      <Route path="/">
        <OnboardingGuard><AppShell><LibraryPage /></AppShell></OnboardingGuard>
      </Route>
      <Route path="/read">
        <OnboardingGuard><AppShell><LibraryPage /></AppShell></OnboardingGuard>
      </Route>
      <Route path="/map">
        <OnboardingGuard><AppShell><SacredGlobe /></AppShell></OnboardingGuard>
      </Route>
      <Route path="/ask">
        <OnboardingGuard><AppShell><AskPage /></AppShell></OnboardingGuard>
      </Route>
      <Route path="/you">
        <OnboardingGuard><AppShell><YouPage /></AppShell></OnboardingGuard>
      </Route>

      {/* ── Retired routes — redirect to current shell ───────────────── */}
      <Route path="/home"><Redirect to="/read" /></Route>
      <Route path="/library"><Redirect to="/read" /></Route>
      <Route path="/dashboard"><Redirect to="/read" /></Route>
      <Route path="/community"><Redirect to="/ask" /></Route>
      <Route path="/me"><Redirect to="/you" /></Route>
      <Route path="/compare"><Redirect to="/ask?mode=compare" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Belt-and-suspenders: never let the splash hide the entire UI for more than ~2.5s.
  useEffect(() => {
    const t = window.setTimeout(() => setShowSplash(false), 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const isViteNoise = (msg: string) =>
      /websocket|vite|localhost:undefined|hmr|failed to construct/i.test(msg);

    const handleError = (e: ErrorEvent) => {
      if (isViteNoise(e.message + (e.error?.stack ?? ""))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      console.error("Global error:", e.error);
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message ?? e.reason ?? "");
      if (isViteNoise(msg)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      console.error("Unhandled rejection:", e.reason);
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);
    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LoadingSplash show={showSplash} onComplete={() => setShowSplash(false)} />
          <div className={`transition-opacity duration-500 ${showSplash ? "opacity-0" : "opacity-100"}`}>
            <InstallPrompt />
            <Toaster />
            <Router />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
