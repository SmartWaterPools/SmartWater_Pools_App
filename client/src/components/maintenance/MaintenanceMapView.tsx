import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { LoadScript, GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { User, Calendar, MapPin } from 'lucide-react';
import { MaintenanceWithDetails } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { EnvTest } from './EnvTest';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

interface MaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  selectedView: string;
  selectedTechnician: string | null;
  selectedDay: string | null;
  onStatusUpdate: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus: boolean;
  selectedMaintenance: MaintenanceWithDetails | null;
}

export function MaintenanceMapView({
  maintenances,
  selectedView,
  selectedTechnician: propSelectedTechnician,
  selectedDay: propSelectedDay,
  onStatusUpdate,
  isUpdatingStatus,
  selectedMaintenance,
}: MaintenanceMapViewProps) {
  // Local state for filters
  const [localTechnician, setLocalTechnician] = useState<string>(propSelectedTechnician || "all");
  const [localDay, setLocalDay] = useState<string>(propSelectedDay || "all");
  
  // Fetch technicians for the dropdown
  const { data: technicians = [] } = useQuery<any[]>({
    queryKey: ["/api/technicians"],
    enabled: true
  });
  
  // Update local state if props change
  useEffect(() => {
    if (propSelectedTechnician !== null) {
      setLocalTechnician(propSelectedTechnician);
    }
  }, [propSelectedTechnician]);
  
  useEffect(() => {
    if (propSelectedDay !== null) {
      setLocalDay(propSelectedDay);
    }
  }, [propSelectedDay]);
  
  // Filter maintenances based on selected technician and day
  const filteredMaintenances = maintenances.filter(maintenance => {
    // Apply technician filter
    if (localTechnician && localTechnician !== "all") {
      if (maintenance.technicianId?.toString() !== localTechnician) {
        return false;
      }
    }
    
    // Apply day filter - not implemented yet
    if (localDay && localDay !== "all") {
      // Future implementation
    }
    
    return true;
  });

  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Calculate map center based on maintenance locations if available
  const calculateMapCenter = () => {
    if (filteredMaintenances && filteredMaintenances.length > 0) {
      // Try to find center of all points
      let totalLat = 0;
      let totalLng = 0;
      let validPoints = 0;
      
      filteredMaintenances.forEach(maintenance => {
        if (maintenance.client.latitude && maintenance.client.longitude) {
          totalLat += maintenance.client.latitude;
          totalLng += maintenance.client.longitude;
          validPoints++;
        }
      });
      
      if (validPoints > 0) {
        return {
          lat: totalLat / validPoints,
          lng: totalLng / validPoints
        };
      }
    }
    return defaultCenter;
  };

  const mapCenter = calculateMapCenter();
  
  // Days of the week options
  const dayOptions = [
    { value: "all", label: "All Days" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  // Force the use of the environment variable or a fallback for development
  // In production, this will use the environment variable from .env
  const googleMapsApiKey = process.env.NODE_ENV === 'production'
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
    : 'AIzaSyB3mCrj1qCOz6wCAxPqBq3gEd9VXt_gUYk'; // Fallback for development
  
  const hasApiKey = typeof googleMapsApiKey === 'string' && googleMapsApiKey.length > 0;
  
  // Log the API key status for debugging
  console.log(`Google Maps API key: ${hasApiKey ? "✅ Available" : "❌ Missing or empty"}`);
  
  // Check if we have a valid key
  useEffect(() => {
    if (!hasApiKey) {
      console.warn("Google Maps API key is missing. Using fallback key for development.");
    } else {
      console.info("Google Maps API key successfully loaded.");
    }
  }, [hasApiKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-auto flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={localTechnician} onValueChange={setLocalTechnician}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians?.map((tech: any) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>
                  {tech.user?.name || 'Unknown Technician'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={localDay} onValueChange={setLocalDay}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by day" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Environment Variables Debug Component */}
      <EnvTest />
      
      <Card className="p-4 mt-4">
        {!hasApiKey ? (
          <div className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <h3 className="text-lg font-medium">Google Maps API Key Required</h3>
            <p className="text-sm text-gray-500 mt-1">A valid Google Maps API key is needed to display the map.</p>
          </div>
        ) : (
          <LoadScript googleMapsApiKey={googleMapsApiKey} 
            loadingElement={<div className="h-[400px] w-full flex items-center justify-center"><Skeleton className="h-[400px] w-full" /></div>}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={10}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {filteredMaintenances?.map((maintenance, index) => {
              const position = {
                lat: maintenance.client.latitude || defaultCenter.lat,
                lng: maintenance.client.longitude || defaultCenter.lng
              };

              return (
                <Marker
                  key={maintenance.id}
                  position={position}
                  onClick={() => setSelectedLocation(index)}
                >
                  {selectedLocation === index && (
                    <InfoWindow
                      position={position}
                      onCloseClick={() => setSelectedLocation(null)}
                    >
                      <div className="p-1">
                        <h3 className="font-semibold">{maintenance.client.user.name}</h3>
                        <p className="text-sm text-gray-600">{maintenance.client.address || 'No address'}</p>
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${
                              maintenance.status === "completed" ? "bg-green-500" : 
                              maintenance.status === "in_progress" ? "bg-blue-500" :
                              maintenance.status === "cancelled" ? "bg-red-500" : "bg-yellow-500"
                            }`}></span>
                            <span className="text-xs font-medium capitalize">{maintenance.status.replace('_', ' ')}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Type:</span> {maintenance.type.replace('_', ' ')}
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Date:</span> {new Date(maintenance.scheduleDate).toLocaleDateString()}
                          </div>
                          {maintenance.technicianId ? (
                            <div className="text-xs">
                              <span className="font-medium">Technician:</span> {
                                technicians.find((t: any) => t.id === maintenance.technicianId)?.user?.name || 'Unassigned'
                              }
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}
            </GoogleMap>
          </LoadScript>
        )}
      </Card>
    </div>
  );
}