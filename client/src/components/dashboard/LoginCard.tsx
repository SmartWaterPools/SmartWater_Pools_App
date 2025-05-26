import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

export default function LoginCard() {
  const { toast } = useToast();
  const { googleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      console.log("Initiating Google OAuth login flow");
      
      // Clear any previous error state
      setError(null);
      
      // Clear any stored state from localStorage (previous failed attempts)
      if (localStorage.getItem('oauth_client_state')) {
        console.log("Clearing previous oauth state from localStorage");
        localStorage.removeItem('oauth_client_state');
      }
      
      console.log("Preparing for Google OAuth login");
      
      // Additional OAuth state clearing
      try {
        const response = await fetch('/api/auth/clear-oauth-state', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log("OAuth state cleared:", data.success ? data.message : "OAuth state cleared successfully");
      } catch (error) {
        console.warn("Could not clear OAuth state (non-critical):", error);
      }
      
      // Prepare OAuth session
      console.log("Preparing OAuth session with server");
      try {
        const clientState = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Using client-generated state for OAuth:", clientState);
        
        const prepareResponse = await fetch('/api/auth/prepare-oauth', {
          method: 'GET',
          credentials: 'include'
        });
        
        const prepareData = await prepareResponse.json();
        
        if (!prepareData.success) {
          console.warn("Server returned success=false for OAuth preparation:", prepareData.message);
        }
      } catch (error) {
        console.warn("OAuth preparation failed (continuing anyway):", error);
      }
      
      await googleLogin();
      
      toast({
        title: "Redirecting to Google",
        description: "Please complete authentication with Google",
      });
    } catch (error) {
      console.error("Google login error:", error);
      setError("Google login failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsAppleLoading(true);
      setError(null);
      
      toast({
        title: "Apple Sign In",
        description: "Apple authentication will be available soon",
      });
      
      // Apple OAuth will be implemented here
      console.log("Apple OAuth - Coming soon");
      
    } catch (error) {
      console.error("Apple login error:", error);
      setError("Apple login failed. Please try again.");
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setIsMicrosoftLoading(true);
      setError(null);
      
      toast({
        title: "Microsoft Sign In", 
        description: "Microsoft authentication will be available soon",
      });
      
      // Microsoft OAuth will be implemented here
      console.log("Microsoft OAuth - Coming soon");
      
    } catch (error) {
      console.error("Microsoft login error:", error);
      setError("Microsoft login failed. Please try again.");
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-1 pb-6">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-primary mr-2" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Secure Sign In
            </CardTitle>
          </div>
          <CardDescription className="text-base text-gray-600">
            Sign in securely with your preferred provider
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Providers */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center space-x-3 h-12 text-base font-medium border-2 hover:bg-gray-50 transition-all duration-200"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isAppleLoading || isMicrosoftLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FcGoogle className="h-5 w-5" />
              )}
              <span>Continue with Google</span>
            </Button>

            {/* Apple Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center space-x-3 h-12 text-base font-medium border-2 hover:bg-gray-50 transition-all duration-200"
              onClick={handleAppleLogin}
              disabled={isGoogleLoading || isAppleLoading || isMicrosoftLoading}
            >
              {isAppleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SiApple className="h-5 w-5 text-black" />
              )}
              <span>Continue with Apple</span>
            </Button>

            {/* Microsoft Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center space-x-3 h-12 text-base font-medium border-2 hover:bg-gray-50 transition-all duration-200"
              onClick={handleMicrosoftLogin}
              disabled={isGoogleLoading || isAppleLoading || isMicrosoftLoading}
            >
              {isMicrosoftLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="h-5 w-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">M</div>
              )}
              <span>Continue with Microsoft</span>
            </Button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Enhanced Security</p>
                <p className="text-blue-700">
                  We use OAuth 2.0 authentication for maximum security. No passwords are stored on our servers.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}