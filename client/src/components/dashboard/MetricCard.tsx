import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number;
  changeText: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  iconBgColor: string;
}

export function MetricCard({ title, value, changeText, changeType, icon, iconBgColor }: MetricCardProps) {
  const changeColor = 
    changeType === 'increase' ? 'text-green-500' : 
    changeType === 'decrease' ? 'text-red-500' : 
    'text-gray-500';
  
  const ChangeIcon = 
    changeType === 'increase' ? ArrowUpIcon : 
    changeType === 'decrease' ? ArrowDownIcon : 
    null;
  
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
            <p className={`text-xs ${changeColor} mt-1 flex items-center`}>
              {ChangeIcon && <ChangeIcon className="h-3 w-3 mr-1" />}
              {changeText}
            </p>
          </div>
          <div className={`${iconBgColor} p-3 rounded-full`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
