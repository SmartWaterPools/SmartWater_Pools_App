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
import { Loader2, UserPlus, LogIn } from "lucide-react";
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
  const { login, register, googleLogin } = useAuth();
  const [location, setLocation] = useLocation();
  const [demoCredentials, setDemoCredentials] = useState(false);
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
  
  // Login form definition
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Signup form definition
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
      loginForm.setValue("username", "testuser@smartwaterpools.com");
      loginForm.setValue("password", "Test123!");
    } else {
      loginForm.setValue("username", "");
      loginForm.setValue("password", "");
    }
  }, [demoCredentials, loginForm]);
  
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
        
        // Redirect to dashboard or the requested page
        setLocation(redirectPath);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast({
        title: "Login error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleDemoCredentials() {
    setDemoCredentials(!demoCredentials);
  }

  // Handle signup form submission
  async function onSignupSubmit(data: SignupFormValues) {
    try {
      setIsSignupLoading(true);
      setError(null);
      
      console.log("Registration form submitted");
      
      const success = await register({
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
      });
      
      if (success) {
        toast({
          title: "Registration successful",
          description: "Your account has been created, and you are now logged in.",
        });
        
        // Redirect to dashboard
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast({
        title: "Registration error",
        description: "Could not create account due to a technical error",
        variant: "destructive",
      });
    } finally {
      setIsSignupLoading(false);
    }
  }
  
  // Handle Google login
  function handleGoogleLogin() {
    console.log("Initiating Google OAuth login flow");
    
    // Store origin path for potential redirect after login
    localStorage.setItem('pre_auth_redirect', redirectPath);
    
    // Show loading state
    setIsLoading(true);
    
    // Use the googleLogin method from AuthContext
    googleLogin();
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">SmartWater Pools</h1>
          <p className="text-muted-foreground">Pool Service Management Platform</p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Signup</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} />
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
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t"></span>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center" 
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FcGoogle className="mr-2 h-5 w-5" />
                      )}
                      Sign in with Google
                    </Button>
                    
                    <div className="text-center mt-4">
                      <Button
                        variant="link"
                        type="button"
                        onClick={toggleDemoCredentials}
                        className="text-xs"
                      >
                        {demoCredentials ? "Clear demo credentials" : "Use demo credentials"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                            <Input placeholder="email@example.com" {...field} />
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
                            <Input placeholder="johndoe" {...field} />
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
                            <Input type="password" placeholder="********" {...field} />
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
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSignupLoading}
                    >
                      {isSignupLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Account
                        </>
                      )}
                    </Button>
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t"></span>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center" 
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSignupLoading}
                    >
                      {isSignupLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FcGoogle className="mr-2 h-5 w-5" />
                      )}
                      Sign up with Google
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            <p>
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
        
        <div className="mt-4 text-center">
          <Button variant="link" onClick={() => setLocation('/pricing')}>
            View Pricing Plans
          </Button>
        </div>
      </div>
    </div>
  );
}