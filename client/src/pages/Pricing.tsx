import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { BillingCycle } from "@/lib/types";
import { apiRequest } from "../lib/queryClient";
import PricingPlans from "../components/pricing/PricingPlans";
import { Shield, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  console.log("Pricing page component rendering");
  
  // Debug: add a timestamp for when this component renders
  console.log("Pricing page rendered at:", new Date().toISOString());
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<number>(0);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [organizationSlug, setOrganizationSlug] = useState<string>("");
  
  // Get organization details from query parameters if available
  useEffect(() => {
    console.log("Pricing page: reading URL params");
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const slug = params.get("slug");
    
    console.log("Organization params from URL:", { name, slug });
    
    if (name) setOrganizationName(name);
    if (slug) setOrganizationSlug(slug);
  }, []);
  
  // Mutation for creating a Stripe checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: (data: { planId: number; organizationName?: string; organizationSlug?: string }) => {
      console.log("Creating checkout session with data:", data);
      return apiRequest("/api/stripe/checkout-session", "POST", {
        planId: data.planId,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
    },
    onSuccess: (data: any) => {
      console.log("Checkout session created successfully:", data);
      if (!data.success) {
        toast({
          title: "Checkout Error",
          description: data.message || "There was an error processing your request",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.url) {
        toast({
          title: "Checkout Error",
          description: "No checkout URL was returned. Please try again or contact support.",
          variant: "destructive",
        });
        return;
      }
      
      // Redirect to the Stripe checkout URL
      console.log("Redirecting to Stripe checkout:", data.url);
      window.location.href = data.url;
    },
    onError: (error: any) => {
      console.error("Checkout error:", error);
      
      // Try to extract a more specific error message
      let errorMessage = "There was an error creating your checkout session. Please try again.";
      
      if (error.response && error.response.data) {
        // Extract error from response data if available
        const responseData = error.response.data;
        errorMessage = responseData.message || responseData.error || errorMessage;
        console.log("Server returned error:", responseData);
      } else if (error.message) {
        // Use error message directly if available
        errorMessage = error.message;
      }
      
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Handle checkout button click
  const handleCheckout = () => {
    if (selectedPlanId === 0) {
      toast({
        title: "No Plan Selected",
        description: "Please select a subscription plan to continue.",
        variant: "destructive",
      });
      return;
    }
    
    createCheckoutMutation.mutate({
      planId: selectedPlanId,
      organizationName,
      organizationSlug,
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="container mx-auto py-8 px-4 sm:py-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-3 text-blue-900">Choose Your Plan</h1>
            <p className="text-lg text-blue-700 mb-4">
              Select the perfect plan for your pool service business needs
            </p>
          </div>
        </div>
      </div>
      
      {/* Pricing Plans Section */}
      <div className="py-6 sm:py-8 container mx-auto px-4">
        <PricingPlans
          selectedCycle={selectedCycle}
          onCycleChange={setSelectedCycle}
          onSelectPlan={setSelectedPlanId}
        />
        
        <div className="mt-8 flex justify-center">
          <Button 
            size="lg" 
            className="px-8 bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            onClick={handleCheckout}
            disabled={createCheckoutMutation.isPending || selectedPlanId === 0}
          >
            {createCheckoutMutation.isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Proceed to Checkout
              </span>
            )}
          </Button>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose SmartWater Pools?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-muted-foreground">
                Bank-level security protects your data. Regular backups ensure you never lose important information.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-6 w-6">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Simple & Intuitive</h3>
              <p className="text-muted-foreground">
                Our user-friendly interface makes it easy to manage clients, schedule services, and track inventory.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <CheckCircle className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Support</h3>
              <p className="text-muted-foreground">
                Our dedicated support team is ready to help with any questions or issues you may encounter.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="py-16 container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Can I change my plan later?</h3>
            <p className="text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">Do you offer a free trial?</h3>
            <p className="text-muted-foreground">
              All plans include a 14-day free trial so you can explore the platform before being charged.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">How does billing work?</h3>
            <p className="text-muted-foreground">
              We use Stripe for secure payment processing. You can use any major credit card, and receipts are automatically sent to your email.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">What happens if I cancel my subscription?</h3>
            <p className="text-muted-foreground">
              If you cancel, you'll continue to have access until the end of your current billing period. After that, your access will be limited until you resubscribe.
            </p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Pool Service Business?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of pool service professionals who trust SmartWater Pools to streamline their operations.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-8"
            onClick={handleCheckout}
            disabled={createCheckoutMutation.isPending || selectedPlanId === 0}
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </div>
  );
}