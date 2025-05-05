import React, { useMemo, useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { useBazzaRoutesByTechnician, useRouteStops } from "../../hooks/useBazzaRoutes";
import { BazzaRoute, MaintenanceWithDetails } from "../../lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { 
  AlertCircle, 
  Calendar, 
  Clock, 
  FileText, 
  MapPin, 
  Plus, 
  PlusCircle, 
  Route, 
  UserCheck,
  CheckCircle 
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { createAssignment } from "../../services/bazzaService";
import { useToast } from "../../hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type TechnicianRoutesViewProps = {
  technicians: { id: number; name: string; userId?: number; active?: boolean }[];
  maintenances: MaintenanceWithDetails[];
  selectedTechnicianId: number | null;
  onTechnicianSelect: (technicianId: number | null) => void;
  onRouteSelect?: (route: BazzaRoute) => void;
  onAddRouteClick?: () => void;
  selectedDay?: string;
  onDayChange?: (day: string) => void;
};

// Simple route card component without drag and drop
function RouteCard({ route, onRouteClick }: { route: BazzaRoute; onRouteClick: (route: BazzaRoute) => void }) {
  // Determine technician name based on available data
  const technicianName = route.technicianId ? `Technician ${route.technicianId}` : 'No technician';
  
  // Get route stops to display stop count
  const { stops = [] } = useRouteStops(route.id);
  
  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => onRouteClick(route)}
    >
      <CardContent className="p-4">
        <div className="font-medium flex items-center justify-between">
          <div className="flex items-center">
            <Route className="h-4 w-4 mr-2 text-primary" />
            {route.name}
          </div>
          <Badge variant="outline" className="text-xs">
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
          </Badge>
        </div>
        
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1 inline" />
            <span className="capitalize">
              {route.dayOfWeek || 'No day specified'}
            </span>
          </div>
          
          <div className="flex items-center mt-1">
            <UserCheck className="h-3 w-3 mr-1 inline" />
            <span>
              {technicianName}
            </span>
          </div>
        </div>
        
        <div className="mt-2">
          <Badge variant={route.active || route.isActive ? "default" : "outline"}>
            {route.active || route.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple maintenance card component with dropdown assignment
function MaintenanceCard({ 
  maintenance, 
  availableRoutes,
  onAssignToRoute 
}: { 
  maintenance: MaintenanceWithDetails; 
  availableRoutes: BazzaRoute[];
  onAssignToRoute: (maintenanceId: number, routeId: number) => void;
}) {
  const handleRouteSelect = (routeId: string) => {
    if (routeId && routeId !== "none") {
      onAssignToRoute(maintenance.id, parseInt(routeId));
    }
  };

  // Extract client info safely, handling different possible structures
  let clientName = 'Unknown Client';
  let clientAddress = 'No address';
  
  // Handle different possible client data structures with proper type safety
  if (maintenance.client) {
    const client = maintenance.client as any;
    
    // Check for user property first (highest priority)
    if (client && typeof client === 'object' && 'user' in client && client.user) {
      const user = client.user;
      // Get name from user object
      if (typeof user === 'object' && 'name' in user && typeof user.name === 'string') {
        clientName = user.name;
      }
      
      // Get address from user object
      if (typeof user === 'object' && 'address' in user && typeof user.address === 'string') {
        clientAddress = user.address;
      }
    }
    
    // Direct properties - safely access companyName (if name not set from user)
    if (!clientName && 
        typeof client === 'object' && 
        'companyName' in client && 
        typeof client.companyName === 'string') {
      clientName = client.companyName;
    }
    
    // Direct name property (if company name not set)
    if (!clientName && 
        typeof client === 'object' && 
        'name' in client && 
        typeof client.name === 'string') {
      clientName = client.name;
    }
    
    // Safely check for address property (if not set from user)
    if (!clientAddress && 
        typeof client === 'object' && 
        'address' in client && 
        typeof client.address === 'string') {
      clientAddress = client.address;
    }
    
    // Nested client object (client.client structure) with safe property access
    const nestedClient = client && 
                        typeof client === 'object' && 
                        'client' in client ? 
                        client.client : null;
    
    if (nestedClient && typeof nestedClient === 'object') {
      // Safe property access for name (if not already set)
      if (!clientName && 
          'companyName' in nestedClient && 
          typeof nestedClient.companyName === 'string') {
        clientName = nestedClient.companyName;
      }
      
      // Safely check for name (if not already set)
      if (!clientName && 
          'name' in nestedClient && 
          typeof nestedClient.name === 'string') {
        clientName = nestedClient.name;
      }
      
      // Safely check for address (if not already set)
      if (!clientAddress && 
          'address' in nestedClient && 
          typeof nestedClient.address === 'string') {
        clientAddress = nestedClient.address;
      }
      
      // Handle location object if present
      const location = nestedClient && 
                      'location' in nestedClient ? 
                      nestedClient.location : null;
                      
      if (location && typeof location === 'object') {
        if (!clientAddress && 
            'street' in location && 
            typeof location.street === 'string') {
          clientAddress = location.street;
        }
      }
    }
  }

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="font-medium">
          {clientName}
        </div>
        
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <MapPin className="h-3 w-3 mr-1 inline" />
            {clientAddress}
          </div>
          
          <div className="flex items-center mt-1">
            <Calendar className="h-3 w-3 mr-1 inline" />
            {new Date(maintenance.scheduleDate).toLocaleDateString() || 'No date'}
          </div>
          
          <div className="flex items-center mt-1">
            <FileText className="h-3 w-3 mr-1 inline" />
            {maintenance.type || 'No type specified'}
          </div>
        </div>
        
        <div className="mt-3">
          <Label htmlFor={`route-select-${maintenance.id}`} className="text-xs">Assign to Route</Label>
          <Select onValueChange={handleRouteSelect}>
            <SelectTrigger id={`route-select-${maintenance.id}`} className="mt-1">
              <SelectValue placeholder="Select a route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Unassigned)</SelectItem>
              {availableRoutes.map(route => (
                <SelectItem key={route.id} value={route.id.toString()}>
                  {route.name} ({route.dayOfWeek})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SimpleRoutesView({
  technicians,
  maintenances,
  selectedTechnicianId,
  onTechnicianSelect,
  onRouteSelect,
  onAddRouteClick,
  selectedDay = 'all',
  onDayChange
}: TechnicianRoutesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maintenanceAssignments, setMaintenanceAssignments] = useState<Record<number, boolean>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Days of week options
  const daysOfWeek = [
    { value: 'all', label: 'All days' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];
  
  // Query routes for selected technician with extra safety
  const { 
    technicianRoutes: routes = [], 
    isTechnicianRoutesLoading: isRoutesLoading, 
    technicianRoutesError: routesError 
  } = useBazzaRoutesByTechnician(
    selectedTechnicianId
  );
  
  // Add protective log
  console.log("SimpleRoutesView - loaded routes:", 
    Array.isArray(routes) ? routes.length : "Not an array", 
    "isLoading:", isRoutesLoading, 
    "hasError:", !!routesError);
  
  // Filter routes by day
  const filteredRoutes = useMemo(() => {
    const routesToFilter = routes || [];
    if (selectedDay === 'all') return routesToFilter;
    return routesToFilter.filter(route => route.dayOfWeek === selectedDay);
  }, [routes, selectedDay]);
  
  // Filter maintenances to only show unassigned ones
  const unassignedMaintenances = useMemo(() => {
    // Start with all maintenances, with null/undefined safety
    const maintenancesToFilter = maintenances || [];
    return maintenancesToFilter.filter(maintenance => {
      // Skip if maintenance is invalid
      if (!maintenance || !maintenance.id) return false;
      // Skip if this maintenance is in our assignments tracking
      if (maintenanceAssignments[maintenance.id]) return false;
      // Otherwise, keep it
      return true;
    });
  }, [maintenances, maintenanceAssignments]);
  
  // Handle day change
  const handleDayChange = (value: string) => {
    if (onDayChange) {
      onDayChange(value);
    }
  };
  
  // Handle technician selection from dropdown
  const handleTechnicianSelect = (value: string) => {
    if (value === 'all') {
      onTechnicianSelect(null);
    } else {
      onTechnicianSelect(parseInt(value));
    }
  };
  
  // Handle route click
  const handleRouteClick = (route: BazzaRoute) => {
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };
  
  // Handle assigning a maintenance to a route
  const handleAssignToRoute = async (maintenanceId: number, routeId: number) => {
    setIsAssigning(true);
    
    try {
      // Find the maintenance and route objects
      const maintenance = maintenances.find(m => m.id === maintenanceId);
      const route = filteredRoutes.find(r => r.id === routeId);
      
      if (!maintenance || !route) {
        throw new Error("Maintenance or route not found");
      }
      
      // Make sure we have a valid client ID - try different potential structures
      let clientId = null;
      
      // Check for the client ID in different locations in the object with proper type safety
      if (maintenance.client) {
        // Using type assertions and property checks for safety
        const client = maintenance.client as any;
        
        // Check for direct id property
        if (client && typeof client === 'object' && 'id' in client && client.id) {
          clientId = client.id;
        } 
        // Check for nested client.client.id structure 
        else if (client && 
                typeof client === 'object' && 
                'client' in client && 
                client.client && 
                typeof client.client === 'object' && 
                'id' in client.client && 
                client.client.id) {
          clientId = client.client.id;
        } 
        // Check for maintenance.clientId as fallback
        else if ('clientId' in maintenance && maintenance.clientId) {
          clientId = maintenance.clientId;
        }
        
        // Log which strategy worked
        console.log("Client ID resolution method:", clientId ? "Found ID: " + clientId : "No ID found");
      }
      
      if (!clientId) {
        throw new Error("Maintenance is missing client information");
      }
      
      const date = new Date(maintenance.scheduleDate);
      
      // Create the assignment
      await createAssignment({
        routeId: route.id,
        maintenanceId: maintenance.id,
        date: date.toISOString().split('T')[0],
        status: "scheduled",
        notes: null,
        maintenance
      });
      
      // Mark as assigned in our local state
      setMaintenanceAssignments(prev => ({
        ...prev,
        [maintenance.id]: true
      }));
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances'] });
      
      if (selectedTechnicianId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/bazza/routes/technician/${selectedTechnicianId}`] 
        });
      }
      
      toast({
        title: "Assignment Complete",
        description: `Added maintenance task to the route "${route.name}".`
      });
    } catch (error) {
      console.error("Error assigning maintenance to route:", error);
      toast({
        title: "Error",
        description: "Failed to assign maintenance to route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-3">
        
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Technicians</h3>
          <ScrollArea className="h-96 rounded-md border">
            <div className="p-4 grid grid-cols-1 gap-3">
              {technicians && technicians.length > 0 ? (
                technicians.map(technician => (
                  <Card
                    key={technician.id}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedTechnicianId === technician.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => onTechnicianSelect(technician.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{technician.name}</div>
                        {technician.userId && (
                          <div className="text-xs text-muted-foreground">
                            ID: {technician.id}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No technicians available
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {onAddRouteClick && (
          <div className="mt-4 text-center">
            <Button 
              onClick={() => onAddRouteClick && onAddRouteClick()}
              variant="default" 
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Route
            </Button>
          </div>
        )}
      </div>
      
      <div className="lg:col-span-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {selectedTechnicianId 
              ? `Routes for ${technicians.find(t => t.id === selectedTechnicianId)?.name || 'Selected Technician'}`
              : 'All Routes'}
            {selectedDay !== 'all' && ` (${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)})`}
          </h3>
        </div>
        
        {isRoutesLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="lg" />
          </div>
        ) : routesError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load routes. Please try again later.
            </AlertDescription>
          </Alert>
        ) : filteredRoutes.length > 0 ? (
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRoutes.map(route => (
                <RouteCard 
                  key={route.id} 
                  route={route} 
                  onRouteClick={handleRouteClick} 
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 border rounded-md">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 text-lg font-medium">No routes found for this technician{selectedDay !== 'all' ? ` on ${selectedDay}` : ''}.</p>
            {onAddRouteClick && (
              <Button 
                onClick={() => onAddRouteClick && onAddRouteClick()}
                variant="outline" 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Route
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="lg:col-span-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Unassigned Maintenances</h3>
          <p className="text-sm text-muted-foreground">
            Select routes from the dropdown to assign maintenance tasks
          </p>
        </div>
        
        {isAssigning && (
          <div className="mb-4 flex items-center justify-center p-2 bg-muted rounded">
            <Spinner size="sm" className="mr-2" />
            <span>Assigning maintenance...</span>
          </div>
        )}
        
        {unassignedMaintenances.length > 0 ? (
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="p-4 grid grid-cols-1 gap-4">
              {unassignedMaintenances.map(maintenance => (
                <MaintenanceCard
                  key={maintenance.id}
                  maintenance={maintenance}
                  availableRoutes={filteredRoutes}
                  onAssignToRoute={handleAssignToRoute}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 border rounded-md">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 text-lg font-medium">All maintenance tasks have been assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              There are no unassigned maintenance tasks at this time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}