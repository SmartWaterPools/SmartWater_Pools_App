import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, checkSession } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated and redirect if so
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User already authenticated, redirecting to dashboard");
      setLocation('/dashboard');
    } else {
      console.log("User not authenticated, staying on login page");
    }
  }, [isAuthenticated, setLocation]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear any OAuth state before starting new OAuth flow
      const clearResponse = await fetch('/api/auth/clear-oauth-state', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (clearResponse.ok) {
        console.log("OAuth state cleared successfully");
      }
      
      // Redirect to Google OAuth
      window.location.href = '/api/auth/google';
      
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      setError("Failed to start Google sign-in. Please try again.");
      toast({
        title: "Authentication Error",
        description: "Could not start Google sign-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {/* OAuth-only authentication */}
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Sign in securely with your Google account. No passwords are stored on our servers.
              </p>
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
            
            <div className="text-center text-xs text-muted-foreground">
              <p>
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <ShieldAlert className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Enhanced Security</p>
                  <p className="text-xs">
                    OAuth-only authentication ensures maximum security. No passwords are stored on our servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}