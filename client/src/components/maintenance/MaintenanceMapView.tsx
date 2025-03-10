import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  MoreHorizontal,
  Check,
  Loader2,
  Clock,
  FileText
} from "lucide-react";
import { MaintenanceWithDetails, getStatusClasses } from "@/lib/types";

interface MaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceMapView({
  maintenances,
  onStatusUpdate,
  isUpdatingStatus = false,
  selectedMaintenance = null
}: MaintenanceMapViewProps) {
  const [, navigate] = useLocation();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Format the maintenance type for display
  const formatMaintenanceType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle opening service report form
  const handleServiceReportOpen = (maintenance: MaintenanceWithDetails, usePage = false, useNewPage = false) => {
    if (useNewPage) {
      // Navigate to the SmartWater style report page
      navigate(`/service-report-page/${maintenance.id}`);
    } else if (usePage) {
      // Navigate to standard service report page
      navigate(`/service-report/${maintenance.id}`);
    }
  };

  // Mock the map container
  // In a real implementation, this would be replaced with an actual map library (e.g. Leaflet, Google Maps, etc.)
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Maintenance Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Map placeholder - would be replaced with an actual map component */}
          <div className="h-[400px] bg-gray-100 rounded-md relative flex items-center justify-center border border-dashed border-gray-300 overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-4">
              {maintenances.slice(0, 9).map((maintenance, index) => {
                const statusClasses = getStatusClasses(maintenance.status);
                const isUpdating = isUpdatingStatus && selectedMaintenance?.id === maintenance.id;
                const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
                
                // Calculate a somewhat random position for the maintenance on the grid
                const row = Math.floor(index / 3);
                const col = index % 3;
                
                return (
                  <div 
                    key={maintenance.id}
                    className="relative group"
                    style={{
                      gridRow: row + 1,
                      gridColumn: col + 1,
                    }}
                  >
                    <div 
                      className={`
                        absolute p-1.5 rounded-full cursor-pointer transform transition-all
                        ${statusClasses.bg} border-2 border-white shadow-md
                        hover:scale-110 hover:z-10
                      `}
                      style={{
                        left: `${30 + Math.random() * 40}%`,
                        top: `${30 + Math.random() * 40}%`,
                      }}
                    >
                      <MapPin className="h-5 w-5 text-white" />
                      
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 p-2 bg-white rounded-md shadow-lg text-sm transition-opacity duration-200">
                        <div className="font-medium">{maintenance.client.user.name}</div>
                        <div className="text-xs text-gray-600">{formatMaintenanceType(maintenance.type)}</div>
                        <div className="mt-1 flex items-center justify-between">
                          <Badge className={`${statusClasses.bg} ${statusClasses.text} text-xs`}>
                            {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleServiceReportOpen(maintenance, false, true)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Service Report
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {maintenance.status !== "completed" && (
                                <DropdownMenuItem
                                  onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "completed")}
                                  disabled={isUpdating}
                                >
                                  {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                  )}
                                  Mark as Completed
                                </DropdownMenuItem>
                              )}
                              
                              {maintenance.status !== "in_progress" && (
                                <DropdownMenuItem
                                  onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "in_progress")}
                                  disabled={isUpdating}
                                >
                                  {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Clock className="h-4 w-4 mr-2" />
                                  )}
                                  Mark as In Progress
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-center">
              <MapPin className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                Interactive map will display client locations for scheduled maintenance
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {maintenances.length} locations found
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
              In Progress
            </Badge>
            <Badge variant="outline" className="bg-yellow-50">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5"></div>
              Scheduled
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
              Completed
            </Badge>
            <Badge variant="outline" className="bg-gray-50">
              <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></div>
              Cancelled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* List of maintenances below the map for quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {maintenances.slice(0, 6).map((maintenance) => {
          const statusClasses = getStatusClasses(maintenance.status);
          const isUpdating = isUpdatingStatus && selectedMaintenance?.id === maintenance.id;
          const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
          
          return (
            <Card 
              key={maintenance.id} 
              className={`${maintenance.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''} overflow-hidden`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span className="capitalize">{formatMaintenanceType(maintenance.type)}</span>
                  <Badge 
                    className={`${statusClasses.bg} ${statusClasses.text}`}
                  >
                    {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{maintenance.notes && !hasServiceReport ? maintenance.notes.split(' ')[0] : "Time not specified"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{maintenance.client.user.name}</span>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                        <MoreHorizontal className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleServiceReportOpen(maintenance, false, true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Service Report
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {maintenance.status !== "completed" && (
                        <DropdownMenuItem
                          onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "completed")}
                          disabled={isUpdating}
                        >
                          {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Mark as Completed
                        </DropdownMenuItem>
                      )}
                      
                      {maintenance.status !== "in_progress" && (
                        <DropdownMenuItem
                          onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "in_progress")}
                          disabled={isUpdating}
                        >
                          {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 mr-2" />
                          )}
                          Mark as In Progress
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}