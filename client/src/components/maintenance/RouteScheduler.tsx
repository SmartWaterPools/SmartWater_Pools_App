import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash, 
  ArrowUpDown, 
  ChevronDown, 
  Calendar, 
  User,
  Home,
  Building,
  Clock,
  MoreHorizontal,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ROUTE_TYPES } from '@/lib/constants';

interface Route {
  id: number;
  name: string;
  technicianId: number;
  dayOfWeek: string;
  type: string;
  description: string | null;
  maxCapacity: number | null;
  estimatedTimeMinutes: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  technician?: {
    id: number;
    user: {
      id: number;
      name: string;
    };
  };
  assignments?: RouteAssignment[];
}

interface RouteAssignment {
  id: number;
  routeId: number;
  maintenanceId: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  maintenance?: {
    id: number;
    clientId: number;
    scheduleDate: string;
    type: string;
    status: string;
    client?: {
      id: number;
      user: {
        id: number;
        name: string;
      };
      address?: string;
      latitude?: number;
      longitude?: number;
    };
  };
}

interface DayOfWeek {
  value: string;
  label: string;
}

export function RouteScheduler() {
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [newRoute, setNewRoute] = useState({
    name: '',
    technicianId: '',
    dayOfWeek: '',
    type: 'residential',
    description: '',
    maxCapacity: '',
    estimatedTimeMinutes: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Days of week for filtering
  const daysOfWeek: DayOfWeek[] = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  // Define types for query data
  interface Technician {
    id: number;
    user: {
      id: number;
      name: string;
    };
  }

  // Fetch technicians
  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<Technician[]>({
    queryKey: ['/api/technicians'],
  });

  // Fetch routes
  const { data: routes, isLoading: isLoadingRoutes } = useQuery<Route[]>({
    queryKey: ['/api/service-routes'],
  });

  // Mutation to create a new route
  const createRouteMutation = useMutation({
    mutationFn: async (routeData: any) => {
      return apiRequest('/api/routes', 'POST', routeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-routes'] });
      toast({
        title: 'Route created',
        description: 'The route has been created successfully.',
      });
      setRouteDialogOpen(false);
      resetNewRouteForm();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create route',
        description: 'There was an error creating the route. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete a route
  const deleteRouteMutation = useMutation({
    mutationFn: async (routeId: number) => {
      return apiRequest(`/api/routes/${routeId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-routes'] });
      toast({
        title: 'Route deleted',
        description: 'The route has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete route',
        description: 'There was an error deleting the route. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter routes based on day, technician, and type
  const filteredRoutes = React.useMemo(() => {
    if (!routes) return [];
    
    return routes.filter((route: Route) => {
      if (dayFilter !== 'all' && route.dayOfWeek !== dayFilter) return false;
      if (technicianFilter && route.technicianId !== technicianFilter) return false;
      if (typeFilter !== 'all' && route.type !== typeFilter) return false;
      return true;
    });
  }, [routes, dayFilter, technicianFilter, typeFilter]);

  // Handle input change for new route form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewRoute(prev => ({ ...prev, [name]: value }));
  };

  // Handle create route
  const handleCreateRoute = () => {
    const routeData = {
      name: newRoute.name,
      technicianId: parseInt(newRoute.technicianId),
      dayOfWeek: newRoute.dayOfWeek,
      type: newRoute.type,
      description: newRoute.description || null,
      maxCapacity: newRoute.maxCapacity ? parseInt(newRoute.maxCapacity) : null,
      estimatedTimeMinutes: newRoute.estimatedTimeMinutes ? parseInt(newRoute.estimatedTimeMinutes) : null,
      status: 'active'
    };

    createRouteMutation.mutate(routeData);
  };

  // Handle delete route
  const handleDeleteRoute = (routeId: number) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      deleteRouteMutation.mutate(routeId);
    }
  };

  // Reset new route form
  const resetNewRouteForm = () => {
    setNewRoute({
      name: '',
      technicianId: '',
      dayOfWeek: '',
      type: 'residential',
      description: '',
      maxCapacity: '',
      estimatedTimeMinutes: ''
    });
  };

  // Format route type for display
  const formatRouteType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Format day of week for display
  const formatDayOfWeek = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  if (isLoadingRoutes || isLoadingTechnicians) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold">Service Routes</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {daysOfWeek.map((day) => (
                <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={technicianFilter ? technicianFilter.toString() : "all"} 
            onValueChange={(val) => setTechnicianFilter(val === "all" ? null : parseInt(val))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians && technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>{tech.user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ROUTE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{formatRouteType(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                <Plus className="h-4 w-4 mr-1" />
                Create Route
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Route</DialogTitle>
                <DialogDescription>
                  Define a new service route for your technicians.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Route Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newRoute.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Monday North Route"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="technicianId">Assign Technician</Label>
                  <Select name="technicianId" value={newRoute.technicianId} onValueChange={(val) => setNewRoute(prev => ({ ...prev, technicianId: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians && technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>{tech.user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select name="dayOfWeek" value={newRoute.dayOfWeek} onValueChange={(val) => setNewRoute(prev => ({ ...prev, dayOfWeek: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Route Type</Label>
                  <Select name="type" value={newRoute.type} onValueChange={(val) => setNewRoute(prev => ({ ...prev, type: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{formatRouteType(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    value={newRoute.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the route"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="maxCapacity">Max Capacity (optional)</Label>
                    <Input
                      id="maxCapacity"
                      name="maxCapacity"
                      type="number"
                      value={newRoute.maxCapacity}
                      onChange={handleInputChange}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estimatedTimeMinutes">Est. Time (min)</Label>
                    <Input
                      id="estimatedTimeMinutes"
                      name="estimatedTimeMinutes"
                      type="number"
                      value={newRoute.estimatedTimeMinutes}
                      onChange={handleInputChange}
                      placeholder="e.g., 240"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRouteDialogOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  onClick={handleCreateRoute}
                  disabled={!newRoute.name || !newRoute.technicianId || !newRoute.dayOfWeek || !newRoute.type || createRouteMutation.isPending}
                >
                  {createRouteMutation.isPending ? 'Creating...' : 'Create Route'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredRoutes.length === 0 ? (
        <div className="flex items-center justify-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No routes found</h3>
            <p className="text-muted-foreground mb-4">
              {dayFilter !== 'all' || technicianFilter || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more routes.'
                : 'Create your first service route to start organizing maintenance visits.'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setDayFilter('all');
                setTechnicianFilter(null);
                setTypeFilter('all');
              }}
              className="mr-2"
            >
              Clear Filters
            </Button>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-medium" onClick={() => setRouteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Route
              </Button>
            </DialogTrigger>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRoutes.map((route: Route) => (
            <Card key={route.id} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{route.name}</CardTitle>
                    <CardDescription className="text-sm flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDayOfWeek(route.dayOfWeek)}
                      <Badge className="ml-2" variant="outline">
                        {formatRouteType(route.type)}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {route.technician?.user?.name || 'Unassigned'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Route Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteRoute(route.id)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete Route
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                {route.description && (
                  <p className="text-sm text-muted-foreground mb-4">{route.description}</p>
                )}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Stops</p>
                    <p className="text-lg font-semibold">{route.assignments?.length || 0}</p>
                  </div>
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Max Capacity</p>
                    <p className="text-lg font-semibold">{route.maxCapacity || '∞'}</p>
                  </div>
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Est. Time</p>
                    <p className="text-lg font-semibold">{route.estimatedTimeMinutes ? `${route.estimatedTimeMinutes} min` : 'N/A'}</p>
                  </div>
                </div>
                <div className="border rounded-md">
                  <div className="bg-muted p-2 flex justify-between items-center">
                    <span className="text-sm font-medium">Assigned Locations</span>
                    <Button variant="ghost" size="sm">
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      Reorder
                    </Button>
                  </div>
                  <div className="divide-y">
                    {route.assignments && route.assignments.length > 0 ? (
                      route.assignments
                        .sort((a, b) => a.order - b.order)
                        .map((assignment) => (
                          <div key={assignment.id} className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                {assignment.order}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {assignment.maintenance?.client?.user?.name || 'Unknown Client'}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {assignment.maintenance?.client?.address || 'No address'}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">No locations assigned to this route.</p>
                        <Button variant="outline" size="sm" className="mt-3">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Location
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="outline" size="sm" className="mr-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stop
                </Button>
                <Button size="sm">View Map</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default RouteScheduler;