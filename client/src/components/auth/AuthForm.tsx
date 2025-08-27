import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { loginSchema, signupSchema, verifyOtpSchema } from "@shared/schema";
import rellioLogo from "@assets/image_1756254355766.png";
import type { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AuthForm({ onSuccess, onBack }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpContext, setOtpContext] = useState<{
    email?: string;
    phone?: string;
    purpose: 'signup' | 'login';
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const otpForm = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      code: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setOtpContext({
          email: data.email,
          purpose: 'login'
        });
        setShowOtpModal(true);
        toast({
          title: "Verification Required",
          description: "Please check your email for the verification code.",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      return await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setOtpContext({
        email: data.email,
        purpose: 'signup'
      });
      setShowOtpModal(true);
      toast({
        title: "Account Created!",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // OTP verification mutation
  const otpMutation = useMutation({
    mutationFn: async (data: VerifyOtpFormData) => {
      console.log("Sending verification data:", {
        ...data,
        email: otpContext?.email,
        phone: otpContext?.phone,
        purpose: otpContext?.purpose
      });
      return await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          email: otpContext?.email,
          phone: otpContext?.phone,
          purpose: otpContext?.purpose
        }),
      });
    },
    onSuccess: (data) => {
      console.log("Verification successful:", data);
      toast({
        title: "Account Verified!",
        description: "Welcome to Rellio. Your spiritual journey begins now.",
      });
      setShowOtpModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onSignupSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const onOtpSubmit = (data: VerifyOtpFormData) => {
    otpMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} authentication will be available soon.`,
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D97706' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="w-full max-w-md relative z-10">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-amber-600 hover:bg-white/80 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Main auth card */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
            <CardContent className="p-12">
              {/* Logo and title */}
              <div className="text-center mb-10">
                <div className="flex flex-col items-center mb-6">
                  <img 
                    src={rellioLogo} 
                    alt="Rellio" 
                    className="w-20 h-20 object-contain mb-4" 
                  />
                  <h1 
                    className="text-4xl font-bold tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #FCD34D 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    RELLIO
                  </h1>
                </div>
              </div>

              {!isSignUp ? (
                // Sign In Form
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Email"
                              className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Forgot password?"
                                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-600 transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                          className="border-gray-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="remember" className="text-sm text-gray-600">
                          Remember me
                        </label>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                // Sign Up Form
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="John"
                                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Doe"
                                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-gray-700 font-medium">Username</label>
                      <input
                        type="text"
                        placeholder="Choose a username"
                        autoComplete="off"
                        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 px-4"
                        onChange={(e) => {
                          signupForm.setValue('username', e.target.value);
                        }}
                      />
                      {signupForm.formState.errors.username && (
                        <p className="text-red-500 text-sm">{signupForm.formState.errors.username.message}</p>
                      )}
                    </div>

                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="john@example.com"
                              className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-600 transition-colors"
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
                      className="w-full h-12 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
                      disabled={signupMutation.isPending}
                    >
                      {signupMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Social login section */}
              <div className="mt-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button 
                    variant="outline"
                    onClick={() => handleSocialLogin('Apple')}
                    className="h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <span className="text-xl mr-2">🍎</span>
                    Sign in with Apple
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleSocialLogin('Google')}
                    className="h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <span className="text-xl mr-2">🔍</span>
                    Sign in with Google
                  </Button>
                </div>
              </div>

              {/* Toggle between login/signup */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    // Reset forms when switching
                    loginForm.reset();
                    signupForm.reset();
                  }}
                  className="text-sm text-gray-600"
                >
                  {isSignUp ? (
                    <>Already have an account? <span className="text-amber-600 font-medium">Sign in</span></>
                  ) : (
                    <>Don't have an account? <span className="text-amber-600 font-medium">Sign up</span></>
                  )}
                </button>
              </div>

              {/* Terms of service */}
              <p className="text-xs text-gray-500 text-center mt-6">
                By continuing, you agree to our{" "}
                <span className="text-amber-600 underline cursor-pointer">Terms of Service</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="bg-white rounded-2xl border-0 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">
              <CheckCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              Verify Your Account
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              We've sent a 6-digit code to {otpContext?.email ? `your email` : `your phone`}
            </DialogDescription>
          </DialogHeader>

          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
              <FormField
                control={otpForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block text-gray-700 font-medium">
                      Enter verification code
                    </FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                            <InputOTPSlot index={1} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                            <InputOTPSlot index={2} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                            <InputOTPSlot index={3} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                            <InputOTPSlot index={4} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                            <InputOTPSlot index={5} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold h-12 rounded-xl"
                  disabled={otpMutation.isPending}
                >
                  {otpMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Account
                    </>
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-600 hover:text-amber-600"
                  onClick={() => setShowOtpModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Didn't receive the code? Check your spam folder or try again in a few minutes.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}