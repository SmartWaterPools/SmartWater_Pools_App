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
import { Loader2, ShieldAlert, KeySquare } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";

// Define login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function Login() {
  const { toast } = useToast();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [demoCredentials, setDemoCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if there's a redirect URL in the query string
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectPath = searchParams.get('redirect') || '/';
  
  // If already authenticated, redirect to homepage
  useEffect(() => {
    if (isAuthenticated) {
      setLocation(redirectPath !== '/login' ? redirectPath : '/');
    }
  }, [isAuthenticated, setLocation, redirectPath]);
  
  // Define form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: demoCredentials ? "testuser" : "",
      password: demoCredentials ? "Test123!" : "",
    },
  });
  
  // Update form values when demo credentials toggle changes
  useEffect(() => {
    if (demoCredentials) {
      form.setValue("username", "testuser");
      form.setValue("password", "Test123!");
    } else {
      form.setValue("username", "");
      form.setValue("password", "");
    }
  }, [demoCredentials, form]);
  
  async function onSubmit(data: LoginFormValues) {
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
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-8 bg-pattern">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-2">
              <KeySquare className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">SmartWater Pools</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
          
          <div className="relative">
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
          
          <div className="relative">
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
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 border-t pt-4">
          <div className="text-sm text-center text-muted-foreground">
            <span>Need an account? Contact your administrator</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}