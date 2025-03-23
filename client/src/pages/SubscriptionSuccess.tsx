import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionSuccess() {
  const [, navigate] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Extract the session ID from the URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get("session_id");
    setSessionId(session);
    
    // Redirect to dashboard after 10 seconds if there's no session ID
    if (!session) {
      const timeout = setTimeout(() => {
        navigate("/dashboard");
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [navigate]);
  
  // Fetch checkout session details if we have a session ID
  const { data: session, isLoading, error } = useQuery({
    queryKey: ["/api/stripe/checkout-session", sessionId],
    enabled: !!sessionId,
  });
  
  // Get organization name from the checkout session
  const organizationName = session?.organizationName || "your organization";
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            {isLoading ? (
              <Skeleton className="h-8 w-64 mx-auto" />
            ) : error ? (
              "Subscription Status"
            ) : (
              "Subscription Confirmed!"
            )}
          </h1>
          
          <div className="text-muted-foreground">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mx-auto" />
              </>
            ) : error ? (
              "We're verifying your subscription details."
            ) : (
              <>
                <p>
                  Thank you for subscribing to SmartWater Pools!
                </p>
                <p className="mt-2">
                  Your subscription for <span className="font-medium">{organizationName}</span> has been 
                  successfully processed.
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Subscription Details */}
        {!isLoading && !error && session && (
          <div className="bg-muted rounded-md p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{session.planName}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Billing</span>
              <span className="font-medium">
                {session.billingCycle === "monthly" ? "Monthly" : "Annual"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-600 font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Active
              </span>
            </div>
          </div>
        )}
        
        {/* Email Information */}
        <div className="text-sm text-center text-muted-foreground mb-6">
          {isLoading ? (
            <Skeleton className="h-4 w-full mb-2" />
          ) : (
            <>
              A confirmation email has been sent to your email address.
              <br />
              Please check your inbox for receipt and subscription details.
            </>
          )}
        </div>
        
        {/* Action Button */}
        <div className="flex justify-center">
          <Button asChild className="w-full">
            <Link to="/dashboard">
              <span className="flex items-center">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Customer Support */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Questions or need assistance? <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}