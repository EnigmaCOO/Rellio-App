/**
 * AuthForm — guest-to-account upgrade surface.
 *
 * Login uses react-hook-form + zod.
 * Sign-up uses plain useState to avoid Chrome credential-manager interference
 * on the username field (Chrome intercepts name="username" + type="password" combos).
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { loginSchema } from "@shared/schema";
import { ApiError } from "@/lib/queryClient";
import { FirebasePopupError, UnverifiedFirebaseEmailError } from "@/contexts/AuthContext";
import rellioLogo from "@assets/rellio-logo.png";
import type { z } from "zod";
import { SiGoogle, SiApple } from "react-icons/si";

type LoginFormData = z.infer<typeof loginSchema>;

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 focus:bg-white transition-colors";

export default function AuthForm({ onSuccess, onBack }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── Sign-up plain state (avoids Chrome credential manager on username) ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirmPassword, setSuConfirmPassword] = useState("");
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  // ── Verification state (after sign-up requiring email verification) ──
  // pendingMode === "firebase" → user must click an email-verification link
  // pendingMode === "otp"      → user must enter a 6-digit code (legacy)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"firebase" | "otp" | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // ── Duplicate-email recovery banner (offers "Sign in instead") ──
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null);

  // ── Apple provider-disabled latch ─────────────────────────────────────────
  // The Apple button stays hard-disabled (with an explanatory tooltip)
  // for the rest of this session once Firebase reports
  // `auth/operation-not-allowed`. We persist the latch in sessionStorage so
  // re-renders / route changes don't clear it; closing the tab clears it
  // so the user can retry after enabling the provider in Firebase.
  const [appleProviderDisabled, setAppleProviderDisabled] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem("rellio_apple_disabled") === "1",
  );

  const {
    signInWithEmail,
    signUpWithEmail,
    verifyOtp,
    resendOtp,
    completeEmailVerification,
    resendVerificationEmail,
    clearPendingVerification,
    signInWithGoogle,
    signInWithApple,
    googleAvailable,
    appleAvailable,
  } = useAuthContext();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  });

  // ─── Email sign-in ────────────────────────────────────────────────────────
  const onLoginSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
      toast({ title: "Welcome back!", description: "You have been signed in." });
      onSuccess();
    } catch (err: unknown) {
      // A returning user with an unverified Firebase email is NOT a sign-in
      // failure — the user just needs to click the verification link.
      // AuthContext has already re-sent the link and persisted the pending
      // signup; switch the UI into the "check your email" card so the
      // resend / I've-verified / change-email actions are reachable.
      if (err instanceof UnverifiedFirebaseEmailError) {
        setPendingEmail(err.email);
        setPendingMode("firebase");
        setOtpCode("");
        setOtpError(null);
        setVerificationError(null);
        toast({
          title: "Verify your email",
          description:
            "We just re-sent the verification link. Click it, then come back and tap “I've verified my email.”",
        });
        return;
      }
      toast({
        title: "Sign In Failed",
        description: (err as Error).message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Email sign-up (plain state, manual validation) ───────────────────────
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (handle.trim().length < 3 || handle.trim().length > 20)
      errs.handle = "Username must be 3–20 characters.";
    if (!/^[a-zA-Z0-9_]+$/.test(handle.trim()))
      errs.handle = "Only letters, numbers, and underscores allowed.";
    if (!suEmail.includes("@")) errs.suEmail = "Enter a valid email address.";
    if (suPassword.length < 6) errs.suPassword = "Password must be at least 6 characters.";
    if (suPassword !== suConfirmPassword) errs.suConfirmPassword = "Passwords don't match.";
    setSignupErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setDuplicateEmail(null);
    try {
      const result = await signUpWithEmail(suEmail, suPassword, handle.trim(), firstName.trim(), lastName.trim());
      if (result.requiresVerification) {
        // Move to the verification screen — Firebase link or backend OTP
        setPendingEmail(result.email ?? suEmail);
        setPendingMode(result.verificationMode ?? "otp");
        setOtpCode("");
        setOtpError(null);
        setVerificationError(null);
        if (result.verificationMode === "firebase") {
          toast({
            title: "Check your email",
            description: "We sent you a verification link. Click it to finish signing up.",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We sent you a 6-digit verification code.",
          });
        }
      } else {
        toast({ title: "Account Created!", description: "Welcome to Rellio." });
        onSuccess();
      }
    } catch (err: unknown) {
      // Duplicate-verified-email recovery: surface a one-click "Sign in
      // instead" affordance instead of a dead-end toast. The backend
      // returns 409 + { code: "EMAIL_ALREADY_EXISTS" } in this case.
      if (err instanceof ApiError && err.body?.code === "EMAIL_ALREADY_EXISTS") {
        setDuplicateEmail(suEmail);
        return;
      }
      toast({
        title: "Sign Up Failed",
        description: (err as Error).message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── "Sign in instead" handler — switch to login tab + prefill email ──────
  const handleSwitchToSignIn = () => {
    const emailToCarry = duplicateEmail ?? suEmail;
    setIsSignUp(false);
    setDuplicateEmail(null);
    setSignupErrors({});
    setSuPassword("");
    setSuConfirmPassword("");
    loginForm.reset({ email: emailToCarry, password: "" });
  };

  // ─── OTP verify ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmail) return;
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Enter the 6-digit code we sent you.");
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await verifyOtp(pendingEmail, otpCode);
      toast({ title: "Welcome to Rellio!", description: "Your email is verified." });
      setPendingEmail(null);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as Error).message || "Invalid or expired code.";
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    setIsResendingOtp(true);
    try {
      await resendOtp(pendingEmail);
      toast({ title: "Code resent", description: `A new code is on its way to ${pendingEmail}.` });
    } catch (err: unknown) {
      toast({
        title: "Could not resend",
        description: (err as Error).message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleCancelOtp = () => {
    setPendingEmail(null);
    setPendingMode(null);
    setOtpCode("");
    setOtpError(null);
    setVerificationError(null);
  };

  // ─── Firebase email-link verification handlers ────────────────────────────

  const handleCompleteVerification = async () => {
    setIsCheckingVerification(true);
    setVerificationError(null);
    try {
      await completeEmailVerification();
      toast({ title: "Welcome to Rellio!", description: "Your email is verified." });
      setPendingEmail(null);
      setPendingMode(null);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as Error).message || "We couldn't confirm your verification yet.";
      setVerificationError(msg);
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingOtp(true);
    setVerificationError(null);
    try {
      await resendVerificationEmail();
      toast({
        title: "Verification email resent",
        description: pendingEmail
          ? `A new link is on its way to ${pendingEmail}.`
          : "A new link is on its way.",
      });
    } catch (err: unknown) {
      toast({
        title: "Could not resend",
        description: (err as Error).message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleChangeEmail = async () => {
    // Sign the half-baked Firebase user out so they can sign up again
    // under a different email without "email-already-in-use" errors.
    try {
      await clearPendingVerification();
    } catch {
      /* best-effort */
    }
    setPendingEmail(null);
    setPendingMode(null);
    setVerificationError(null);
    setSuPassword("");
    setSuConfirmPassword("");
  };

  // ─── Google sign-in ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const status = await signInWithGoogle();
      // Only navigate when sign-in actually completed. "cancelled"
      // means the user closed the popup — stay on the auth screen
      // silently, no toast.
      if (status === "ok") onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Google Sign-In Failed",
        description: (err as Error).message || "Unable to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Apple sign-in ────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      const status = await signInWithApple();
      if (status === "ok") onSuccess();
    } catch (err: unknown) {
      // If Firebase reports the Apple provider isn't enabled, latch the
      // button into a disabled state for the rest of the session so the
      // user gets a clear "fix this in Firebase" affordance instead of
      // repeatedly hitting the same error.
      if (err instanceof FirebasePopupError && err.code === "auth/operation-not-allowed") {
        sessionStorage.setItem("rellio_apple_disabled", "1");
        setAppleProviderDisabled(true);
      }
      toast({
        title: "Apple Sign-In Failed",
        description: (err as Error).message || "Unable to sign in with Apple.",
        variant: "destructive",
      });
    }
  };

  // ─── Tooltip copy + disabled flags for the Apple button ──────────────────
  const isAppleDisabled = !appleAvailable || appleProviderDisabled;
  const appleTooltip = appleProviderDisabled
    ? "Apple sign-in isn't enabled in Firebase. In the Firebase console, open Authentication → Sign-in method and enable the Apple provider, then refresh this page."
    : !appleAvailable
      ? 'Apple sign-in isn\'t configured. Set VITE_FIREBASE_APPLE_ENABLED="true" and complete Apple Developer Program setup, then enable the Apple provider in Firebase.'
      : null;
  const googleTooltip = !googleAvailable
    ? "Google sign-in isn't configured. Set the Firebase web SDK env vars (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID) and reload."
    : null;

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    loginForm.reset();
    setFirstName(""); setLastName(""); setHandle(""); setSuEmail(""); setSuPassword(""); setSuConfirmPassword("");
    setSignupErrors({});
  };

  // ─── Firebase email-link verification screen ─────────────────────────────
  // Shown when signUpWithEmail returned verificationMode === "firebase".
  // The user clicks the link in their inbox, then comes back here and
  // taps "I've verified my email" → completeEmailVerification().
  if (pendingEmail && pendingMode === "firebase") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-6 pb-20 overflow-y-auto">
        <div className="w-full max-w-md relative z-10">
          <Button
            variant="ghost"
            onClick={handleChangeEmail}
            className="mb-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="bg-white shadow-sm border border-gray-200 rounded-3xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-3">
                  <div className="rounded-full bg-gray-100 p-4">
                    <MailCheck className="w-7 h-7 text-gray-700" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your email</h2>
                <p className="text-gray-500 text-sm">
                  We sent a verification link to{" "}
                  <span className="font-medium text-gray-900">{pendingEmail}</span>.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Click the link to confirm your email, then come back and tap the
                  button below to finish creating your account.
                </p>
              </div>

              {verificationError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{verificationError}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleCompleteVerification}
                  disabled={isCheckingVerification}
                  className="w-full h-12 rounded-xl font-semibold text-white shadow-lg bg-gray-900 hover:bg-gray-700"
                  data-testid="button-complete-verification"
                >
                  {isCheckingVerification ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                  ) : (
                    "I've verified my email"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendVerification}
                  disabled={isResendingOtp}
                  className="w-full h-11 rounded-xl text-gray-600 hover:text-gray-900"
                  data-testid="button-resend-verification"
                >
                  {isResendingOtp ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    "Resend verification email"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleChangeEmail}
                  className="w-full h-11 rounded-xl text-gray-500 hover:text-gray-800"
                  data-testid="button-change-email"
                >
                  Change email
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-6">
                Didn't get an email? Check your spam folder, or wait a minute and tap
                "Resend verification email".
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Legacy backend-OTP verification screen ──────────────────────────────
  // Shown only when Firebase web SDK isn't configured and the backend
  // returned a 6-digit OTP code via /api/auth/signup.
  if (pendingEmail && pendingMode === "otp") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-6 pb-20 overflow-y-auto">
        <div className="w-full max-w-md relative z-10">
          <Button
            variant="ghost"
            onClick={handleCancelOtp}
            className="mb-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="bg-white shadow-sm border border-gray-200 rounded-3xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <img src={rellioLogo} alt="Rellio" className="h-20 w-auto object-contain" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify your email</h2>
                <p className="text-gray-500 text-sm">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-gray-900">{pendingEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => {
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setOtpError(null);
                    }}
                    className={`${inputClass} text-center text-lg tracking-[0.5em] font-mono`}
                  />
                  {otpError && (
                    <p className="text-xs text-red-600 mt-1">{otpError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full h-12 rounded-xl font-semibold text-white shadow-lg bg-gray-900 hover:bg-gray-700"
                >
                  {isVerifyingOtp ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="w-full h-11 rounded-xl text-gray-600 hover:text-gray-900"
                >
                  {isResendingOtp ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    "Resend code"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-6 pb-20 overflow-y-auto">
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D97706' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue as guest
        </Button>

        <Card className="bg-white shadow-sm border border-gray-200 rounded-3xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <img src={rellioLogo} alt="Rellio" className="h-20 w-auto object-contain" />
              </div>
              <p className="text-gray-500 text-sm">
                {isSignUp ? "Save your journey and sync across devices" : "Welcome back to your spiritual home"}
              </p>
            </div>

            {/* Social sign-in */}
            <div className="space-y-3 mb-6">
              {/*
                Tooltips wrap the buttons via a span — radix tooltips need
                a non-disabled trigger to receive pointer events, and a
                disabled <button> would otherwise eat the hover.
              */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full" data-testid="tooltip-trigger-google">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                      data-testid="button-google-signin"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SiGoogle className="w-4 h-4 text-gray-600" />
                      )}
                      <span>Continue with Google</span>
                      {!googleAvailable && (
                        <span className="text-xs text-gray-400 ml-1">(not configured)</span>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {googleTooltip && (
                  <TooltipContent className="max-w-xs text-xs leading-relaxed" sideOffset={6}>
                    {googleTooltip}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full" data-testid="tooltip-trigger-apple">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3"
                      onClick={handleAppleSignIn}
                      // Apple is hard-disabled in two cases: the
                      // compile-time config flag (`!appleAvailable`,
                      // gated by VITE_FIREBASE_APPLE_ENABLED + provider
                      // creation) and the runtime latch
                      // (`appleProviderDisabled`, set after Firebase
                      // returns `auth/operation-not-allowed`). In both
                      // cases the tooltip explains exactly how to fix it.
                      disabled={appleProviderDisabled || !appleAvailable}
                      data-testid="button-apple-signin"
                    >
                      <SiApple className="w-4 h-4" />
                      <span>Continue with Apple</span>
                      {isAppleDisabled && (
                        <span className="text-xs text-gray-400 ml-1">
                          {appleProviderDisabled ? "(not enabled in Firebase)" : "(not configured)"}
                        </span>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {appleTooltip && (
                  <TooltipContent className="max-w-xs text-xs leading-relaxed" sideOffset={6}>
                    {appleTooltip}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Or use email</span>
              </div>
            </div>

            {/* ── Login form ── */}
            {!isSignUp ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className={inputClass}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              placeholder="Your password"
                              className={`${inputClass} pr-11`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl font-semibold text-white shadow-lg bg-gray-900 hover:bg-gray-700"
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign in"}
                  </Button>
                </form>
              </Form>
            ) : (
              /* ── Sign-up form (plain state — no react-hook-form) ── */
              <form onSubmit={handleSignupSubmit} className="space-y-4" autoComplete="off">
                {/* Honeypot to confuse browser autofill */}
                <input type="text" name="fake-user" style={{ display: "none" }} readOnly tabIndex={-1} />
                <input type="password" name="fake-pass" style={{ display: "none" }} readOnly tabIndex={-1} />

                {/* Duplicate-email recovery banner */}
                {duplicateEmail && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900">
                          An account already exists for {duplicateEmail}.
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                          Sign in with your existing password instead.
                        </p>
                        <Button
                          type="button"
                          onClick={handleSwitchToSignIn}
                          className="mt-3 h-9 rounded-lg bg-gray-900 text-white hover:bg-gray-700 text-sm font-medium"
                          data-testid="button-sign-in-instead"
                        >
                          Sign in instead
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      name="rll-fname"
                      autoComplete="given-name"
                      placeholder="John"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      name="rll-lname"
                      autoComplete="family-name"
                      placeholder="Doe"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    name="rll-handle"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Choose a username (3–20 chars)"
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    className={inputClass}
                  />
                  {signupErrors.handle && (
                    <p className="text-xs text-gray-600 mt-1">{signupErrors.handle}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="rll-email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={suEmail}
                    onChange={e => setSuEmail(e.target.value)}
                    className={inputClass}
                  />
                  {signupErrors.suEmail && (
                    <p className="text-xs text-gray-600 mt-1">{signupErrors.suEmail}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="rll-pw"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={suPassword}
                      onChange={e => setSuPassword(e.target.value)}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {signupErrors.suPassword && (
                    <p className="text-xs text-gray-600 mt-1">{signupErrors.suPassword}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="rll-pw-confirm"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={suConfirmPassword}
                      onChange={e => setSuConfirmPassword(e.target.value)}
                      className={`${inputClass} pr-11`}
                    />
                  </div>
                  {signupErrors.suConfirmPassword && (
                    <p className="text-xs text-gray-600 mt-1">{signupErrors.suConfirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl font-semibold text-white shadow-lg bg-gray-900 hover:bg-gray-700"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account...</> : "Create Account"}
                </Button>
              </form>
            )}

            {/* Toggle sign-in / sign-up */}
            <div className="text-center mt-6">
              <button type="button" onClick={switchMode} className="text-sm text-gray-600">
                {isSignUp ? (
                  <>Already have an account?{" "}<span className="text-gray-900 font-medium">Sign in</span></>
                ) : (
                  <>Don't have an account?{" "}<span className="text-gray-900 font-medium">Sign up</span></>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-gray-900 underline hover:text-gray-700">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" className="text-gray-900 underline hover:text-gray-700">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
