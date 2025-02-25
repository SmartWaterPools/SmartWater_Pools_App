import { MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaintenanceWithDetails, formatDate, formatTime } from "@/lib/types";

interface MaintenanceItemProps {
  maintenance: MaintenanceWithDetails;
}

export function MaintenanceItem({ maintenance }: MaintenanceItemProps) {
  const date = new Date(maintenance.scheduledDate);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  
  const isToday = new Date().toDateString() === date.toDateString();
  const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === date.toDateString();
  
  const bgColorClass = isToday ? 'bg-blue-100' : isTomorrow ? 'bg-green-100' : 'bg-yellow-100';
  const textColorClass = isToday ? 'text-primary' : isTomorrow ? 'text-green-600' : 'text-yellow-600';
  
  return (
    <div className="border border-gray-100 rounded-lg mb-3 p-3 hover:bg-blue-50">
      <div className="flex items-start">
        <div className={`flex flex-col items-center justify-center ${bgColorClass} rounded-lg p-2 mr-3 flex-shrink-0 w-12 h-12 text-center`}>
          <span className={`${textColorClass} text-sm font-semibold`}>{day}</span>
          <span className={`${textColorClass} text-xs`}>{month}</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-foreground">{maintenance.client.user.name}</h4>
          <p className="text-xs text-gray-500">{maintenance.type.replace('_', ' ')}</p>
          <div className="flex items-center mt-1">
            <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-full">
              {formatTime(maintenance.scheduledTime)}
            </span>
            <span className="text-xs ml-2 flex items-center text-gray-500">
              <User className="h-3 w-3 mr-1" />
              {maintenance.technician ? maintenance.technician.user.name : 'Unassigned'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
