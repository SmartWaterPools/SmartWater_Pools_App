import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  changeText: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  iconBgColor: string;
}

export function MetricCard({ 
  title, 
  value, 
  changeText, 
  changeType, 
  icon, 
  iconBgColor 
}: MetricCardProps) {
  // Determine the color and icon for the change
  const changeColor = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-500',
  }[changeType];
  
  const ChangeIcon = {
    increase: ArrowUp,
    decrease: ArrowDown,
    neutral: Minus,
  }[changeType];
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBgColor}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-1">
          <ChangeIcon className={`h-4 w-4 ${changeColor} mr-1`} />
          <p className={`text-xs ${changeColor}`}>{changeText}</p>
        </div>
      </CardContent>
    </Card>
  );
}