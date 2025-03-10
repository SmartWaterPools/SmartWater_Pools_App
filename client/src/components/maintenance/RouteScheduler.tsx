/**
 * RouteScheduler Component
 * 
 * This component manages service routes for pool maintenance.
 * NOTE: "Routes" in this context refers to the scheduled paths that technicians follow
 * to service multiple pools, NOT to be confused with API routes/endpoints.
 * 
 * A service route represents a sequence of client properties that a technician
 * visits on a particular day of the week.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Map,
  Users,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Plus,
  RefreshCw,
  X,
  Edit,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceWithDetails } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS } from "@/lib/constants";

// Type definitions for our API data
interface Route {
  id: number;
  name: string;
  type: string;
  dayOfWeek: string;
  technicianId: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RouteAssignment {
  id: number;
  routeId: number;
  maintenanceId: number;
  orderIndex: number;
  estimatedDuration: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Technician {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
  };
}

interface RouteWithAssignments extends Route {
  assignments: (RouteAssignment & {
    maintenance: MaintenanceWithDetails;
  })[];
}

export function RouteScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithAssignments | null>(null);
  const [showNewRouteForm, setShowNewRouteForm] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteType, setNewRouteType] = useState("residential");
  const [newRouteDescription, setNewRouteDescription] = useState("");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  // Get days of the week for the dropdown
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Fetch service routes (physical paths for technicians, not API endpoints)
  const { data: routes, isLoading: routesLoading } = useQuery<RouteWithAssignments[]>({
    queryKey: [API_ENDPOINTS.POOL_ROUTES],
  });

  // Fetch technicians
  const { data: technicians, isLoading: techniciansLoading } = useQuery<Technician[]>({
    queryKey: [API_ENDPOINTS.TECHNICIANS],
  });

  // Fetch maintenances for potential assignment
  const { data: maintenances, isLoading: maintenancesLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: [API_ENDPOINTS.MAINTENANCES],
  });

  // Filter routes by selected day and technician
  const filteredRoutes = routes?.filter((route) => {
    if (selectedDay && route.dayOfWeek !== selectedDay) {
      return false;
    }
    if (selectedTechnician && selectedTechnician !== "all" && route.technicianId !== parseInt(selectedTechnician)) {
      return false;
    }
    return true;
  });

  // Get available maintenances for assignment
  const availableMaintenances = maintenances?.filter((maintenance) => {
    // Filter out maintenances that are already assigned to this route
    if (selectedRoute) {
      const isAssigned = selectedRoute.assignments.some(
        (assignment) => assignment.maintenanceId === maintenance.id
      );
      if (isAssigned) return false;
    }
    
    // Only include scheduled or in_progress maintenances
    return ["scheduled", "in_progress"].includes(maintenance.status);
  });

  // Create service route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (newRoute: { name: string; type: string; dayOfWeek: string; technicianId: number; description: string }) => {
      return await apiRequest(API_ENDPOINTS.POOL_ROUTES, "POST", newRoute);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POOL_ROUTES] });
      toast({
        title: "Route created",
        description: "The service route has been created successfully.",
      });
      setShowNewRouteForm(false);
      setNewRouteName("");
      setNewRouteType("residential");
      setNewRouteDescription("");
    },
    onError: (error) => {
      toast({
        title: "Failed to create route",
        description: "There was an error creating the service route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete service route mutation
  const deleteRouteMutation = useMutation({
    mutationFn: async (routeId: number) => {
      return await apiRequest(API_ENDPOINTS.POOL_ROUTE_DETAILS(routeId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POOL_ROUTES] });
      toast({
        title: "Service route deleted",
        description: "The service route has been deleted successfully.",
      });
      setSelectedRoute(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete service route",
        description: "There was an error deleting the service route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add route assignment mutation
  const addAssignmentMutation = useMutation({
    mutationFn: async ({ routeId, maintenanceId, orderIndex }: { routeId: number; maintenanceId: number; orderIndex: number }) => {
      return await apiRequest(API_ENDPOINTS.POOL_ROUTE_ASSIGNMENTS, "POST", {
        routeId,
        maintenanceId,
        orderIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POOL_ROUTES] });
      toast({
        title: "Maintenance assigned",
        description: "The maintenance has been assigned to the service route successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to assign maintenance",
        description: "There was an error assigning the maintenance to the service route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove route assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return await apiRequest(API_ENDPOINTS.POOL_ROUTE_ASSIGNMENT(assignmentId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POOL_ROUTES] });
      toast({
        title: "Maintenance removed",
        description: "The maintenance has been removed from the service route successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove maintenance",
        description: "There was an error removing the maintenance from the service route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reorder assignments mutation
  const reorderAssignmentsMutation = useMutation({
    mutationFn: async ({ routeId, assignmentIds }: { routeId: number; assignmentIds: number[] }) => {
      return await apiRequest(API_ENDPOINTS.REORDER_POOL_ROUTE(routeId), "POST", {
        assignmentIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POOL_ROUTES] });
      toast({
        title: "Route reordered",
        description: "The route order has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to reorder route",
        description: "There was an error reordering the route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle drag and drop reordering
  const handleDragStart = (position: number) => {
    setDragItem(position);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    setDragOverItem(position);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (dragItem === null || dragOverItem === null || !selectedRoute) return;
    
    // Make a copy of the assignments
    const assignments = [...selectedRoute.assignments];
    const draggedItem = assignments[dragItem];
    
    // Remove the dragged item
    assignments.splice(dragItem, 1);
    
    // Add it at the new position
    assignments.splice(dragOverItem, 0, draggedItem);
    
    // Update the route order
    reorderAssignmentsMutation.mutate({
      routeId: selectedRoute.id,
      assignmentIds: assignments.map((assignment) => assignment.id),
    });
    
    // Reset drag state
    setDragItem(null);
    setDragOverItem(null);
  };

  // Handle route creation
  const handleCreateRoute = () => {
    if (!newRouteName || !selectedTechnician || selectedTechnician === "all") {
      toast({
        title: "Missing information",
        description: "Please provide a route name and select a specific technician.",
        variant: "destructive",
      });
      return;
    }

    createRouteMutation.mutate({
      name: newRouteName,
      type: newRouteType,
      dayOfWeek: selectedDay,
      technicianId: parseInt(selectedTechnician),
      description: newRouteDescription,
    });
  };

  // Handle route deletion
  const handleDeleteRoute = (routeId: number) => {
    if (confirm("Are you sure you want to delete this route? All assignments will be removed.")) {
      deleteRouteMutation.mutate(routeId);
    }
  };

  // Handle assignment to route
  const handleAssignMaintenance = (maintenanceId: number) => {
    if (!selectedRoute) return;
    
    addAssignmentMutation.mutate({
      routeId: selectedRoute.id,
      maintenanceId,
      orderIndex: selectedRoute.assignments.length,
    });
  };

  // Handle removal from route
  const handleRemoveAssignment = (assignmentId: number) => {
    removeAssignmentMutation.mutate(assignmentId);
  };

  // Format route type for display
  const formatRouteType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Format the maintenance type for display
  const formatMaintenanceType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold">Route Scheduling</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {daysOfWeek.map((day) => (
                <SelectItem key={day} value={day}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedTechnician || "all"}
            onValueChange={setSelectedTechnician}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians?.map((tech) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>
                  {tech.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={() => setShowNewRouteForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Route
          </Button>
        </div>
      </div>

      {/* New Route Form */}
      {showNewRouteForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create New Route</CardTitle>
            <CardDescription>Create a new route for a technician's schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Name</label>
                  <Input
                    placeholder="E.g., North District AM"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Type</label>
                  <Select value={newRouteType} onValueChange={setNewRouteType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Day of Week</label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Technician</label>
                  <Select
                    value={selectedTechnician || "all"}
                    onValueChange={setSelectedTechnician}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technicians</SelectItem>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="Brief description of this route"
                  value={newRouteDescription}
                  onChange={(e) => setNewRouteDescription(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewRouteForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateRoute}
                  disabled={createRouteMutation.isPending}
                >
                  {createRouteMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Route
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routes Listing */}
      {routesLoading || techniciansLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-36 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRoutes && filteredRoutes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRoutes.map((route) => {
            const technicianName = technicians?.find(
              (tech) => tech.id === route.technicianId
            )?.user.name || "Unknown Technician";
            
            const isSelected = selectedRoute?.id === route.id;
            
            return (
              <Card 
                key={route.id}
                className={`${isSelected ? "border-primary" : ""} transition-all hover:shadow-md`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{route.name}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="flex items-center">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                          {route.dayOfWeek.charAt(0).toUpperCase() + route.dayOfWeek.slice(1)}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-3.5 w-3.5 mr-1" />
                          {technicianName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatRouteType(route.type)}
                        </Badge>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSelectedRoute(isSelected ? null : route)}
                        >
                          {isSelected ? "Hide Details" : "View Details"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {/* Edit route implementation */}}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Route
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Route
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {route.assignments && route.assignments.length > 0 ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            {route.assignments.length} Properties
                          </span>
                          {isSelected && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSelectedRoute(null)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Close
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {isSelected ? (
                            // Show full list when selected
                            <div className="space-y-2">
                              {route.assignments
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((assignment, index) => (
                                  <div
                                    key={assignment.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={handleDrop}
                                    className={`
                                      flex items-center justify-between p-2 border rounded-md
                                      ${dragOverItem === index ? "border-primary bg-primary/5" : ""}
                                      ${assignment.maintenance.status === "completed" ? "bg-green-50/30" : ""}
                                      cursor-move
                                    `}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium w-6 text-center text-muted-foreground">
                                        {index + 1}
                                      </span>
                                      <div>
                                        <div className="font-medium">
                                          {assignment.maintenance.client.user.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatMaintenanceType(assignment.maintenance.type)}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleRemoveAssignment(assignment.id)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                                
                              {/* Available maintenances to add */}
                              {availableMaintenances && availableMaintenances.length > 0 && (
                                <div className="pt-2 border-t mt-4">
                                  <h4 className="text-sm font-medium mb-2">Add to Route</h4>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {availableMaintenances.map((maintenance) => (
                                      <div
                                        key={maintenance.id}
                                        className="flex items-center justify-between p-2 border rounded-md"
                                      >
                                        <div>
                                          <div className="font-medium">
                                            {maintenance.client.user.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatMaintenanceType(maintenance.type)}
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7"
                                          onClick={() => handleAssignMaintenance(maintenance.id)}
                                        >
                                          <Plus className="h-3.5 w-3.5 mr-1" />
                                          Add
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Show just a preview when not selected
                            <div>
                              {route.assignments
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .slice(0, 3)
                                .map((assignment, index) => (
                                  <div
                                    key={assignment.id}
                                    className={`
                                      p-2 border rounded-md
                                      ${assignment.maintenance.status === "completed" ? "bg-green-50/30" : ""}
                                    `}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium w-6 text-center text-muted-foreground">
                                          {index + 1}
                                        </span>
                                        <div>
                                          <div className="font-medium">
                                            {assignment.maintenance.client.user.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatMaintenanceType(assignment.maintenance.type)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              
                              {route.assignments.length > 3 && (
                                <div className="text-center mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setSelectedRoute(route)}
                                  >
                                    +{route.assignments.length - 3} more
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        <ClipboardList className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p>No properties assigned to this route</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setSelectedRoute(route)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Properties
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-muted-foreground">
              No routes found for the selected day and technician.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}