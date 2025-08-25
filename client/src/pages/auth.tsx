import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Flame, Eye, EyeOff, ArrowLeft } from "lucide-react";
import rellioLogo from "@assets/Rellio logo_1756155085148.png";
import { loginSchema, signupSchema } from "@shared/schema";
import type { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      return await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Account created!",
        description: "Welcome to Rellio. You can now explore sacred scriptures.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Please try again with different credentials.",
        variant: "destructive",
      });
    },
  });

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
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Access Failed",
        description: error.message || "Unable to access as guest. Please try again.",
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

  return (
    <div className="futuristic-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6 text-white hover:text-neon-cyan hover:bg-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <img src={rellioLogo} alt="Rellio" className="w-16 h-16 object-contain animate-neon-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border border-cosmic-gold rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-bold text-white">Rellio</h1>
          </div>
          <p className="text-gray-300">Join the spiritual exploration</p>
        </div>

        <Card className="holographic-card">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Welcome</CardTitle>
            <CardDescription className="text-gray-300">
              Sign in to your account or create a new one to start exploring sacred scriptures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-indigo-800">
                <TabsTrigger value="login" className="text-white data-[state=active]:bg-neon-blue data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-white data-[state=active]:bg-neon-cyan data-[state=active]:text-deep-indigo">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="your@email.com"
                              className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-neon-blue hover:bg-neon-cyan text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="John"
                                className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
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
                            <FormLabel className="text-white">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Doe"
                                className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="your@email.com"
                              className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="username"
                              className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showSignupPassword ? "text" : "password"}
                                placeholder="Create a password"
                                className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSignupPassword(!showSignupPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-neon-cyan hover:bg-holographic-pink text-deep-indigo"
                      disabled={signupMutation.isPending}
                    >
                      {signupMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-indigo-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-indigo-900 px-2 text-gray-400">Or</span>
                </div>
              </div>

              <Button 
                onClick={() => guestMutation.mutate()}
                variant="outline"
                className="w-full border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-white"
                disabled={guestMutation.isPending}
              >
                {guestMutation.isPending ? "Accessing..." : "Continue as Guest"}
              </Button>

              <p className="text-xs text-gray-400 mt-4">
                Guest access provides limited features. Sign up for full experience.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}