import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LinkIcon, Unlink, Search, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TechnicianWithLocation } from '../types/fleetmatics';

interface FleetmaticsVehicle {
  vehicleId: string;
  name: string;
  registration?: string;
  make?: string;
  model?: string;
  vin?: string;
  status?: string;
}

export default function VehicleMapping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTechVehicle, setSelectedTechVehicle] = useState<number | null>(null);
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<string | null>(null);
  
  // Query to get technician vehicles
  const {
    data: techVehicles,
    isLoading: isLoadingTechVehicles,
    error: techVehiclesError
  } = useQuery({
    queryKey: ['/api/technician-vehicles'],
  });
  
  // Query to get Fleetmatics vehicles
  const {
    data: fleetVehicles,
    isLoading: isLoadingFleetVehicles,
    error: fleetVehiclesError,
    refetch: refetchFleetVehicles
  } = useQuery({
    queryKey: ['/api/fleetmatics/vehicles'],
  });
  
  // Mutation to map a vehicle
  const {
    mutate: mapVehicle,
    isPending: isMapping,
  } = useMutation({
    mutationFn: async () => {
      if (!selectedTechVehicle || !selectedFleetVehicle) {
        throw new Error('Please select both a technician vehicle and a Fleetmatics vehicle');
      }
      
      return apiRequest('/api/fleetmatics/map-vehicle', 'POST', {
        technicianVehicleId: selectedTechVehicle,
        fleetmaticsVehicleId: selectedFleetVehicle
      });
    },
    onSuccess: () => {
      toast({
        title: "Vehicles mapped successfully",
        description: "The technician vehicle has been mapped to the Fleetmatics vehicle.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/technician-vehicles'] });
      setSelectedTechVehicle(null);
      setSelectedFleetVehicle(null);
    },
    onError: (error) => {
      toast({
        title: "Error mapping vehicles",
        description: error.message || "An error occurred while mapping the vehicles.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to unmap a vehicle
  const {
    mutate: unmapVehicle,
    isPending: isUnmapping,
  } = useMutation({
    mutationFn: async (vehicleId: number) => {
      return apiRequest(`/api/fleetmatics/unmap-vehicle/${vehicleId}`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Vehicle unmapped",
        description: "The vehicle mapping has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/technician-vehicles'] });
    },
    onError: (error) => {
      toast({
        title: "Error unmapping vehicle",
        description: error.message || "An error occurred while unmapping the vehicle.",
        variant: "destructive",
      });
    },
  });
  
  // Function to find Fleetmatics vehicle name by ID
  const getFleetVehicleName = (fleetId: string) => {
    if (!fleetVehicles) return 'Unknown';
    const vehicle = fleetVehicles.find((v: FleetmaticsVehicle) => v.vehicleId === fleetId);
    return vehicle ? vehicle.name : 'Unknown';
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Vehicle Mapping</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Map Vehicles</CardTitle>
            <CardDescription>
              Connect your technician vehicles with Fleetmatics GPS tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => refetchFleetVehicles()}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Refresh Fleetmatics Vehicles
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Technician Vehicle</label>
                  <Select value={selectedTechVehicle?.toString()} onValueChange={(value) => setSelectedTechVehicle(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a technician vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTechVehicles ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : techVehiclesError ? (
                        <div className="p-2 text-red-500">Error loading vehicles</div>
                      ) : techVehicles && techVehicles.length > 0 ? (
                        techVehicles.map((vehicle: TechnicianWithLocation) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} - {vehicle.make} {vehicle.model}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500">No vehicles found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Fleetmatics Vehicle</label>
                  <Select value={selectedFleetVehicle || ''} onValueChange={setSelectedFleetVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Fleetmatics vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingFleetVehicles ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : fleetVehiclesError ? (
                        <div className="p-2 text-red-500">Error loading Fleetmatics vehicles</div>
                      ) : fleetVehicles && fleetVehicles.length > 0 ? (
                        fleetVehicles.map((vehicle: FleetmaticsVehicle) => (
                          <SelectItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                            {vehicle.name} {vehicle.registration ? `(${vehicle.registration})` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500">No Fleetmatics vehicles found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={() => mapVehicle()} 
                  disabled={isMapping || !selectedTechVehicle || !selectedFleetVehicle}
                  className="flex items-center"
                >
                  {isMapping ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Map Vehicles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Vehicle Mappings</CardTitle>
            <CardDescription>
              Manage your existing vehicle mappings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTechVehicles ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : techVehiclesError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error loading vehicle data
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician Vehicle</TableHead>
                      <TableHead>Make/Model</TableHead>
                      <TableHead>Fleetmatics Vehicle</TableHead>
                      <TableHead>GPS Device ID</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techVehicles && techVehicles.length > 0 ? (
                      techVehicles.map((vehicle: TechnicianWithLocation) => (
                        <TableRow key={`row-${vehicle.id}`}>
                          <TableCell className="font-medium">{vehicle.name}</TableCell>
                          <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                          <TableCell>
                            {vehicle.fleetmaticsVehicleId ? (
                              getFleetVehicleName(vehicle.fleetmaticsVehicleId)
                            ) : (
                              <span className="text-gray-400">Not mapped</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {vehicle.gpsDeviceId || <span className="text-gray-400">N/A</span>}
                          </TableCell>
                          <TableCell>
                            {vehicle.lastLocationUpdate ? (
                              new Date(vehicle.lastLocationUpdate).toLocaleString()
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {vehicle.fleetmaticsVehicleId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unmapVehicle(vehicle.id)}
                                disabled={isUnmapping}
                                className="flex items-center"
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Unmap
                              </Button>
                            ) : (
                              <span className="text-gray-400">No action</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No vehicles found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}