/**
 * Central flow resolver — the single place that decides where a user should be.
 *
 * Input: current auth + onboarding state
 * Output: the canonical route the user should be on
 *
 * State machine:
 *   loading            → stay (show splash/spinner)
 *   not started        → /onboarding
 *   in_progress        → /onboarding (resume)
 *   complete (guest)   → /home
 *   complete (authed)  → /home
 */

export type OnboardingStatus = "loading" | "not_started" | "in_progress" | "complete";

export interface FlowState {
  authLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  onboardingStatus: OnboardingStatus;
}

export type AppRoute = "/" | "/onboarding" | "/home" | "/auth";

/**
 * Pure function — no side effects.
 * Returns the canonical route the user should be on.
 */
export function resolveRoute(state: FlowState): AppRoute {
  if (state.authLoading) return "/"; // Stay put while loading

  if (state.onboardingStatus === "not_started" || state.onboardingStatus === "in_progress") {
    return "/onboarding";
  }

  // onboarding complete (guest or authenticated)
  return "/home";
}

/**
 * Derive onboarding status from a localStorage profile snapshot.
 * Non-reactive — call at mount or after known state changes.
 */
export function deriveOnboardingStatus(profile: {
  completed: boolean;
  goals?: string[];
}): OnboardingStatus {
  if (profile.completed) return "complete";
  if (profile.goals && profile.goals.length > 0) return "in_progress";
  return "not_started";
}
