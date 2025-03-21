import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, KeySquare, UserPlus, LogIn } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// Define signup form schema
const signupFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function Login() {
  const { toast } = useToast();
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [demoCredentials, setDemoCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  
  // Check if there's a redirect URL in the query string
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectPath = searchParams.get('redirect') || '/';
  
  // If already authenticated, redirect to homepage
  useEffect(() => {
    if (isAuthenticated) {
      setLocation(redirectPath !== '/login' ? redirectPath : '/');
    }
  }, [isAuthenticated, setLocation, redirectPath]);
  
  // Define login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: demoCredentials ? "testuser" : "",
      password: demoCredentials ? "Test123!" : "",
    },
  });
  
  // Define signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
    },
  });
  
  // Update form values when demo credentials toggle changes
  useEffect(() => {
    if (demoCredentials) {
      loginForm.setValue("username", "testuser");
      loginForm.setValue("password", "Test123!");
    } else {
      loginForm.setValue("username", "");
      loginForm.setValue("password", "");
    }
  }, [demoCredentials, loginForm]);
  
  async function onLoginSubmit(data: LoginFormValues) {
    try {
      setError(null);
      const success = await login(data.username, data.password);
      
      if (success) {
        // Redirect to dashboard after successful login
        toast({
          title: "Login successful",
          description: "Welcome to SmartWater Pools Management System",
        });
        setLocation(redirectPath !== '/login' ? redirectPath : '/');
      } else {
        // Show error when login fails
        setError("Invalid username or password. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast({
        title: "Login error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  function toggleDemoCredentials() {
    setDemoCredentials(!demoCredentials);
  }
  
  // Handle signup form submission
  async function onSignupSubmit(data: SignupFormValues) {
    try {
      setError(null);
      setIsSignupLoading(true);
      
      // Remove confirmPassword as it's not needed for the API
      const { confirmPassword, ...signupData } = data;
      
      // Check if the email is from SmartWaterPools domain
      const isCompanyEmail = signupData.email.toLowerCase().endsWith('@smartwaterpools.com');
      
      // Default role to client for self-registration
      const registrationData = {
        ...signupData,
        role: "client",
      };
      
      // If not a company email, show a warning toast
      if (!isCompanyEmail) {
        toast({
          title: "Non-company Email",
          description: "You're registering with a non-SmartWaterPools email. Your account will have client-level access only.",
          variant: "warning",
        });
      }
      
      const success = await register(registrationData);
      
      if (success) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. You are now logged in.",
        });
        setLocation(redirectPath !== '/login' ? redirectPath : '/');
      }
      // Toast notifications for failures are handled in the AuthContext register function
    } catch (error) {
      console.error("Registration error:", error);
      setError("An unexpected error occurred during signup. Please try again.");
      toast({
        title: "Registration error",
        description: "Could not create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSignupLoading(false);
    }
  }
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-8 bg-pattern overflow-auto">
      <Card className="w-full max-w-md shadow-lg my-8">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-2">
              <KeySquare className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">SmartWater Pools</CardTitle>
          <CardDescription className="text-center">
            Access or create your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={isLoading || isSignupLoading} className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" disabled={isLoading || isSignupLoading} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your username"
                            disabled={isLoading}
                            autoComplete="username"
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter your password"
                            disabled={isLoading}
                            autoComplete="current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <a href="/api/auth/google" className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center" 
                  type="button"
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  Sign in with Google
                </Button>
              </a>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={toggleDemoCredentials}
                type="button"
              >
                {demoCredentials ? "Clear Demo Credentials" : "Use Demo Account"}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-4">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your full name"
                            disabled={isSignupLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            disabled={isSignupLoading}
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
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Choose a username"
                            disabled={isSignupLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Create a password"
                              disabled={isSignupLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm password"
                              disabled={isSignupLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSignupLoading}
                    size="lg"
                  >
                    {isSignupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <a href="/api/auth/google" className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center" 
                  type="button"
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  Sign up with Google
                </Button>
              </a>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 border-t pt-4">
          <div className="text-sm text-center text-muted-foreground">
            <span>
              {activeTab === "login" 
                ? "Don't have an account? Click Sign Up above" 
                : "Already have an account? Click Login above"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}