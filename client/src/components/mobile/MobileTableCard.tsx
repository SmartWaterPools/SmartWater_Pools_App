import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileTableCardProps {
  title: string;
  subtitle?: string;
  items: Array<{
    label: string;
    value: string | React.ReactNode;
    status?: 'success' | 'warning' | 'error' | 'info';
    action?: {
      label: string;
      onClick: () => void;
      variant?: 'default' | 'outline' | 'ghost';
    };
  }>;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Mobile Table Card Component
 * 
 * Converts table-like data into mobile-friendly cards
 * with stacked layout and clear visual hierarchy.
 */
export const MobileTableCard: React.FC<MobileTableCardProps> = ({
  title,
  subtitle,
  items,
  actions,
  className
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      {(title || subtitle || actions) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="ml-4">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col space-y-2 p-3 border rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{item.label}</span>
                {item.status && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getStatusColor(item.status))}
                  >
                    {item.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-base font-medium text-gray-900 flex-1 min-w-0">
                  {item.value}
                </div>
                {item.action && (
                  <Button
                    variant={item.action.variant || 'outline'}
                    size="sm"
                    onClick={item.action.onClick}
                    className="ml-3 flex-shrink-0"
                  >
                    {item.action.label}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileTableCard;