import React, { useMemo, useState, useEffect, createContext } from 'react';
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
import { useBazzaRoutesByTechnician, useBazzaRoutes, useRouteStops } from "../../hooks/useBazzaRoutes";
import { BazzaRoute, MaintenanceWithDetails } from "../../lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { 
  AlertCircle, 
  Calendar, 
  ChevronDown,
  ChevronRight,
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
import { apiRequest } from "../../lib/queryClient";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

// Create context for maintenance assignments
export const MaintenanceAssignmentsContext = createContext<React.Dispatch<React.SetStateAction<Record<number, boolean>>> | null>(null);

// Define drag and drop item types
const ItemTypes = {
  MAINTENANCE: 'maintenance'
};

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

// Draggable maintenance card component
interface MaintenanceCardProps {
  maintenance: MaintenanceWithDetails;
  onAddToRoute?: (maintenanceId: number, routeId: number) => void;
  availableRoutes: BazzaRoute[];
}

function MaintenanceCard({ maintenance, onAddToRoute, availableRoutes }: MaintenanceCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingToRoute, setIsAddingToRoute] = useState(false);
  const setMaintenanceAssignments = React.useContext(MaintenanceAssignmentsContext);
  
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
  
  // Configure drag source
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MAINTENANCE,
    item: { 
      maintenanceId: maintenance.id, 
      maintenance: maintenance,
      type: ItemTypes.MAINTENANCE 
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  
  // Handle add to route
  const handleAddToRoute = async (routeId: number) => {
    try {
      setIsAddingToRoute(true);
      
      const date = new Date(maintenance.scheduleDate);
      
      console.log(`Adding maintenance ${maintenance.id} to route ${routeId}`);
      console.log(`Maintenance client:`, maintenance.client);
      
      const clientId = maintenance.client?.client?.id || (maintenance.client as any)?.id;
      if (!maintenance.client || !clientId) {
        console.error("Maintenance is missing client information");
        toast({
          title: "Missing Information",
          description: "This maintenance task doesn't have proper client information. Cannot assign to route.",
          variant: "destructive"
        });
        return;
      }
      
      // Create assignment for this maintenance on this route
      await createAssignment({
        routeId: routeId,
        maintenanceId: maintenance.id,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        status: "scheduled",
        notes: null,
        maintenance: maintenance // Pass the maintenance object to help with route stop creation
      });
      
      // Update the assignment cache immediately for a responsive UI
      try {
        // Update the local state to immediately hide this maintenance from the unrouted list
        if (setMaintenanceAssignments) {
          setMaintenanceAssignments((prev: Record<number, boolean>) => ({
            ...prev,
            [maintenance.id]: true // Mark as assigned immediately in local state
          }));
          
          // Set this as the last assigned maintenance to ensure it's hidden immediately
          (window as any).lastAssignedMaintenanceId = maintenance.id;
        }
        
        // Update the cached assignment status directly
        const maintenanceAssignmentsCache = queryClient.getQueryData<Record<number, boolean>>(['maintenanceAssignments']) || {};
        const updatedAssignments = { 
          ...maintenanceAssignmentsCache,
          [maintenance.id]: true // Mark this maintenance as assigned to a route
        };
        queryClient.setQueryData(['maintenanceAssignments'], updatedAssignments);
        
        // Also try to force a refresh of the maintenance data
        const updatedMaintenances = await apiRequest('/api/maintenances');
        queryClient.setQueryData(['/api/maintenances'], updatedMaintenances);
      } catch (refreshError) {
        console.error("Error updating assignment cache:", refreshError);
      }
      
      // Invalidate related queries to refresh the data
      console.log("Invalidating queries to refresh UI after adding maintenance to route");
      
      // More comprehensive query invalidation to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${routeId}/assignments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes/stops', routeId] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${routeId}`] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances'] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/assignments/maintenance/${maintenance.id}`] }); 
      
      // Force update the technician routes if we know the technician ID
      const route = availableRoutes.find(r => r.id === routeId);
      if (route?.technicianId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/bazza/routes/technician/${route.technicianId}`] 
        });
      }
      
      console.log("Successfully added maintenance to route");
      toast({
        title: "Added to Route",
        description: "The maintenance task has been added to the selected route."
      });
    } catch (error) {
      console.error("Error adding maintenance to route:", error);
      
      // Provide more specific error message based on the type of error
      let errorMessage = "Failed to add maintenance to route. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("client") || error.message.includes("Client")) {
          errorMessage = "Client information is missing or invalid. Please check the client details.";
        } else if (error.message.includes("route stop")) {
          errorMessage = "Could not create a route stop. Make sure the route is properly configured.";
        } else if (error.message.includes("route") || error.message.includes("Route")) {
          errorMessage = "Route information is missing or invalid. Please check the route details.";
        } else if (error.message.includes("Foreign key")) {
          errorMessage = "Database constraint error. The client may not be assigned to this route.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAddingToRoute(false);
    }
  };
  
  return (
    <Card 
      ref={drag} 
      key={maintenance.id} 
      className={`overflow-hidden border-amber-200 ${isDragging ? 'opacity-50' : ''}`}
    >
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
              <Badge className={(maintenance as any).isRouted ? "bg-purple-100 text-purple-800 hover:bg-purple-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}>
                {((maintenance as any).isRouted ? 'routed' : maintenance.status).replace('_', ' ')}
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
      <CardFooter className="pt-2 flex justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isAddingToRoute || availableRoutes.length === 0}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Add to Route {isAddingToRoute && <Spinner size="sm" className="ml-2" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Route</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableRoutes.map(route => (
              <DropdownMenuItem 
                key={route.id} 
                onClick={() => handleAddToRoute(route.id)}
                disabled={isAddingToRoute}
              >
                {route.name} ({route.dayOfWeek})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}

// Droppable route card component
interface RouteCardProps {
  route: BazzaRoute;
  onRouteClick: (route: BazzaRoute) => void;
}

function DroppableRouteCard({ route, onRouteClick }: RouteCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: clientsList } = useQuery<{ id: number; name: string; companyName?: string }[]>({
    queryKey: ["/api/clients"],
  });
  
  const clientMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (clientsList) {
      for (const c of clientsList) {
        map[c.id] = c.name || c.companyName || `Client #${c.id}`;
      }
    }
    return map;
  }, [clientsList]);
  
  // Get route stops to display stop count
  const { stops = [], isStopsLoading } = useRouteStops(route.id);
  
  // Get the setMaintenanceAssignments function from context
  const setMaintenanceAssignments = React.useContext(MaintenanceAssignmentsContext);
  
  // Configure drop target
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.MAINTENANCE,
    drop: (item: { maintenanceId: number, maintenance: MaintenanceWithDetails, type: string }) => {
      console.log("Drop received item:", item);
      if (item.maintenanceId && item.maintenance) {
        handleMaintenanceDrop(item.maintenanceId, item.maintenance);
      } else {
        console.error("Invalid drop item received:", item);
        toast({
          title: "Error",
          description: "Could not process the dragged item. Please try again.",
          variant: "destructive"
        });
      }
      return { routeId: route.id };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
    canDrop: (item) => {
      console.log("Checking if item can be dropped:", item);
      return true;
    }
  }));
  
  // Handle maintenance drop
  const handleMaintenanceDrop = async (maintenanceId: number, maintenance: MaintenanceWithDetails) => {
    try {
      console.log(`Dropping maintenance ${maintenanceId} onto route ${route.id}`);
      
      const clientId = maintenance.client?.client?.id || (maintenance.client as any)?.id;
      if (!maintenance.client || !clientId) {
        console.error("Maintenance is missing client information");
        toast({
          title: "Missing Information",
          description: "This maintenance task doesn't have proper client information. Cannot assign to route.",
          variant: "destructive"
        });
        return;
      }
      
      const date = new Date(maintenance.scheduleDate);
      
      // Create the assignment
      await createAssignment({
        routeId: route.id,
        maintenanceId: maintenanceId,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        status: "scheduled",
        notes: null,
        maintenance: maintenance // Pass the maintenance object to help with route stop creation
      });
      
      console.log("Assignment created successfully");
      
      // Update the local state to immediately hide this maintenance
      try {
        console.log("Forcing immediate refresh of maintenance data");
        
        // Update the cached assignment status directly
        if (setMaintenanceAssignments) {
          setMaintenanceAssignments((prev: Record<number, boolean>) => ({
            ...prev,
            [maintenanceId]: true // Mark as assigned immediately in local state
          }));
          
          // Set this as the last assigned maintenance to ensure it's hidden
          (window as any).lastAssignedMaintenanceId = maintenanceId;
        }
        
        // Update the cached assignment status directly
        const maintenanceAssignmentsCache = queryClient.getQueryData<Record<number, boolean>>(['maintenanceAssignments']) || {};
        const updatedAssignments = { 
          ...maintenanceAssignmentsCache,
          [maintenanceId]: true // Mark this maintenance as assigned to a route
        };
        queryClient.setQueryData(['maintenanceAssignments'], updatedAssignments);
        
        // Also try to force a refresh of the maintenance data
        const updatedMaintenances = await apiRequest('/api/maintenances');
        queryClient.setQueryData(['/api/maintenances'], updatedMaintenances);
      } catch (refreshError) {
        console.error("Error updating assignment cache:", refreshError);
      }
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${route.id}/assignments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes/stops', route.id] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${route.id}`] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances'] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/assignments/maintenance/${maintenanceId}`] }); 
      
      if (route?.technicianId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/bazza/routes/technician/${route.technicianId}`] 
        });
      }
      
      setIsExpanded(true);
      
      toast({
        title: "Maintenance Added",
        description: `Added maintenance task to route "${route.name}".`
      });
    } catch (error) {
      console.error("Error dropping maintenance onto route:", error);
      
      // Provide more specific error message based on the type of error
      let errorMessage = "Failed to add maintenance to route. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("client") || error.message.includes("Client")) {
          errorMessage = "Client information is missing or invalid. Please check the client details.";
        } else if (error.message.includes("route stop")) {
          errorMessage = "Could not create a route stop. Make sure the route is properly configured.";
        } else if (error.message.includes("route") || error.message.includes("Route")) {
          errorMessage = "Route information is missing or invalid. Please check the route details.";
        } else if (error.message.includes("Foreign key")) {
          errorMessage = "Database constraint error. The client may not be assigned to this route.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  // Format day of week for display
  const formatDayOfWeek = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => (a.orderIndex ?? a.position ?? 0) - (b.orderIndex ?? b.position ?? 0));
  }, [stops]);
  
  return (
    <div ref={drop} className={`rounded-lg border transition-colors ${
      isOver ? 'border-primary border-2 bg-primary/5' : 'border-border'
    }`}>
      <Card 
        key={route.id} 
        className="border-0 shadow-none cursor-pointer hover:bg-accent/10 transition-colors"
        onClick={() => onRouteClick(route)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-1 p-0.5 rounded hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div>
                <CardTitle className="text-base">{route.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {formatDayOfWeek(route.dayOfWeek)}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${route.type === 'residential' 
                ? 'bg-sky-100 text-sky-800' 
                : route.type === 'commercial' 
                  ? 'bg-indigo-100 text-indigo-800' 
                  : 'bg-purple-100 text-purple-800'} hover:bg-opacity-80`}>
                {route.type.charAt(0).toUpperCase() + route.type.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}>
                {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <div className="text-sm flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Start time:</span>
              <span className="font-medium">{route.startTime || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>End time:</span>
              <span className="font-medium">{route.endTime || 'N/A'}</span>
            </div>
            {route.region && (
              <div className="flex justify-between">
                <span>Region:</span>
                <span className="font-medium">{route.region}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-1 pb-3">
          <div className="w-full">
            <div className="text-xs text-muted-foreground">
              {route.description || 'No description available'}
            </div>
            <div className="mt-2 flex justify-end">
              <Badge variant="outline" className="text-xs">
                <Route className="h-3 w-3 mr-1" />
                View Details
              </Badge>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50 bg-muted/30">
          <div className="pt-2 text-xs font-medium text-muted-foreground mb-2">
            Stops ({stops.length})
          </div>
          {isStopsLoading ? (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          ) : sortedStops.length > 0 ? (
            <div className="space-y-1.5">
              {sortedStops.map((stop, index) => (
                <div 
                  key={stop.id} 
                  className="flex items-start gap-2 p-2 bg-background rounded-md border border-border/50 text-xs"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {(stop.orderIndex ?? stop.position ?? index + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {clientMap[stop.clientId] || `Client #${stop.clientId}`}
                    </div>
                    {(stop.customInstructions || stop.notes) && (
                      <div className="text-muted-foreground truncate mt-0.5">
                        {stop.customInstructions || stop.notes}
                      </div>
                    )}
                    {stop.estimatedDuration && (
                      <div className="text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {stop.estimatedDuration} min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              No stops yet. Drag a maintenance card here to add one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TechnicianRoutesView({
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
  const [lastAssignedMaintenanceId, setLastAssignedMaintenanceId] = useState<number | null>(null);
  const [isAddingGlobal, setIsAddingGlobal] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignClientId, setBulkAssignClientId] = useState<string>("");
  const [bulkAssignRouteId, setBulkAssignRouteId] = useState<string>("");

  const { data: clientsList } = useQuery<{ id: number; name: string; companyName?: string }[]>({
    queryKey: ["/api/clients"],
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: { clientId: number; routeId: number }) =>
      apiRequest("POST", "/api/dispatch/bulk-assign-client-stops", data),
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/bazza/routes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bazza/routes/technician"] });
      toast({
        title: "Stops Assigned",
        description: result.message || `Successfully assigned stops to route.`,
      });
      setBulkAssignOpen(false);
      setBulkAssignClientId("");
      setBulkAssignRouteId("");
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Could not assign stops to route.",
        variant: "destructive",
      });
    },
  });

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
  
  // Sync with the window global state for lastAssignedMaintenanceId 
  useEffect(() => {
    const globalLastAssigned = (window as any).lastAssignedMaintenanceId;
    if (globalLastAssigned && globalLastAssigned !== lastAssignedMaintenanceId) {
      setLastAssignedMaintenanceId(globalLastAssigned);
      setMaintenanceAssignments(prev => ({
        ...prev,
        [globalLastAssigned]: true
      }));
    }
  }, [lastAssignedMaintenanceId]);
  
  // Query all routes (used when no technician selected)
  const { routes: allRoutes, isRoutesLoading: allRoutesLoading, routesError: allRoutesError } = useBazzaRoutes();
  // Query routes for selected technician
  const { technicianRoutes, isTechnicianRoutesLoading, technicianRoutesError } = useBazzaRoutesByTechnician(selectedTechnicianId);

  const routes = selectedTechnicianId ? technicianRoutes : allRoutes;
  const isRoutesLoading = selectedTechnicianId ? isTechnicianRoutesLoading : allRoutesLoading;
  const routesError = selectedTechnicianId ? technicianRoutesError : allRoutesError;
  
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
      // Skip if this is the last assigned maintenance
      if (lastAssignedMaintenanceId === maintenance.id) return false;
      // Otherwise, keep it
      return true;
    });
  }, [maintenances, maintenanceAssignments, lastAssignedMaintenanceId]);
  
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
  
  // Handle "Add All" button click
  const handleAddAll = async () => {
    if (unassignedMaintenances.length === 0 || filteredRoutes.length === 0) return;
    
    setIsAddingGlobal(true);
    
    try {
      // For each unassigned maintenance, add to the first filtered route
      for (const maintenance of unassignedMaintenances) {
        const route = filteredRoutes[0];
        const date = new Date(maintenance.scheduleDate);
        
        const clientId = (maintenance.client as any)?.client?.id || (maintenance.client as any)?.id;
        if (!maintenance.client || !clientId) {
          console.error(`Maintenance ${maintenance.id} is missing client information, skipping`);
          continue;
        }
        
        try {
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
          
          // Set as the last assigned maintenance
          setLastAssignedMaintenanceId(maintenance.id);
          (window as any).lastAssignedMaintenanceId = maintenance.id;
        } catch (error) {
          console.error(`Error adding maintenance ${maintenance.id} to route ${route.id}:`, error);
        }
      }
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances'] });
      
      if (selectedTechnicianId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/bazza/routes/technician/${selectedTechnicianId}`] 
        });
      }
      
      toast({
        title: "Bulk Assignment Complete",
        description: `Added ${unassignedMaintenances.length} maintenance tasks to the route.`
      });
    } catch (error) {
      console.error("Error in bulk assignment:", error);
      toast({
        title: "Error",
        description: "There was an error adding all maintenances to the route. Some may have been added successfully.",
        variant: "destructive"
      });
    } finally {
      setIsAddingGlobal(false);
    }
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <MaintenanceAssignmentsContext.Provider value={setMaintenanceAssignments}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
          <div className="mb-4">
            <Label htmlFor="technician-select">Technician</Label>
            <Select 
              value={selectedTechnicianId ? String(selectedTechnicianId) : 'all'} 
              onValueChange={handleTechnicianSelect}
            >
              <SelectTrigger id="technician-select">
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians && technicians.length > 0 ? (
                  technicians.map(technician => (
                    <SelectItem key={technician.id} value={String(technician.id)}>
                      {technician.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>No technicians available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-6">
            <Label htmlFor="day-select">Day</Label>
            <Select 
              value={selectedDay} 
              onValueChange={handleDayChange}
            >
              <SelectTrigger id="day-select">
                <SelectValue placeholder="Select a day" />
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
            
            {filteredRoutes.length > 0 && unassignedMaintenances.length > 0 && (
              <Button 
                onClick={handleAddAll} 
                variant="outline" 
                size="sm"
                disabled={isAddingGlobal}
              >
                {isAddingGlobal ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add All to First Route
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={() => setBulkAssignOpen(true)} 
              variant="outline" 
              size="sm"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Assign Client Stops
            </Button>
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
                  <DroppableRouteCard 
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
              Drag maintenance tasks onto routes to assign them
            </p>
          </div>
          
          {unassignedMaintenances.length > 0 ? (
            <ScrollArea className="h-[600px] rounded-md border">
              <div className="p-4 grid grid-cols-1 gap-4">
                {unassignedMaintenances.map(maintenance => (
                  <MaintenanceCard
                    key={maintenance.id}
                    maintenance={maintenance}
                    availableRoutes={filteredRoutes}
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
      </MaintenanceAssignmentsContext.Provider>
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign All Client Stops</DialogTitle>
            <DialogDescription>
              Assign all scheduled maintenance jobs for a client to a route.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={bulkAssignClientId} onValueChange={setBulkAssignClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {(clientsList || []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name || c.companyName || `Client #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={bulkAssignRouteId} onValueChange={setBulkAssignRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a route..." />
                </SelectTrigger>
                <SelectContent>
                  {(routes || []).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.dayOfWeek})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bulkAssignClientId || !bulkAssignRouteId) {
                  toast({ title: "Select Both", description: "Please select both a client and a route.", variant: "destructive" });
                  return;
                }
                bulkAssignMutation.mutate({
                  clientId: Number(bulkAssignClientId),
                  routeId: Number(bulkAssignRouteId),
                });
              }}
              disabled={bulkAssignMutation.isPending}
            >
              {bulkAssignMutation.isPending ? "Assigning..." : "Assign All Stops"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}