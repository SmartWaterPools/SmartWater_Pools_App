import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  Camera, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Package,
  Phone
} from "lucide-react";
import { Link } from "wouter";

interface QuickAction {
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  badge?: string | number;
  urgent?: boolean;
}

interface MobileQuickActionsProps {
  actions?: QuickAction[];
  className?: string;
}

/**
 * Mobile Quick Actions Component
 * 
 * Provides easy access to frequently used actions with
 * large touch targets optimized for mobile use.
 */
export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  actions,
  className
}) => {
  const defaultActions: QuickAction[] = [
    {
      label: 'Start Route',
      icon: Navigation,
      href: '/technician/routes/start',
      variant: 'default'
    },
    {
      label: 'Take Photo',
      icon: Camera,
      href: '/technician/documentation',
      variant: 'outline'
    },
    {
      label: 'Report Issue',
      icon: AlertTriangle,
      href: '/repairs/new',
      variant: 'destructive'
    },
    {
      label: 'Messages',
      icon: MessageSquare,
      href: '/communications',
      variant: 'outline',
      badge: 3
    }
  ];

  const quickActions = actions || defaultActions;

  return (
    <div className={`grid grid-cols-2 gap-3 md:hidden ${className}`}>
      {quickActions.map((action, index) => (
        <Link key={index} href={action.href}>
          <Button
            variant={action.variant || 'outline'}
            className="h-20 w-full flex flex-col items-center justify-center space-y-1 relative"
          >
            <action.icon className="h-6 w-6" />
            <span className="text-xs font-medium text-center leading-tight">
              {action.label}
            </span>
            {action.badge && (
              <Badge 
                variant={action.urgent ? "destructive" : "secondary"}
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {action.badge}
              </Badge>
            )}
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default MobileQuickActions;