import { MaintenanceWithDetails } from "@/lib/types";
import { getStatusClasses, formatDate, formatTime } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";

interface MaintenanceItemProps {
  maintenance: MaintenanceWithDetails;
}

export function MaintenanceItem({ maintenance }: MaintenanceItemProps) {
  // Format date and time
  const date = new Date(maintenance.scheduledDate);
  const time = maintenance.scheduledTime;
  
  // Get status styling
  const statusClasses = getStatusClasses(maintenance.status);
  
  return (
    <Card className="bg-white overflow-hidden">
      <CardHeader className="p-4 pb-2 flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{maintenance.type}</h3>
            <Badge className={`${statusClasses.bg} ${statusClasses.text}`}>
              {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{maintenance.client.user.name}</p>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 pb-3">
        <div className="flex flex-col space-y-1.5 mt-2">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span>{formatDate(date)}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            <span>{formatTime(time)}</span>
          </div>
          
          {maintenance.client.user.address && (
            <div className="flex items-start text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
              <span>{maintenance.client.user.address}</span>
            </div>
          )}
        </div>
        
        {maintenance.description && (
          <div className="text-sm mt-3 text-gray-600">
            {maintenance.description}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {maintenance.technician ? (
            <span>Assigned to: {maintenance.technician.user.name}</span>
          ) : (
            <span>Not assigned</span>
          )}
        </div>
        <Button variant="ghost" size="sm">Details</Button>
      </CardFooter>
    </Card>
  );
}