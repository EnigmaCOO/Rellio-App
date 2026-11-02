/**
 * AuthContext — the single source of truth for identity in Rellio.
 *
 * Responsibilities:
 *  1. Track current user (authenticated or guest)
 *  2. Expose sign-in / sign-up / sign-out actions
 *  3. On every successful sign-in: auto-call mergeGuestOnboardingToAccount()
 *     so guest progress is never lost.
 *  4. When Firebase is configured: use Firebase auth for Google/Apple AND
 *     email/password (with email-link verification). When not configured:
 *     fall back to backend session + Express guest + backend OTP signup.
 *
 * Email-verification flow (Firebase path):
 *   signUpWithFirebaseEmail() creates the Firebase user, sends the
 *   verification link, and stashes the typed-in profile fields in
 *   sessionStorage. The UI shows a "verify your email" screen.
 *   completeEmailVerification() reloads the Firebase user, confirms
 *   emailVerified=true, and POSTs /api/v1/auth/sync with the stashed
 *   profile fields so the backend creates a Rellio user with the right
 *   firstName/lastName/username (Firebase email/password signups don't
 *   carry those in the token).
 *
 * Consumers should import useAuthContext() instead of the old useAuth hook.
 * useAuth() is kept as a thin alias for backwards compatibility.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { firebaseAuth, googleProvider, appleProvider, firebaseConfigured, firebaseMissingVars } from "@/lib/firebase";
import { mergeGuestOnboardingToAccount } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";

// ─── Firebase error mapping ───────────────────────────────────────────────────

/**
 * Error subclass thrown for Firebase popup failures. Preserves the
 * original `auth/...` code so callers (e.g. AuthForm) can branch on
 * it (for example, persisting an Apple-disabled state after the first
 * `auth/operation-not-allowed`) without re-importing Firebase types.
 */
export class FirebasePopupError extends Error {
  readonly code: string;
  readonly provider: "google" | "apple";
  constructor(message: string, code: string, provider: "google" | "apple") {
    super(message);
    this.name = "FirebasePopupError";
    this.code = code;
    this.provider = provider;
  }
}

/**
 * Thrown by signInWithEmail when a Firebase email/password account exists but
 * the user hasn't clicked the verification link yet. AuthContext has already
 * persisted the pending-signup state and proactively re-sent the link, so the
 * UI just needs to switch to the "check your email" verification screen.
 */
export class UnverifiedFirebaseEmailError extends Error {
  readonly email: string;
  constructor(email: string, message: string) {
    super(message);
    this.name = "UnverifiedFirebaseEmailError";
    this.email = email;
  }
}

/**
 * Translate Firebase's terse error codes into actionable English so users
 * can self-diagnose the most common social sign-in failures (unauthorized
 * domain, popup blocker, missing API key, Apple provider not enabled).
 */
function mapFirebaseError(err: unknown, provider: "google" | "apple"): string {
  const code = (err as { code?: string }).code ?? "";
  const fallback = (err as { message?: string }).message ?? "Sign-in failed.";
  const providerLabel = provider === "google" ? "Google" : "Apple";

  switch (code) {
    case "auth/unauthorized-domain":
      return (
        `This domain isn't authorized in Firebase. Add ${window.location.hostname} ` +
        `to Firebase → Authentication → Settings → Authorized domains and try again.`
      );
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return `${providerLabel} sign-in is not configured. Set the Firebase web SDK env vars (VITE_FIREBASE_*).`;
    case "auth/operation-not-allowed":
      return provider === "apple"
        ? "Apple sign-in isn't enabled in Firebase yet. Enable the Apple provider in Firebase → Authentication → Sign-in method."
        : "Google sign-in isn't enabled in Firebase yet. Enable the Google provider in Firebase → Authentication → Sign-in method.";
    case "auth/network-request-failed":
      return "Network error reaching Firebase. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists with a different sign-in method. Sign in with your original method first, then link this provider.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/internal-error":
      return `${providerLabel} sign-in failed (internal error). Try again, or check that Firebase is correctly configured.`;
    default:
      return code ? `${providerLabel} sign-in failed (${code}). ${fallback}` : fallback;
  }
}

/**
 * Translate Firebase email/password error codes for the signup flow.
 * Returned message is shown directly to the user via toast.
 */
function mapFirebaseEmailError(err: unknown, mode: "signup" | "signin"): string {
  const code = (err as { code?: string }).code ?? "";
  const fallback = (err as { message?: string }).message ?? "Authentication failed.";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters).";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/user-not-found":
      return "No account found with this email. Sign up to create one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error reaching Firebase. Check your connection and try again.";
    default:
      return code
        ? `${mode === "signup" ? "Sign-up" : "Sign-in"} failed (${code}). ${fallback}`
        : fallback;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  guest?: boolean;
  firebaseUid?: string;
  // Optional fields exposed by the backend `sanitizeUser` payload and
  // consumed by the profile UI. Marking them optional keeps guest users
  // (which don't carry these fields) compatible with the same type.
  phone?: string | null;
  verified?: number;
  socialProvider?: string | null;
  createdAt?: string | Date;
}

/**
 * Result of a sign-up attempt.
 *  - verificationMode === "firebase" → user must click the email link,
 *    then call completeEmailVerification().
 *  - verificationMode === "otp"      → user must enter a 6-digit code
 *    sent by the backend (legacy SendGrid+OTP path); call verifyOtp().
 *  - requiresVerification === false  → user is already signed in
 *    (auto-verify in dev mode without a provider).
 */
export interface SignUpResult {
  requiresVerification: boolean;
  verificationMode?: "firebase" | "otp";
  email?: string;
}

/**
 * Profile fields stashed in sessionStorage during the Firebase email
 * verification round-trip. Restored when the user clicks "I've verified
 * my email" so the backend can create their Rellio user with the right
 * firstName/lastName/username (which Firebase email signups don't carry).
 */
interface PendingFirebaseSignup {
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

const PENDING_SIGNUP_KEY = "rellio_pending_signup";

/**
 * Outcome of a social sign-in attempt.
 *  - "ok"        sign-in completed end-to-end (Firebase popup + backend sync).
 *  - "cancelled" the user dismissed the popup (no error toast, no nav).
 *  Any thrown error is surfaced to the caller as a toast and the form
 *  stays put — there is no "error" status because we use exceptions for
 *  failures so existing try/catch sites keep working.
 */
export type SocialSignInResult = "ok" | "cancelled";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    username: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<SignUpResult>;
  // Legacy backend-OTP path (used only when Firebase web SDK is not configured)
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  // Firebase email-link verification path (used when firebaseConfigured)
  completeEmailVerification: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  clearPendingVerification: () => Promise<void>;
  signInWithGoogle: () => Promise<SocialSignInResult>;
  signInWithApple: () => Promise<SocialSignInResult>;
  signOut: () => Promise<void>;
  // Re-fetches /api/auth/user and updates the context's user state.
  // Used after profile edits so the UI reflects the latest server data
  // without requiring a page reload.
  refreshUser: () => Promise<void>;

  // Feature flags
  googleAvailable: boolean;
  appleAvailable: boolean;
  firebaseEmailAvailable: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

// ─── sessionStorage helpers ───────────────────────────────────────────────────

function readPendingSignup(): PendingFirebaseSignup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingFirebaseSignup;
    if (!parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePendingSignup(p: PendingFirebaseSignup): void {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(p));
  } catch {
    /* sessionStorage may be unavailable (private mode); the in-memory ref still works */
  }
}

function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    /* noop */
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Tracks IN-FLIGHT Firebase /api/v1/auth/sync calls per UID. The popup
  // sign-in handler and the onAuthStateChanged listener both fire on a
  // fresh social sign-in; without dedupe they'd both POST /sync and could
  // race the welcome-email gate. Using a Promise map (instead of a
  // permanent Set) lets concurrent callers share one in-flight request
  // and then RELEASES the slot on completion, so the same UID can be
  // re-synced later (e.g. sign-out → sign-in again in the same tab).
  const firebaseSyncInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  // In-memory mirror of sessionStorage for the verification round-trip.
  // Survives React re-renders without re-reading sessionStorage on every
  // call, but sessionStorage remains the source of truth across full
  // page reloads (e.g. user mid-verification refreshes the tab).
  const pendingSignupRef = useRef<PendingFirebaseSignup | null>(readPendingSignup());

  // ─── Bootstrap: load identity from backend session on mount ─────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const data = await apiRequest("/api/auth/user");
        if (!cancelled) {
          setUser(data.guest ? { ...data } : data);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    // If Firebase is configured, also subscribe to Firebase auth state
    if (firebaseConfigured && firebaseAuth) {
      const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser && !cancelled) {
          // Listener context: swallow + log. The popup caller already
          // surfaces this same failure to the user via toast — without
          // this guard, a sync rejection here becomes an unhandled
          // promise rejection (and may even fire a duplicate toast).
          try {
            await handleFirebaseUserSignedIn(fbUser, cancelled);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[auth] background Firebase sync failed:", err);
          }
        }
      });
      return () => {
        cancelled = true;
        unsub();
      };
    }

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Refresh user from backend ──────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest("/api/auth/user");
      setUser(data.guest ? { ...data } : data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch {
      // Non-fatal — keep existing in-memory user
    }
  }, [queryClient]);

  // ─── After any sign-in: run merge and refresh backend user ──────────────
  const afterSignIn = useCallback(async () => {
    // Merge guest onboarding data into the authenticated account
    await mergeGuestOnboardingToAccount();
    await refreshUser();
  }, [refreshUser]);

  // ─── Firebase user signed in → sync to backend ──────────────────────────
  //
  // Called from three sites:
  //   1. signInWithGoogle / signInWithApple popup completion
  //   2. onAuthStateChanged listener (fires on tab reload, popup completion)
  //   3. completeEmailVerification (after the user clicks the link)
  //
  // CRITICAL gate: for email/password Firebase users, we skip the sync
  // entirely until emailVerified is true. Otherwise a user who signs up
  // and refreshes the tab before clicking the link would silently get a
  // half-baked Rellio account (verified=0, no welcome email).
  const handleFirebaseUserSignedIn = useCallback(
    async (
      fbUser: FirebaseUser,
      cancelled: boolean,
      profileOverride?: { firstName?: string; lastName?: string; username?: string },
    ) => {
      // Skip when the user hasn't yet verified their email. This applies
      // to email/password signups awaiting the verification-link click.
      // Google/Apple Firebase users always come back with emailVerified=true.
      if (!fbUser.emailVerified) {
        return;
      }

      // De-dupe concurrent calls for the same UID via an in-flight
      // promise map. Two near-simultaneous callers (popup handler +
      // onAuthStateChanged listener) will share a single sync request.
      // Once the request settles, the UID is released so future
      // sign-ins (after sign-out, token refresh, etc.) re-run sync.
      const existing = firebaseSyncInFlightRef.current.get(fbUser.uid);
      if (existing) return existing;

      // Resolve profile payload — explicit override > stashed pending signup.
      // This is what gives the backend the firstName/lastName/username the
      // user typed during email/password sign-up (Firebase doesn't carry those).
      const stashed = pendingSignupRef.current ?? readPendingSignup();
      const profilePayload =
        profileOverride ??
        (stashed && stashed.email === fbUser.email
          ? {
              firstName: stashed.firstName,
              lastName: stashed.lastName,
              username: stashed.username,
            }
          : undefined);

      const inFlight = (async () => {
        try {
          const idToken = await fbUser.getIdToken();
          const data = await apiRequest("/api/v1/auth/sync", {
            method: "POST",
            body: JSON.stringify({
              idToken,
              ...(profilePayload?.firstName && { firstName: profilePayload.firstName }),
              ...(profilePayload?.lastName && { lastName: profilePayload.lastName }),
              ...(profilePayload?.username && { username: profilePayload.username }),
            }),
          });
          if (!cancelled) {
            // Persist JWTs so authenticated requests work the same way
            // they do for email/password sign-in.
            if (data.accessToken) {
              localStorage.setItem("accessToken", data.accessToken);
              if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            }
            setUser(data.user);
            // Clear the pending signup once the backend has the data it needs.
            if (stashed && stashed.email === fbUser.email) {
              pendingSignupRef.current = null;
              clearPendingSignup();
            }
            await mergeGuestOnboardingToAccount();
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }
        } catch (err) {
          // Surface the failure so callers (signInWithGoogle / Apple) don't
          // resolve as if sign-in succeeded. The most common production
          // failure is missing Firebase Admin credentials, which makes
          // /api/v1/auth/sync return 401/500. Translate that into
          // actionable English; otherwise bubble the original message.
          if (err instanceof ApiError) {
            const reason = err.body?.message ?? err.body?.error ?? err.message;
            throw new Error(
              `Sign-in succeeded with the provider, but the server couldn't complete the sign-in (HTTP ${err.status}): ${reason}. ` +
                `If this is production, make sure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are set.`,
            );
          }
          throw err;
        } finally {
          firebaseSyncInFlightRef.current.delete(fbUser.uid);
        }
      })();

      firebaseSyncInFlightRef.current.set(fbUser.uid, inFlight);
      return inFlight;
    },
    [queryClient],
  );

  // ─── Email / Password sign-in ────────────────────────────────────────────
  //
  // Order of preference:
  //   1. Firebase email/password (when web SDK is configured) — keeps
  //      auth state consistent with the Google/Apple/email-verification
  //      flows, and lets us re-issue verification links if needed.
  //   2. Backend /api/auth/login (legacy) — kept so existing local
  //      accounts created before the Firebase migration still work.
  //
  // We try Firebase first; if the user wasn't found there (e.g. a
  // legacy backend-only account), we fall back to /api/auth/login.
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (firebaseConfigured && firebaseAuth) {
        try {
          const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
          if (!cred.user.emailVerified) {
            // Persist enough state for AuthForm to show the verify screen,
            // and proactively re-send the link so the user has a fresh one.
            const pending: PendingFirebaseSignup = { email };
            pendingSignupRef.current = pending;
            writePendingSignup(pending);
            try {
              await sendEmailVerification(cred.user);
            } catch {
              /* best-effort; user can resend manually */
            }
            // Throw a typed error so AuthForm can switch the UI into the
            // "check your email" verification card instead of just
            // showing a destructive toast.
            throw new UnverifiedFirebaseEmailError(
              email,
              "Your email isn't verified yet. We've re-sent the verification link — please check your inbox.",
            );
          }
          // Verified Firebase user → run the sync path which sets local user
          await handleFirebaseUserSignedIn(cred.user, false);
          return;
        } catch (err) {
          const code = (err as { code?: string }).code ?? "";
          // Only fall back to backend login when the Firebase user truly
          // doesn't exist OR Firebase rejects the credential — both indicate
          // we may be looking at a legacy backend-only account.
          if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
            // fall through to backend
          } else if (code.startsWith("auth/")) {
            throw new Error(mapFirebaseEmailError(err, "signin"));
          } else {
            throw err;
          }
        }
      }

      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      }
      setUser(data.user ?? data);
      await afterSignIn();
    },
    [afterSignIn, handleFirebaseUserSignedIn],
  );

  // ─── Email / Password sign-up ────────────────────────────────────────────
  //
  // Dispatches based on Firebase availability:
  //   - Firebase configured → createUserWithEmailAndPassword + send link
  //   - Firebase NOT configured → existing /api/auth/signup (backend OTP)
  //
  // In both cases the returned SignUpResult tells AuthForm which screen
  // to render next ("firebase" → verify-link card, "otp" → 6-digit code).
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      firstName?: string,
      lastName?: string,
    ): Promise<SignUpResult> => {
      // ── Firebase path ──────────────────────────────────────────────────
      if (firebaseConfigured && firebaseAuth) {
        try {
          const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          // Stash the typed-in profile so /sync can populate the Rellio
          // user once the email is verified. Firebase doesn't capture
          // any of these for email/password signups.
          const pending: PendingFirebaseSignup = {
            email,
            firstName: firstName?.trim() || undefined,
            lastName: lastName?.trim() || undefined,
            username: username?.trim() || undefined,
          };
          pendingSignupRef.current = pending;
          writePendingSignup(pending);

          // Send the verification link. The continueUrl is intentionally
          // omitted so Firebase uses its default action handler — the user
          // returns to whatever tab they came from and clicks
          // "I've verified my email", which calls completeEmailVerification.
          await sendEmailVerification(cred.user);

          return {
            requiresVerification: true,
            verificationMode: "firebase",
            email,
          };
        } catch (err) {
          const code = (err as { code?: string }).code ?? "";
          if (code.startsWith("auth/")) {
            throw new Error(mapFirebaseEmailError(err, "signup"));
          }
          throw err;
        }
      }

      // ── Backend OTP path (legacy / no-Firebase) ────────────────────────
      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, username, firstName, lastName }),
      });

      if (data.requiresVerification) {
        return {
          requiresVerification: true,
          verificationMode: "otp",
          email: data.email ?? email,
        };
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      }
      setUser(data.user ?? data);
      await afterSignIn();
      return { requiresVerification: false };
    },
    [afterSignIn],
  );

  // ─── OTP verify (legacy backend path, no-Firebase signups only) ──────────
  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const data = await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code, purpose: "signup" }),
      });
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      }
      setUser(data.user ?? data);
      await afterSignIn();
    },
    [afterSignIn],
  );

  // ─── Resend OTP (legacy backend path) ────────────────────────────────────
  const resendOtp = useCallback(async (email: string) => {
    await apiRequest("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "signup" }),
    });
  }, []);

  // ─── Complete Firebase email-link verification ───────────────────────────
  //
  // Called when the user clicks "I've verified my email" after opening
  // the Firebase verification link. Reloads the current Firebase user so
  // emailVerified picks up the fresh server-side claim, then runs the
  // standard /api/v1/auth/sync handler (which is now allowed past the
  // emailVerified guard).
  const completeEmailVerification = useCallback(async () => {
    if (!firebaseConfigured || !firebaseAuth) {
      throw new Error("Email verification requires the Firebase web SDK to be configured.");
    }
    const current = firebaseAuth.currentUser;
    if (!current) {
      throw new Error(
        "We can't find your sign-up session. Please sign up again — Firebase has signed you out.",
      );
    }
    // Force-fetch the latest auth state from Firebase servers so the
    // emailVerified flag reflects the link-click that just happened.
    await current.reload();
    const refreshed = firebaseAuth.currentUser;
    if (!refreshed || !refreshed.emailVerified) {
      throw new Error(
        "Your email isn't verified yet. Please click the link in the email we just sent you.",
      );
    }
    await handleFirebaseUserSignedIn(refreshed, false);
  }, [handleFirebaseUserSignedIn]);

  // ─── Resend Firebase verification link ───────────────────────────────────
  const resendVerificationEmail = useCallback(async () => {
    if (!firebaseConfigured || !firebaseAuth) {
      throw new Error("Email verification requires the Firebase web SDK to be configured.");
    }
    const current = firebaseAuth.currentUser;
    if (!current) {
      throw new Error(
        "We can't find your sign-up session. Please sign up again to receive a new verification link.",
      );
    }
    await sendEmailVerification(current);
  }, []);

  // ─── Cancel pending verification (e.g. user clicked "Change email") ──────
  //
  // Clears the stashed profile, signs the user out of Firebase, and
  // returns the AuthForm to a clean state so they can sign up again
  // with a different email.
  const clearPendingVerification = useCallback(async () => {
    pendingSignupRef.current = null;
    clearPendingSignup();
    if (firebaseConfigured && firebaseAuth && firebaseAuth.currentUser) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
    }
  }, []);

  // ─── Google sign-in ──────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<SocialSignInResult> => {
    if (firebaseConfigured && firebaseAuth && googleProvider) {
      // Firebase path (preferred — requires VITE_FIREBASE_* env vars)
      try {
        const result = await signInWithPopup(firebaseAuth, googleProvider);
        // Use the same UID-deduped sync path as the auth-state listener so
        // popup completion + onAuthStateChanged firing in quick succession
        // can never call /api/v1/auth/sync twice for the same user. The
        // sync handler already performs the guest-onboarding merge and
        // setUser, so calling afterSignIn() here would double-merge.
        await handleFirebaseUserSignedIn(result.user, false);
        return "ok";
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          return "cancelled";
        }
        // Only re-wrap genuine Firebase popup errors (they have an
        // `auth/...` code). Backend-sync failures from
        // handleFirebaseUserSignedIn are already actionable English —
        // re-wrapping would mangle them.
        if (typeof code === "string" && code.startsWith("auth/")) {
          throw new FirebasePopupError(mapFirebaseError(err, "google"), code, "google");
        }
        throw err;
      }
    } else if (process.env.NODE_ENV !== "production" || import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // Backend OAuth fallback (existing /api/auth/google redirect) —
      // preserved from the prior behavior so dev and staging keep
      // working when only the legacy Google client ID is set. The
      // improved missing-vars message below only fires when neither
      // path is available.
      localStorage.setItem("rellio_pending_merge", "1");
      window.location.href = "/api/auth/google";
      // Page is navigating; the form will unmount before this resolves.
      return "ok";
    } else {
      // Throw (don't toast-and-return) so the AuthForm catch path actually
      // surfaces the error and stops its loading spinner — and so
      // `await signInWithGoogle()` never silently resolves into onSuccess().
      const missing = firebaseMissingVars();
      throw new Error(
        missing.length > 0
          ? `Google sign-in is not configured. Missing env vars: ${missing.join(", ")}.`
          : "Google sign-in is not configured. Set the Firebase web SDK env vars (VITE_FIREBASE_*).",
      );
    }
  }, [handleFirebaseUserSignedIn]);

  // ─── Apple sign-in ───────────────────────────────────────────────────────
  const signInWithApple = useCallback(async (): Promise<SocialSignInResult> => {
    if (firebaseConfigured && firebaseAuth && appleProvider) {
      try {
        const result = await signInWithPopup(firebaseAuth, appleProvider);
        // Same UID-deduped sync path as Google. handleFirebaseUserSignedIn
        // already merges guest onboarding + setUser, so we don't call
        // afterSignIn() here (avoids a duplicate merge round-trip).
        await handleFirebaseUserSignedIn(result.user, false);
        return "ok";
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          return "cancelled";
        }
        // Same rationale as Google: don't re-wrap actionable backend
        // sync errors that have no Firebase `auth/...` code.
        if (typeof code === "string" && code.startsWith("auth/")) {
          throw new FirebasePopupError(mapFirebaseError(err, "apple"), code, "apple");
        }
        throw err;
      }
    } else if (firebaseConfigured && !appleProvider) {
      // Firebase web SDK is wired up but the Apple provider was disabled
      // via VITE_FIREBASE_APPLE_ENABLED. Tell the user precisely how to
      // enable it instead of a generic "not available".
      throw new Error(
        'Apple sign-in is disabled. Set VITE_FIREBASE_APPLE_ENABLED="true" and enable the Apple provider in Firebase → Authentication → Sign-in method.',
      );
    } else {
      const missing = firebaseMissingVars();
      throw new Error(
        missing.length > 0
          ? `Apple sign-in is not configured. Missing env vars: ${missing.join(", ")}.`
          : "Apple sign-in is not configured. Firebase + Apple Developer membership are required.",
      );
    }
  }, [handleFirebaseUserSignedIn]);

  // ─── Sign out ────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (firebaseConfigured && firebaseAuth) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
    queryClient.clear();
    // Clear any in-flight Firebase sync slots so the next social sign-in
    // (in the same tab/session) can call /api/v1/auth/sync again.
    firebaseSyncInFlightRef.current.clear();
    // Also clear any half-finished verification state.
    pendingSignupRef.current = null;
    clearPendingSignup();
    // Re-bootstrap so the user lands back in a guest session rather than null
    try {
      const data = await apiRequest("/api/auth/user");
      setUser(data.guest ? { ...data } : data);
    } catch {
      setUser(null);
    }
  }, [queryClient]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user && !user.guest,
    isGuest: user?.guest === true,
    signInWithEmail,
    signUpWithEmail,
    verifyOtp,
    resendOtp,
    completeEmailVerification,
    resendVerificationEmail,
    clearPendingVerification,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refreshUser,
    googleAvailable:
      (firebaseConfigured && !!googleProvider) ||
      !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
    appleAvailable: firebaseConfigured && !!appleProvider,
    firebaseEmailAvailable: firebaseConfigured && !!firebaseAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
