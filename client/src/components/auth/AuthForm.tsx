import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Mail, Phone, User, Lock, CheckCircle, Send, ArrowLeft } from "lucide-react";
import { signupSchema, loginSchema, verifyOtpSchema } from "@shared/schema";
import type { z } from "zod";

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AuthForm({ onSuccess, onBack }: AuthFormProps) {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpContext, setOtpContext] = useState<{
    email?: string;
    phone?: string;
    purpose: 'signup' | 'login';
  } | null>(null);
  const [usePhone, setUsePhone] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      phone: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      phone: "",
      username: "",
      password: "",
    },
  });

  const otpForm = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      code: "",
    },
  });

  // Social login handler
  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} authentication will be available soon. Please use email or phone signup for now.`,
    });
  };

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      return await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        const formData = signupForm.getValues();
        setOtpContext({
          email: formData.email,
          phone: formData.phone,
          purpose: 'signup'
        });
        setShowOtpModal(true);
        toast({
          title: "Verification Required",
          description: "Please check your email/phone for the verification code.",
        });
      } else {
        // Store tokens if provided
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        toast({
          title: "Account Created!",
          description: "Welcome to Rellio. You can now explore sacred scriptures.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Please try again with different credentials.",
        variant: "destructive",
      });
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
        const formData = loginForm.getValues();
        setOtpContext({
          email: formData.email,
          phone: formData.phone,
          purpose: 'login'
        });
        setShowOtpModal(true);
        toast({
          title: "Verification Required",
          description: "Please check your email/phone for the verification code.",
        });
      } else {
        // Store tokens
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  // OTP verification mutation
  const otpMutation = useMutation({
    mutationFn: async (data: VerifyOtpFormData) => {
      return await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          email: otpContext?.email,
          phone: otpContext?.phone,
          purpose: otpContext?.purpose,
        }),
      });
    },
    onSuccess: (data) => {
      // Store tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      setShowOtpModal(false);
      toast({
        title: "Verification Successful",
        description: "Welcome to Rellio!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Guest access mutation
  const guestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/guest", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Guest Access",
        description: "You now have limited access to explore Rellio.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Access Failed",
        description: error.message || "Unable to access as guest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSignupSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onOtpSubmit = (data: VerifyOtpFormData) => {
    otpMutation.mutate(data);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-[#00D5FF] hover:bg-white/80 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Main auth card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-400 via-[#00D5FF] to-amber-400"></div>
            
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                🔮 Rellio
              </CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Join the spiritual exploration community
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-50 rounded-xl p-1">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#00D5FF]"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#00D5FF]"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      
                      {/* Login type toggle */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-50 rounded-xl p-1 flex">
                          <button
                            type="button"
                            onClick={() => setUsePhone(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              !usePhone 
                                ? 'bg-white shadow-sm text-[#00D5FF]' 
                                : 'text-gray-600 hover:text-[#00D5FF]'
                            }`}
                          >
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsePhone(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              usePhone 
                                ? 'bg-white shadow-sm text-[#00D5FF]' 
                                : 'text-gray-600 hover:text-[#00D5FF]'
                            }`}
                          >
                            <Phone className="w-4 h-4 inline mr-2" />
                            Phone
                          </button>
                        </div>
                      </div>

                      {/* Email or Phone input */}
                      {usePhone ? (
                        <FormField
                          control={loginForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    className="pl-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pl-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Password input */}
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...field}
                                  type={showLoginPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  className="pl-11 pr-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00D5FF] transition-colors"
                                >
                                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-[#00D5FF] to-blue-500 hover:from-[#00D5FF]/90 hover:to-blue-600 text-white font-semibold h-12 rounded-xl shadow-lg transition-all duration-200"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-6">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-5">
                      
                      {/* Name fields */}
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
                                  className="bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
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
                                  className="bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Signup type toggle */}
                      <div className="flex items-center justify-center">
                        <div className="bg-gray-50 rounded-xl p-1 flex">
                          <button
                            type="button"
                            onClick={() => setUsePhone(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              !usePhone 
                                ? 'bg-white shadow-sm text-[#00D5FF]' 
                                : 'text-gray-600 hover:text-[#00D5FF]'
                            }`}
                          >
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsePhone(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              usePhone 
                                ? 'bg-white shadow-sm text-[#00D5FF]' 
                                : 'text-gray-600 hover:text-[#00D5FF]'
                            }`}
                          >
                            <Phone className="w-4 h-4 inline mr-2" />
                            Phone
                          </button>
                        </div>
                      </div>

                      {/* Email or Phone input */}
                      {usePhone ? (
                        <FormField
                          control={signupForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    className="pl-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pl-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Username */}
                      <FormField
                        control={signupForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...field}
                                  placeholder="username"
                                  className="pl-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Password */}
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...field}
                                  type={showSignupPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  className="pl-11 pr-11 bg-gray-50 border-0 rounded-xl h-12 focus:bg-white focus:ring-2 focus:ring-[#00D5FF]/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00D5FF] transition-colors"
                                >
                                  {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white font-semibold h-12 rounded-xl shadow-lg transition-all duration-200"
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
                </TabsContent>
              </Tabs>

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
                    onClick={() => handleSocialLogin('Google')}
                    className="h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <span className="text-xl mr-2">🔍</span>
                    Google
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleSocialLogin('Facebook')}
                    className="h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <span className="text-xl mr-2">📘</span>
                    Facebook
                  </Button>
                </div>

                {/* Guest access */}
                <Button 
                  onClick={() => guestMutation.mutate()}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-[#00D5FF] text-[#00D5FF] hover:bg-[#00D5FF]/5"
                  disabled={guestMutation.isPending}
                >
                  {guestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-[#00D5FF]/30 border-t-[#00D5FF] rounded-full animate-spin" />
                      Accessing...
                    </>
                  ) : (
                    "Continue as Guest"
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Guest access provides limited features. Sign up for the full experience.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="bg-white rounded-2xl border-0 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">
              <CheckCircle className="w-8 h-8 text-[#00D5FF] mx-auto mb-2" />
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
                            <InputOTPSlot index={0} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
                            <InputOTPSlot index={1} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
                            <InputOTPSlot index={2} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
                            <InputOTPSlot index={3} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
                            <InputOTPSlot index={4} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
                            <InputOTPSlot index={5} className="w-12 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-[#00D5FF]" />
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
                  className="w-full bg-gradient-to-r from-[#00D5FF] to-blue-500 hover:from-[#00D5FF]/90 hover:to-blue-600 text-white font-semibold h-12 rounded-xl"
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
                  className="w-full text-gray-600 hover:text-[#00D5FF]"
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