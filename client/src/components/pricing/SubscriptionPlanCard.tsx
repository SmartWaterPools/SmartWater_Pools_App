import { Check, X } from "lucide-react";
import { SubscriptionPlan } from "../../../shared/schema";
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
    <div className="flex items-start mb-3">
      {isAvailable ? (
        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/70 mr-2 shrink-0 mt-0.5" />
      )}
      <span className={!isAvailable ? "text-muted-foreground" : ""}>
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
    <Card className={`overflow-hidden transition-all ${
      isSelected ? 'border-primary ring-2 ring-primary/20' : 
      isFeatured ? 'border-primary/50' : ''
    }`}>
      {/* Plan Header */}
      <CardHeader className={`pb-6 ${isFeatured ? 'bg-primary/10' : 'bg-muted/50'}`}>
        {isFeatured && (
          <Badge className="w-fit mb-2 bg-primary">Most Popular</Badge>
        )}
        
        <h3 className="text-xl font-bold">
          {plan.name}
        </h3>
        
        <div className="mt-1">
          <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
          <span className="text-muted-foreground ml-1">
            /{plan.billingCycle === "monthly" ? "month" : "year"}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {plan.description}
        </p>
      </CardHeader>
      
      {/* Plan Features */}
      <CardContent className="pt-6">
        <div className="space-y-1">
          {getFeatures().map((feature, index) => (
            <div key={index}>
              {renderFeatureStatus(feature.available, feature.label)}
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Plan Footer */}
      <CardFooter className="pt-4 pb-6 flex justify-center">
        <Button
          onClick={onSelect}
          variant={isSelected ? "default" : isFeatured ? "default" : "outline"}
          className={`w-full ${isSelected ? 'bg-primary hover:bg-primary/90' : 
            isFeatured ? 'bg-primary hover:bg-primary/90' : ''}`}
        >
          {isSelected ? "Selected" : "Select Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}