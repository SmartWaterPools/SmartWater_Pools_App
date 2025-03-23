import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "@/hooks/use-session";

export default function RegistrationComplete() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [countdown, setCountdown] = useState(5);
  
  // Get query params
  const searchParams = new URLSearchParams(window.location.search);
  const fromOAuth = searchParams.get("oauth") === "true";
  const redirectTo = searchParams.get("redirect") || "/pricing";
  
  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!isLoading && !session.isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // Auto redirect after 5 seconds
    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          navigate(redirectTo);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isLoading, session, navigate, redirectTo]);
  
  return (
    <div className="container max-w-4xl py-12 mx-auto">
      <Card className="w-full mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Registration Complete!</CardTitle>
          <CardDescription className="text-lg">
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>One more step required</AlertTitle>
            <AlertDescription>
              To access the full features of SmartWater Pools Management System, you'll need to choose a subscription plan.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">What happens next?</h3>
            <div className="grid gap-2">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                  <span className="text-primary text-sm font-bold">1</span>
                </div>
                <p>You'll be redirected to our pricing page in {countdown} seconds</p>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                  <span className="text-primary text-sm font-bold">2</span>
                </div>
                <p>Select a subscription plan that fits your business needs</p>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                  <span className="text-primary text-sm font-bold">3</span>
                </div>
                <p>Complete the checkout process with Stripe</p>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                  <span className="text-primary text-sm font-bold">4</span>
                </div>
                <p>Gain immediate access to all features of the platform</p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-center text-muted-foreground">
            <p>
              {fromOAuth
                ? "Thanks for signing in with Google!"
                : "Thanks for creating your account!"
              }
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => navigate(redirectTo)} 
            className="px-8"
            size="lg"
          >
            Continue to Pricing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}