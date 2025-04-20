import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Edit, 
  MapPin, 
  MoreHorizontal, 
  Plus, 
  Route, 
  Trash, 
  User 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { fetchRouteStops } from "../../services/bazzaService";
import { useQuery } from "@tanstack/react-query";
import { BazzaRoute, BazzaRouteStop } from "../../lib/types";
import { StopFormDialog } from "./StopFormDialog";

type RouteDetailViewProps = {
  route: BazzaRoute;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddStop?: () => void;
  isDeleting?: boolean;
};

export function RouteDetailView({ 
  route, 
  onBack, 
  onEdit, 
  onDelete, 
  onAddStop = () => {}, 
  isDeleting 
}: RouteDetailViewProps) {
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  // Fetch route stops
  const { 
    data: stops = [], 
    isLoading: isStopsLoading, 
    error: stopsError 
  } = useQuery({
    queryKey: ['/api/bazza/routes', route.id, 'stops'],
    queryFn: async () => {
      try {
        return await fetchRouteStops(route.id);
      } catch (error) {
        console.error(`Error fetching stops for route ${route.id}`, error);
        throw error;
      }
    }
  });
  
  // Fetch client details for each stop
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: stops.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Routes
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isDeleting}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Route
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash className="h-4 w-4 mr-2" />
                Delete Route
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{route.name}</CardTitle>
              <CardDescription>
                <span className="capitalize mt-1">{route.dayOfWeek}</span>
              </CardDescription>
            </div>
            <Badge variant={route.active ? "default" : "outline"}>
              {route.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>{route.startTime} - {route.endTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Region:</span>
                <span>{route.region || 'No region specified'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Technician:</span>
                <span>
                  {route.technicianId ? `Technician #${route.technicianId}` : 'Not assigned'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created:</span>
                <span>
                  {route.createdAt ? new Date(route.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Route Stops</h3>
            
            {isStopsLoading ? (
              <div className="flex justify-center items-center py-10">
                <Spinner size="lg" />
              </div>
            ) : stopsError ? (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load route stops. Please try again.
                </AlertDescription>
              </Alert>
            ) : stops.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Route className="h-10 w-10 mx-auto mb-4 opacity-30" />
                <p>No stops have been added to this route yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsStopDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stop
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stops.map((stop) => {
                    // Find client information
                    const client = Array.isArray(clients) ? 
                      clients.find((c: any) => c.id === stop.clientId || c.client?.id === stop.clientId) : null;
                    
                    // Get client name
                    const clientName = client ? 
                      (client.user?.name || client.name || `Client #${stop.clientId}`) : 
                      `Client #${stop.clientId}`;
                    
                    // Get client address
                    const clientAddress = client ? 
                      (client.user?.address || client.address || 
                       client.client?.address || '-') : 
                      '-';
                      
                    return (
                      <TableRow key={stop.id}>
                        <TableCell>{stop.position}</TableCell>
                        <TableCell>{clientName}</TableCell>
                        <TableCell>{clientAddress}</TableCell>
                        <TableCell>{stop.notes || 'No notes'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="ml-auto" 
            variant="outline"
            onClick={() => setIsStopDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stop
          </Button>
        </CardFooter>
      </Card>
    </div>
    
    {/* Stop Form Dialog */}
    {isStopDialogOpen && (
      <StopFormDialog
        isOpen={isStopDialogOpen}
        onClose={() => setIsStopDialogOpen(false)}
        onSuccess={() => {
          setIsStopDialogOpen(false);
          // Optionally call the parent's onAddStop if needed
          onAddStop();
        }}
        route={route}
      />
    )}
  );
}