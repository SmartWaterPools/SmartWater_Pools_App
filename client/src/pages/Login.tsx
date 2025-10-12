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
import { Loader2, ShieldAlert, UserPlus, LogIn, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Email or username is required"),
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

// Enhanced error messages mapping for better user experience
const ERROR_MESSAGES: Record<string, { title: string; description: string; type: 'error' | 'warning' | 'info' }> = {
  'no-organization': {
    title: 'Organization Setup Required',
    description: 'Your account is not yet associated with an organization. Please complete the subscription process to continue.',
    type: 'warning'
  },
  'no-subscription': {
    title: 'Subscription Required',
    description: 'Your organization needs an active subscription to access the system. Please subscribe to continue.',
    type: 'warning'
  },
  'invalid-subscription': {
    title: 'Subscription Issue',
    description: 'There was a problem with your subscription. Please contact support for assistance.',
    type: 'error'
  },
  'inactive-subscription': {
    title: 'Subscription Expired',
    description: 'Your subscription has expired. Please renew your subscription to regain access.',
    type: 'warning'
  },
  'google-auth-failed': {
    title: 'Google Authentication Failed',
    description: 'We couldn\'t authenticate with Google. Please try again or use a different sign-in method.',
    type: 'error'
  },
  'authentication-timeout': {
    title: 'Authentication Timeout',
    description: 'The authentication process took too long. Please try signing in again.',
    type: 'error'
  },
  'state-mismatch': {
    title: 'Security Check Failed',
    description: 'For your security, the authentication was cancelled. Please try again.',
    type: 'error'
  },
  'network-error': {
    title: 'Connection Problem',
    description: 'We couldn\'t connect to the authentication service. Please check your internet connection and try again.',
    type: 'error'
  },
  'access-denied': {
    title: 'Access Denied',
    description: 'You cancelled the authentication or your account doesn\'t have permission to access this system.',
    type: 'warning'
  },
  'server-error': {
    title: 'Server Error',
    description: 'Our servers encountered an error. Please try again in a few moments.',
    type: 'error'
  }
};

export default function Login() {
  const { toast } = useToast();
  const { login, register, googleLogin, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Process URL parameters on mount and when URL changes with enhanced error handling
  useEffect(() => {
    // Use window.location.search to get the actual query parameters
    // Note: useLocation from wouter only returns the pathname, not the query string
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    const redirectPath = searchParams.get('redirect') || '/dashboard';
    
    console.log("Login page URL params check:", { errorParam, redirectPath, search: window.location.search });
    
    // Handle error parameter from OAuth callback or direct navigation
    if (errorParam) {
      console.log(`Processing error parameter: ${errorParam}`);
      
      const errorInfo = ERROR_MESSAGES[errorParam] || {
        title: 'Authentication Error',
        description: `An error occurred during authentication: ${errorParam.replace(/-/g, ' ')}`,
        type: 'error' as const
      };
      
      setError({
        message: `${errorInfo.title}: ${errorInfo.description}`,
        type: errorInfo.type
      });
      
      // Show toast notification for better visibility
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: errorInfo.type === 'error' ? 'destructive' : 'default',
      });
      
      // Auto-redirect for subscription-related errors
      if (['no-organization', 'no-subscription', 'invalid-subscription', 'inactive-subscription'].includes(errorParam)) {
        const timer = setTimeout(() => {
          setLocation('/pricing');
        }, 4000);
        return () => clearTimeout(timer);
      }
      
      // Clear URL parameters after processing (with a delay for visibility)
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location, setLocation, toast]);
  
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
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        setLocation('/dashboard');
      } else {
        const errorMessage = "The username/email or password you entered is incorrect. Please try again.";
        setError({
          message: errorMessage,
          type: 'error'
        });
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = "We couldn't log you in due to a technical issue. Please try again in a moment.";
      setError({
        message: errorMessage,
        type: 'error'
      });
      toast({
        title: "Technical Issue",
        description: errorMessage,
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
          title: "Welcome to SmartWater Pool Systems!",
          description: "Your account has been created successfully.",
        });
        setLocation('/dashboard');
      } else {
        const errorMessage = "We couldn't create your account. The username or email might already be in use.";
        setError({
          message: errorMessage,
          type: 'error'
        });
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = "We couldn't complete your registration due to a technical issue. Please try again.";
      setError({
        message: errorMessage,
        type: 'error'
      });
      toast({
        title: "Technical Issue",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSignupLoading(false);
    }
  }
  
  async function handleGoogleLogin() {
    try {
      console.log("Initiating Google OAuth login flow");
      setIsGoogleLoading(true);
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
      const existingError = urlParams.get('error');
      
      if (existingError) {
        console.log(`Detected existing error parameter: ${existingError}`);
        
        const errorInfo = ERROR_MESSAGES[existingError] || ERROR_MESSAGES['google-auth-failed'];
        
        setError({
          message: `${errorInfo.title}: ${errorInfo.description}`,
          type: errorInfo.type
        });
        
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
          variant: errorInfo.type === 'error' ? 'destructive' : 'default',
        });
        
        setIsGoogleLoading(false);
        return;
      }
      
      // Show toast to inform user about redirect
      toast({
        title: "Redirecting to Google",
        description: "You'll be redirected to Google to complete the sign-in process.",
      });
      
      // Call the enhanced googleLogin function
      await googleLogin();
    } catch (error) {
      console.error("Google login error:", error);
      const errorMessage = "We couldn't start the Google sign-in process. Please try again or use another sign-in method.";
      setError({
        message: errorMessage,
        type: 'error'
      });
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    } finally {
      // Reset loading state after a delay (in case redirect doesn't happen)
      setTimeout(() => {
        setIsGoogleLoading(false);
      }, 5000);
    }
  }
  
  // Helper function to get the appropriate icon for the alert
  const getAlertIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <ShieldAlert className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
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
            <Alert 
              variant={error.type === 'error' ? 'destructive' : 'default'} 
              className={`mb-4 border-2 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 ${
                error.type === 'error' 
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/50' 
                  : error.type === 'warning' 
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50' 
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
              }`}
              data-testid="alert-error-banner"
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 ${
                  error.type === 'error' 
                    ? 'text-red-600 dark:text-red-400' 
                    : error.type === 'warning' 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {getAlertIcon(error.type)}
                </div>
                <div className="flex-1">
                  <AlertTitle className="font-semibold text-base" data-testid="alert-error-title">
                    {error.type === 'error' ? 'Authentication Error' : error.type === 'warning' ? 'Warning' : 'Information'}
                  </AlertTitle>
                  <AlertDescription className="mt-1 text-sm" data-testid="alert-error-description">
                    {error.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                data-testid="button-google-signin"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <FcGoogle className="mr-2 h-5 w-5" />
                    Sign in with Google
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-1">
                You can select between multiple Google accounts
              </p>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">Or</span>
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
                          <Input 
                            placeholder="Enter your username or email" 
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            data-testid="input-username"
                            disabled={isLoading}
                            {...field} 
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
                            type="password" 
                            placeholder="Enter your password" 
                            autoComplete="current-password"
                            data-testid="input-password"
                            disabled={isLoading}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full hover:shadow-md transition-all duration-200" 
                    disabled={isLoading || isGoogleLoading}
                    data-testid="button-login"
                  >
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
                className="w-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isSignupLoading}
                data-testid="button-google-signup"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <FcGoogle className="mr-2 h-5 w-5" />
                    Sign up with Google
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-1">
                You can select between multiple Google accounts
              </p>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">Or</span>
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
                          <Input 
                            placeholder="Enter your full name" 
                            autoComplete="name"
                            data-testid="input-fullname"
                            disabled={isSignupLoading}
                            {...field} 
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
                            type="email" 
                            placeholder="Enter your email" 
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            data-testid="input-email"
                            disabled={isSignupLoading}
                            {...field} 
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
                            placeholder="Choose a username" 
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            data-testid="input-new-username"
                            disabled={isSignupLoading}
                            {...field} 
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Choose a password" 
                            autoComplete="new-password"
                            data-testid="input-new-password"
                            disabled={isSignupLoading}
                            {...field} 
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
                            type="password" 
                            placeholder="Confirm your password" 
                            autoComplete="new-password"
                            data-testid="input-confirm-password"
                            disabled={isSignupLoading}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full hover:shadow-md transition-all duration-200" 
                    disabled={isSignupLoading || isGoogleLoading}
                    data-testid="button-signup"
                  >
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