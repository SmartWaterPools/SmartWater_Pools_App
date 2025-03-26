import { Check, X } from "lucide-react";
import { SubscriptionPlan } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SubscriptionPlanCard({
  plan,
  isSelected,
  onSelect,
}: SubscriptionPlanCardProps) {
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  // Determine if the plan is a featured plan
  const isFeatured = plan.tier === "professional";
  
  // Render feature availability indicator
  const renderFeatureStatus = (isAvailable: boolean, label: string) => (
    <div className="flex items-start mb-2 sm:mb-3">
      {isAvailable ? (
        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
      ) : (
        <X className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
      )}
      <span className={`text-sm sm:text-base ${!isAvailable ? "text-gray-500" : "text-blue-900"}`}>
        {label}
      </span>
    </div>
  );
  
  // Get basic plan features based on tier
  const getFeatures = () => {
    const commonFeatures = [
      { label: "Unlimited Clients", basic: true, pro: true, enterprise: true },
      { label: "Maintenance Scheduling", basic: true, pro: true, enterprise: true },
      { label: "Basic Customer Portal", basic: true, pro: true, enterprise: true },
      { label: "Service Reports", basic: true, pro: true, enterprise: true },
      { label: "Mobile App Access", basic: false, pro: true, enterprise: true },
      { label: "Route Optimization", basic: false, pro: true, enterprise: true },
      { label: "Chemical Tracking", basic: false, pro: true, enterprise: true },
      { label: "Inventory Management", basic: false, pro: false, enterprise: true },
      { label: "Advanced Analytics", basic: false, pro: false, enterprise: true },
      { label: "Custom Integrations", basic: false, pro: false, enterprise: true },
    ];
    
    return commonFeatures.map(feature => ({
      label: feature.label,
      available: plan.tier === "basic" ? feature.basic : 
                plan.tier === "professional" ? feature.pro : feature.enterprise
    }));
  };

  return (
    <Card className={`overflow-hidden transition-all border ${
      isSelected ? 'border-blue-500 ring-1 ring-blue-300' : 
      'border-gray-200'
    }`}>
      {/* Plan Header */}
      <CardHeader className="pb-3 pt-5 px-4 sm:pb-4 sm:pt-6 sm:px-6 bg-white">
        <h3 className="text-xl font-bold text-blue-900">
          {plan.name}
        </h3>
        
        <div className="mt-2">
          <span className="text-3xl font-bold text-blue-900">{formatCurrency(plan.price)}</span>
          <span className="text-gray-500 ml-1">
            /{plan.billingCycle === "monthly" ? "month" : "year"}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          {plan.description}
        </p>
      </CardHeader>
      
      {/* Plan Features */}
      <CardContent className="pt-3 px-4 sm:pt-4 sm:px-6 overflow-y-auto max-h-[360px] sm:max-h-full">
        <div className="space-y-0.5">
          {getFeatures().map((feature, index) => (
            <div key={index}>
              {renderFeatureStatus(feature.available, feature.label)}
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Plan Footer */}
      <CardFooter className="pt-3 pb-5 px-4 sm:pt-4 sm:pb-6 sm:px-6 flex justify-center">
        <Button
          onClick={onSelect}
          variant={isSelected ? "default" : "outline"}
          className={`w-full ${
            isSelected 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' 
              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {isSelected ? "Selected" : "Select Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}