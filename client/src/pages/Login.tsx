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
import { Loader2, ShieldAlert, UserPlus, LogIn } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Email is required"),
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
  const { login, register, googleLogin, checkSession, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  
  // Check if there's a redirect URL in the query string
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');
  
  // Process URL parameters on mount
  useEffect(() => {
    // Handle error parameter from OAuth callback
    if (errorParam) {
      if (errorParam === 'no-organization') {
        setError("Your account is not associated with an organization. Please complete the subscription process.");
        // Automatically redirect to pricing page after a delay
        const timer = setTimeout(() => {
          setLocation('/pricing');
        }, 3000);
        return () => clearTimeout(timer);
      } else if (errorParam === 'no-subscription') {
        setError("Your organization doesn't have an active subscription. Please subscribe to continue.");
        // Automatically redirect to pricing page after a delay
        const timer = setTimeout(() => {
          setLocation('/pricing');
        }, 3000);
        return () => clearTimeout(timer);
      } else if (errorParam === 'invalid-subscription') {
        setError("There was an issue with your subscription. Please contact support or update your subscription.");
      } else if (errorParam === 'inactive-subscription') {
        setError("Your subscription is not active. Please renew your subscription to continue.");
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
    }
  }, [errorParam, setLocation]);
  
  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Login: User authenticated, redirecting to dashboard");
      // Small delay to ensure all auth data is properly set
      setTimeout(() => {
        setLocation('/dashboard');
      }, 300);
    }
  }, [isAuthenticated, setLocation]);
  
  // Check session on page load to ensure we're not showing login when already authenticated
  useEffect(() => {
    // Skip extra check if already authenticated
    if (isAuthenticated) {
      return;
    }
    
    // Otherwise perform a manual check
    console.log("Login page: Performing initial session check");
    
    // No need for a separate function since we have access to checkSession from context
    if (checkSession) {
      checkSession().then(isAuthed => {
        if (isAuthed) {
          console.log("Login page: Initial check found user is authenticated, redirecting");
          setLocation('/dashboard');
        }
      }).catch(error => {
        console.error("Error checking auth status on login page:", error);
      });
    }
  }, [isAuthenticated, checkSession, setLocation]);
  
  // Define login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
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
  
  async function onLoginSubmit(data: LoginFormValues) {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Login form submitted");
      
      const success = await login(data.username, data.password);
      
      if (success) {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Login failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
        setError("Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
      toast({
        title: "Login error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function onSignupSubmit(data: SignupFormValues) {
    try {
      setIsSignupLoading(true);
      setError(null);
      
      console.log("Signup form submitted");
      
      const userData = {
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
      };
      
      const success = await register(userData);
      
      if (success) {
        toast({
          title: "Registration successful",
          description: "Your account has been created",
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Registration failed",
          description: "Could not create account",
          variant: "destructive",
        });
        setError("Could not create account. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred during registration. Please try again.");
      toast({
        title: "Registration error",
        description: "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSignupLoading(false);
    }
  }
  
  async function handleGoogleLogin() {
    try {
      console.log("Initiating Google OAuth login flow");
      setIsLoading(true);
      
      // Clear any previous error state
      setError(null);
      
      // Clear any stored state from localStorage (previous failed attempts)
      if (localStorage.getItem('oauth_client_state')) {
        console.log("Clearing previous oauth state from localStorage");
        localStorage.removeItem('oauth_client_state');
        localStorage.removeItem('oauth_server_state');
        localStorage.removeItem('oauth_timestamp');
      }
      
      // Check for error parameters in URL that might indicate previous OAuth failures
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      
      if (errorParam) {
        console.log(`Detected error parameter in URL: ${errorParam}`);
        
        // Handle specific error types
        if (errorParam === 'authentication-timeout') {
          console.error("Previous authentication attempt timed out");
          setError("Authentication attempt timed out. Please try again.");
          toast({
            title: "Authentication timed out",
            description: "Your previous sign-in attempt took too long. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        if (errorParam === 'google-auth-failed') {
          console.error("Previous Google authentication failed");
          setError("Google authentication failed. Please try again with a different account.");
          toast({
            title: "Authentication failed",
            description: "Google authentication was unsuccessful. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Show toast to inform user about redirect
      toast({
        title: "Google Sign-In",
        description: "Redirecting to Google for authentication...",
      });
      
      // Call the enhanced googleLogin function
      await googleLogin();
    } catch (error) {
      console.error("Google login error:", error);
      setError("An error occurred preparing for Google login. Please try again.");
      toast({
        title: "Google login error",
        description: "An error occurred preparing for Google login. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            SmartWater Pool Systems
          </CardTitle>
          <CardDescription className="text-center">
            Login to manage your pool service business
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center" 
                type="button"
                onClick={handleGoogleLogin}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-1">
                You can select between multiple Google accounts
              </p>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username or Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
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
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Login
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center" 
                type="button"
                onClick={handleGoogleLogin}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Sign up with Google
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-1">
                You can select between multiple Google accounts
              </p>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
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
                          <Input type="email" placeholder="Enter your email" {...field} />
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
                          <Input placeholder="Choose a username" {...field} />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Choose a password" {...field} />
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
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSignupLoading}>
                    {isSignupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            &copy; {new Date().getFullYear()} SmartWater Pool Systems
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}