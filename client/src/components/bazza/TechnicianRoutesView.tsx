import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { useBazzaRoutesByTechnician } from "../../hooks/useBazzaRoutes";
import { BazzaRoute, MaintenanceWithDetails } from "../../lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { 
  AlertCircle, 
  Calendar, 
  Clock, 
  FileText, 
  ListOrdered, 
  MapPin, 
  Plus, 
  User, 
  UserCheck 
} from "lucide-react";

type TechnicianRoutesViewProps = {
  technicians: { id: number; name: string }[];
  maintenances: MaintenanceWithDetails[];
  selectedTechnicianId: number | null;
  onTechnicianSelect: (technicianId: number | null) => void;
  onRouteSelect?: (route: BazzaRoute) => void;
  onAddRouteClick?: () => void;
  selectedDay?: string;
  onDayChange?: (day: string) => void;
};

export function TechnicianRoutesView({
  technicians,
  maintenances,
  selectedTechnicianId,
  onTechnicianSelect,
  onRouteSelect,
  onAddRouteClick,
  selectedDay = 'all',
  onDayChange
}: TechnicianRoutesViewProps) {
  // Debug logging
  console.log("TechnicianRoutesView - Received technicians:", 
    technicians.map(t => ({ id: t.id, name: t.name }))
  );
  const daysOfWeek = [
    { value: 'all', label: 'All Days' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];
  
  // Fetch routes for the selected technician
  const { 
    technicianRoutes = [], 
    isTechnicianRoutesLoading, 
    technicianRoutesError 
  } = useBazzaRoutesByTechnician(selectedTechnicianId);
  
  // Filter routes by day of week
  const filteredRoutes = technicianRoutes.filter(route => {
    if (selectedDay === 'all') return true;
    return route.dayOfWeek?.toLowerCase() === selectedDay.toLowerCase();
  });
  
  // Find maintenances assigned to this technician but not routed
  const unroutedMaintenances = useMemo(() => {
    if (!selectedTechnicianId || !maintenances) return [];
    
    console.log("Finding unrouted maintenances for technician:", selectedTechnicianId);
    console.log("Total maintenances:", maintenances.length);
    
    // Find maintenances assigned to the selected technician that need routing
    const filtered = maintenances.filter(maintenance => {
      // Check if assigned to this technician
      const isAssignedToThisTech = maintenance.technicianId === selectedTechnicianId;
      // Check if status is appropriate
      const hasActiveStatus = ['scheduled', 'in_progress'].includes(maintenance.status || '');
      
      if (isAssignedToThisTech) {
        console.log("Found maintenance assigned to technician:", maintenance.id, 
          "status:", maintenance.status, 
          "client:", maintenance.client?.user?.name || 'Unknown');
      }
      
      return isAssignedToThisTech && hasActiveStatus;
    });
    
    console.log("Found unrouted maintenances:", filtered.length);
    return filtered;
  }, [selectedTechnicianId, maintenances]);
  
  // Format maintenance type for display
  const formatMaintenanceType = (type: string | null | undefined): string => {
    if (!type) return 'Unknown';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  };
  
  // Format date for display
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'No date';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  // Handle day change
  const handleDayChange = (value: string) => {
    if (onDayChange) {
      onDayChange(value);
    }
  };
  
  // Handle route click
  const handleRouteClick = (route: BazzaRoute) => {
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };
  
  return (
    <div>
      <div className="mb-6 space-y-4">
        <Label>Select Technician</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {technicians.map(technician => (
            <Card 
              key={technician.id}
              className={`cursor-pointer hover:bg-accent transition-colors ${
                selectedTechnicianId === technician.id ? 'bg-accent' : ''
              }`}
              onClick={() => onTechnicianSelect(technician.id)}
            >
              <CardContent className="p-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <span>{
                  technician.name && technician.name.trim() !== '' 
                    ? technician.name 
                    : `Technician #${technician.id}`
                }</span>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {selectedTechnicianId && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <Label>Filter by Day</Label>
                <Select value={selectedDay} onValueChange={handleDayChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Display unrouted maintenance tasks at the top */}
            {unroutedMaintenances.length > 0 && (
              <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-medium text-amber-700">
                    Assigned But Not Routed ({unroutedMaintenances.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unroutedMaintenances.map((maintenance) => (
                    <Card key={maintenance.id} className="overflow-hidden border-amber-200">
                      <CardHeader className="pb-2 bg-amber-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{maintenance.client?.user?.name}</CardTitle>
                            <CardDescription className="text-xs flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {maintenance.client?.user?.address || maintenance.client?.client?.address || 'No address'}
                            </CardDescription>
                          </div>
                          <div>
                            {maintenance.status && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                {maintenance.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(maintenance.scheduleDate)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm font-medium">Type: </span>
                            <span className="text-sm">{formatMaintenanceType(maintenance.type)}</span>
                          </div>
                          {maintenance.notes && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Notes: </span>
                              <span className="text-muted-foreground">{maintenance.notes.length > 100 
                                ? `${maintenance.notes.substring(0, 100)}...` 
                                : maintenance.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex justify-end">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                {onAddRouteClick && (
                  <div className="mt-4 text-center">
                    <Button 
                      onClick={onAddRouteClick} 
                      variant="default" 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Route For These Items
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {isTechnicianRoutesLoading ? (
              <div className="flex justify-center items-center py-10">
                <Spinner size="lg" />
              </div>
            ) : technicianRoutesError ? (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {(technicianRoutesError as Error)?.message?.includes('Unauthorized') 
                    ? "Authentication error. Please log in to view route data." 
                    : "Failed to load routes. Please try again."}
                </AlertDescription>
              </Alert>
            ) : filteredRoutes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No routes found for this technician{selectedDay !== 'all' ? ` on ${selectedDay}` : ''}.</p>
                {onAddRouteClick && (
                  <Button 
                    onClick={onAddRouteClick} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Route
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {filteredRoutes.map(route => (
                  <Card 
                    key={route.id} 
                    className="cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => handleRouteClick(route)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{route.name}</CardTitle>
                        <Badge variant={route.isActive ? "default" : "outline"}>
                          {route.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="capitalize">{route.dayOfWeek}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{route.startTime} - {route.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ListOrdered className="h-4 w-4 text-muted-foreground" />
                          <span>{(route as any).stopCount || 0} stops</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{route.description || 'No description provided'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}