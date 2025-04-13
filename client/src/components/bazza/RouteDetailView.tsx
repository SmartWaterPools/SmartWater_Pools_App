import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { BazzaRoute, BazzaRouteStop, MaintenanceWithDetails } from "../../lib/types";
import { fetchRouteStops, updateBazzaRoute, deleteRouteStop, reorderRouteStops } from "../../services/bazzaService";
import { useQuery, useMutation, useQueryClient } from '../../lib/queryClient';

// Icons
import { ArrowLeft, Calendar, Clock, Edit, MapPin, Trash, User, DragVertical, Save } from 'lucide-react';

type RouteDetailViewProps = {
  route: BazzaRoute;
  onBack: () => void;
  onEdit: (route: BazzaRoute) => void;
  onDelete: (routeId: number) => void;
  technicians: { id: number; name: string }[];
  clients: { id: number; name: string }[];
};

export function RouteDetailView({
  route,
  onBack,
  onEdit,
  onDelete,
  technicians,
  clients
}: RouteDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for dialogs
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<BazzaRouteStop | null>(null);
  const [isEditModeActive, setIsEditModeActive] = useState(false);
  const [reorderedStops, setReorderedStops] = useState<BazzaRouteStop[]>([]);
  
  // Format time
  const formatTime = (time: string | null) => {
    if (!time) return 'Flexible';
    try {
      // Time is in HH:MM format
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return time;
    }
  };
  
  // Get day color
  const getDayColor = (day: string) => {
    const dayColors: Record<string, string> = {
      'monday': 'bg-blue-100 text-blue-800',
      'tuesday': 'bg-green-100 text-green-800',
      'wednesday': 'bg-purple-100 text-purple-800',
      'thursday': 'bg-orange-100 text-orange-800',
      'friday': 'bg-red-100 text-red-800',
      'saturday': 'bg-teal-100 text-teal-800',
      'sunday': 'bg-indigo-100 text-indigo-800'
    };
    
    return dayColors[day.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };
  
  // Get technician name
  const getTechnicianName = (technicianId: number | null) => {
    if (!technicianId) return 'Unassigned';
    const technician = technicians.find(t => t.id === technicianId);
    return technician ? technician.name : 'Unknown Technician';
  };
  
  // Get client name
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };
  
  // Query for route stops
  const { 
    data: stops, 
    isLoading: isStopsLoading, 
    error: stopsError 
  } = useQuery({
    queryKey: ['/api/bazza/routes', route.id, 'stops'],
    queryFn: () => fetchRouteStops(route.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Start reordering mode
  const handleStartReordering = () => {
    if (stops) {
      setReorderedStops([...stops]);
      setIsEditModeActive(true);
    }
  };
  
  // Save reordered stops
  const reorderMutation = useMutation({
    mutationFn: ({ routeId, stopIds }: { routeId: number, stopIds: number[] }) => 
      reorderRouteStops(routeId, stopIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes', route.id, 'stops'] });
      toast({
        title: 'Stops reordered',
        description: 'The route stops have been successfully reordered.',
      });
      setIsEditModeActive(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to reorder stops: ${(error as Error).message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Save reordered stops
  const handleSaveReordering = () => {
    if (reorderedStops.length > 0) {
      const stopIds = reorderedStops.map(stop => stop.id);
      reorderMutation.mutate({ routeId: route.id, stopIds });
    }
  };
  
  // Move stop up or down in order
  const moveStop = (index: number, direction: 'up' | 'down') => {
    if (!reorderedStops) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= reorderedStops.length) return;
    
    const newStops = [...reorderedStops];
    const temp = newStops[index];
    newStops[index] = newStops[newIndex];
    newStops[newIndex] = temp;
    
    // Update positions
    newStops.forEach((stop, i) => {
      stop.position = i + 1;
    });
    
    setReorderedStops(newStops);
  };
  
  // Delete stop mutation
  const deleteStopMutation = useMutation({
    mutationFn: (stopId: number) => deleteRouteStop(stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes', route.id, 'stops'] });
      toast({
        title: 'Stop removed',
        description: 'The stop has been successfully removed from the route.',
      });
      setSelectedStop(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove stop: ${(error as Error).message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle stop deletion
  const handleDeleteStop = () => {
    if (selectedStop) {
      deleteStopMutation.mutate(selectedStop.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Routes
        </Button>
        <h2 className="text-2xl font-bold grow">{route.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(route)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit Route
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Route Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Day of Week</h3>
                <Badge className={getDayColor(route.dayOfWeek)}>
                  {route.dayOfWeek}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Time</h3>
                <p className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  {route.startTime ? (
                    <>
                      {formatTime(route.startTime)}
                      {route.endTime ? ` - ${formatTime(route.endTime)}` : ''}
                    </>
                  ) : (
                    'Flexible timing'
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Technician</h3>
                <p className="flex items-center">
                  <User className="h-4 w-4 mr-1 text-muted-foreground" />
                  {getTechnicianName(route.technicianId)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge variant={route.isActive ? "default" : "secondary"}>
                  {route.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              {route.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="text-sm">{route.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Route Stops</CardTitle>
                <CardDescription>
                  {isStopsLoading ? 'Loading stops...' : 
                   stops?.length ? `${stops.length} stops on this route` : 'No stops on this route'}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                {isEditModeActive ? (
                  <Button onClick={handleSaveReordering}>
                    <Save className="h-4 w-4 mr-1" />
                    Save Order
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleStartReordering}>
                    <DragVertical className="h-4 w-4 mr-1" />
                    Reorder Stops
                  </Button>
                )}
                <Button variant="outline">
                  <MapPin className="h-4 w-4 mr-1" />
                  Add Stop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isStopsLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Spinner size="lg" />
                  <span className="ml-2">Loading stops...</span>
                </div>
              ) : stopsError ? (
                <div className="text-red-500 p-4">
                  Error loading stops: {(stopsError as Error).message}
                </div>
              ) : (!stops || stops.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  No stops have been added to this route yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isEditModeActive && <TableHead className="w-[80px]">Actions</TableHead>}
                      <TableHead className="w-[60px]">Order</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Est. Duration</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditModeActive ? reorderedStops : stops).map((stop, index) => (
                      <TableRow key={stop.id}>
                        {isEditModeActive && (
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => moveStop(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                ↑
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => moveStop(index, 'down')}
                                disabled={index === reorderedStops.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                ↓
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{stop.position}</TableCell>
                        <TableCell>{getClientName(stop.clientId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>Client Location</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {stop.estimatedDuration ? `${stop.estimatedDuration} min` : 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {stop.notes || 'No notes'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {/* Edit stop */}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              onClick={() => {
                                setSelectedStop(stop);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Route Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStop ? 'Delete Route Stop' : 'Delete Route'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStop 
                ? `Are you sure you want to remove this stop from the route? This action cannot be undone.`
                : `Are you sure you want to delete this route? This will remove all stops and assignments associated with this route and cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedStop(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedStop) {
                  handleDeleteStop();
                } else {
                  onDelete(route.id);
                }
                setIsDeleteDialogOpen(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {selectedStop ? 'Delete Stop' : 'Delete Route'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RouteDetailView;