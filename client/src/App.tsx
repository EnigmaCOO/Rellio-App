import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoadingSplash from "@/components/LoadingSplash";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsOfServicePage from "@/pages/terms";
import NotFound from "@/pages/not-found";
import InstallPrompt from "@/components/InstallPrompt";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="futuristic-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading Rellio...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth">
        {() =>
          isAuthenticated ? <Redirect to="/dashboard" replace /> : <AuthPage />
        }
      </Route>
      <Route path="/dashboard">
        {() =>
          isAuthenticated ? <Dashboard /> : <Redirect to="/auth" replace />
        }
      </Route>
      <Route path="/profile">
        {() =>
          isAuthenticated ? <ProfilePage /> : <Redirect to="/auth" replace />
        }
      </Route>
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingSplash
          show={showSplash}
          onComplete={() => setShowSplash(false)}
        />
        <div
          className={`transition-opacity duration-500 ${
            showSplash ? "opacity-0" : "opacity-100"
          }`}
        >
          <InstallPrompt />
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
