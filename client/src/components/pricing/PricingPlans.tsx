import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BillingCycle, SubscriptionPlan } from "../../../shared/schema";
import SubscriptionPlanCard from "./SubscriptionPlanCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PricingPlansProps {
  selectedCycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  onSelectPlan: (planId: number) => void;
  defaultSelectedPlanId?: number;
}

export default function PricingPlans({
  selectedCycle,
  onCycleChange,
  onSelectPlan,
  defaultSelectedPlanId = 0,
}: PricingPlansProps) {
  console.log("PricingPlans component initialized");
  
  const [selectedPlanId, setSelectedPlanId] = useState<number>(defaultSelectedPlanId);
  const [filteredPlans, setFilteredPlans] = useState<SubscriptionPlan[]>([]);
  
  // Fetch all subscription plans
  console.log("Starting to fetch subscription plans...");
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/plans'],
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onSuccess: (data) => {
      console.log("Subscription plans API response SUCCESS:", data);
      if (!data?.plans || !Array.isArray(data.plans)) {
        console.error("API responded with success but plans data is invalid:", data);
      } else {
        console.log(`Received ${data.plans.length} subscription plans from API`);
      }
    },
    onError: (error: any) => {
      console.error("Error fetching subscription plans:", error);
      console.error("Error details:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
    }
  });
  
  console.log("Query state:", { isLoading, error: error ? "Error occurred" : "No error" });
  
  console.log("API response:", data);
  
  // Debug: Check the structure of each plan
  if (data?.plans) {
    data.plans.forEach((plan: any, index: number) => {
      console.log(`Plan ${index + 1} structure:`, JSON.stringify(plan));
    });
  }
  
  // Extract plans from the response
  const plans = data?.plans || [];
  
  // Debug: Log the extracted plans
  console.log("Extracted plans:", plans);
  
  // Filter plans by billing cycle and active status
  useEffect(() => {
    console.log("Effect running with selectedCycle:", selectedCycle);
    console.log("Current plans data:", plans);
    
    if (plans && plans.length > 0) {
      console.log("Filtering plans for cycle:", selectedCycle);
      const filtered = plans.filter((plan: SubscriptionPlan) => {
        console.log("Checking plan:", plan);
        // Make sure we're checking the correct field - some API responses may use 'active' or 'isActive'
        const isActive = plan.active !== undefined ? plan.active : true;
        return isActive && plan.billingCycle === selectedCycle;
      });
      
      // Sort by price low to high
      filtered.sort((a: SubscriptionPlan, b: SubscriptionPlan) => a.price - b.price);
      
      setFilteredPlans(filtered);
      
      // Reset selection if the currently selected plan is no longer available
      if (selectedPlanId !== 0 && !filtered.some(plan => plan.id === selectedPlanId)) {
        setSelectedPlanId(0);
        onSelectPlan(0);
      }
    }
  }, [plans, selectedCycle, selectedPlanId, onSelectPlan]);
  
  // Handle plan selection
  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    onSelectPlan(planId);
  };
  
  // Handle billing cycle toggle
  const handleCycleToggle = (checked: boolean) => {
    onCycleChange(checked ? "yearly" : "monthly");
  };
  
  // Calculate yearly discount percentage
  const calculateYearlyDiscount = () => {
    if (!plans) return 0;
    
    // Find a plan that has both monthly and yearly options
    const professionalPlans = plans.filter(
      (plan: SubscriptionPlan) => {
        const isActive = plan.active !== undefined ? plan.active : true;
        return isActive && plan.tier === "professional";
      }
    );
    
    if (professionalPlans.length < 2) return 0;
    
    const monthlyPlan = professionalPlans.find(
      (plan: SubscriptionPlan) => plan.billingCycle === "monthly"
    );
    
    const yearlyPlan = professionalPlans.find(
      (plan: SubscriptionPlan) => plan.billingCycle === "yearly"
    );
    
    if (!monthlyPlan || !yearlyPlan) return 0;
    
    // Calculate yearly savings (monthly × 12 - yearly) / (monthly × 12) × 100
    const monthlyCost = monthlyPlan.price * 12;
    const yearlyCost = yearlyPlan.price;
    const savings = ((monthlyCost - yearlyCost) / monthlyCost) * 100;
    
    return Math.round(savings);
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex justify-center mb-10">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[500px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-red-500 mb-2">
          Unable to load subscription plans
        </h3>
        <p className="text-muted-foreground">
          Please try again later or contact support for assistance.
        </p>
      </div>
    );
  }
  
  // Calculate discount percentage for the yearly billing cycle
  const yearlyDiscount = calculateYearlyDiscount();
  
  return (
    <div>
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center items-center mb-12 space-x-2">
        <Label htmlFor="billing-toggle" className="text-sm font-medium">
          Monthly Billing
        </Label>
        
        <div className="relative">
          <Switch
            id="billing-toggle"
            checked={selectedCycle === "yearly"}
            onCheckedChange={handleCycleToggle}
          />
          
          {yearlyDiscount > 0 && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
              Save {yearlyDiscount}%
            </span>
          )}
        </div>
        
        <Label htmlFor="billing-toggle" className="text-sm font-medium">
          Annual Billing
        </Label>
      </div>
      
      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => (
            <SubscriptionPlanCard 
              key={plan.id}
              plan={plan}
              isSelected={selectedPlanId === plan.id}
              onSelect={() => handleSelectPlan(plan.id)}
            />
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <h3 className="text-lg font-medium mb-2">
              No subscription plans available
            </h3>
            <p className="text-muted-foreground">
              Please check back later for available subscription options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}