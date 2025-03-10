import React, { useCallback, useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { LoadScript, GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { User, Calendar, MapPin, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { MaintenanceWithDetails } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useInView } from 'react-intersection-observer';
import { useToast } from "@/hooks/use-toast";

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

  // State for markers and Google Maps libraries
  const [markers, setMarkers] = useState<any[]>([]);
  const [libraries] = useState(['places', 'geometry', 'drawing', 'visualization'] as any);
  const [infoPosition, setInfoPosition] = useState<google.maps.LatLngLiteral | null>(null);
  
  // Try to get the API key directly from the environment
  const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  // Also try to get it from the server as a backup
  const { data: apiKeyData } = useQuery<{ apiKey: string }>({
    queryKey: ["/api/google-maps-key"],
    enabled: true
  });
  
  // Use whichever API key is available
  const googleMapsApiKey = envApiKey || apiKeyData?.apiKey || '';
  
  // For debugging only - don't log actual key values in production
  console.log('API Key Sources - Environment:', envApiKey ? '✅ Available' : '❌ Missing');
  console.log('API Key Sources - Server API:', apiKeyData?.apiKey ? '✅ Available' : '❌ Missing or still loading');
  
  const hasApiKey = typeof googleMapsApiKey === 'string' && googleMapsApiKey.length > 0;
  
  // Log the API key status for debugging
  console.log(`Google Maps API key: ${hasApiKey ? "✅ Available" : "❌ Missing or empty"}`);
  
  // Check if we have a valid key
  useEffect(() => {
    if (!hasApiKey) {
      console.warn("Google Maps API key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your environment.");
    } else {
      console.info("Google Maps API key successfully loaded.");
    }
  }, [hasApiKey]);
  
  // Add markers for all filtered maintenances
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    
    // Clear any existing markers
    markers.forEach(marker => {
      if (marker) {
        marker.setMap(null);
      }
    });
    setMarkers([]);
    
    // Create markers for filtered maintenances
    const newMarkers: any[] = [];
    
    filteredMaintenances.forEach((maintenance, index) => {
      const position = {
        lat: maintenance.client.latitude || defaultCenter.lat,
        lng: maintenance.client.longitude || defaultCenter.lng
      };
      
      // Use standard markers as fallback
      const statusColor = 
        maintenance.status === "completed" ? "#10b981" : // green
        maintenance.status === "in_progress" ? "#3b82f6" : // blue
        maintenance.status === "cancelled" ? "#ef4444" : // red
        "#f59e0b"; // yellow/amber for scheduled
      
      // Create a standard marker with custom icon
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: maintenance.client.user.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: statusColor,
          fillOpacity: 1.0,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
          scale: 8
        },
        zIndex: 1
      });
      
      // Add click listener
      marker.addListener('click', () => {
        setSelectedLocation(index);
      });
      
      // Store the marker
      newMarkers.push(marker);
    });
    
    setMarkers(newMarkers);
  }, [filteredMaintenances]);

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
      
      <Card className="p-4 mt-4">
        {/* Render the map component with the API key from environment */}
        <MapWithLazyLoading 
          googleMapsApiKey={googleMapsApiKey} 
          libraries={libraries}
          mapCenter={mapCenter}
          containerStyle={containerStyle}
          onLoad={onLoad}
          onUnmount={onUnmount}
          filteredMaintenances={filteredMaintenances}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          technicians={technicians}
          defaultCenter={defaultCenter}
        />
      </Card>
    </div>
  );
}

// Map with lazy loading components
interface MapWithLazyLoadingProps {
  googleMapsApiKey: string;
  libraries: any[];
  mapCenter: { lat: number; lng: number };
  containerStyle: { width: string; height: string };
  onLoad: (map: google.maps.Map) => void;
  onUnmount: () => void;
  filteredMaintenances: MaintenanceWithDetails[];
  selectedLocation: number | null;
  setSelectedLocation: (index: number | null) => void;
  technicians: any[];
  defaultCenter: { lat: number; lng: number };
}

// Helper function to ensure we're using the correct API key
const getApiKey = () => {
  // Check if API key is available from different sources
  // First try client-side env vars, then check server-side, then check for the secret
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
             (typeof process !== 'undefined' && process.env && process.env.GOOGLE_MAPS_API_KEY) || 
             '';
             
  return key;
};

// Already have the Lucide icons imported at the top of the file

function MapWithLazyLoading({
  googleMapsApiKey,
  libraries,
  mapCenter,
  containerStyle,
  onLoad,
  onUnmount,
  filteredMaintenances,
  selectedLocation,
  setSelectedLocation,
  technicians,
  defaultCenter
}: MapWithLazyLoadingProps) {
  // State for fallback mode
  const [showFallbackView, setShowFallbackView] = useState(false);
  // Ensure we're using a valid API key - either passed in or from our helper
  const apiKey = googleMapsApiKey || getApiKey();
  
  // Set up intersection observer to detect when component is visible
  const { ref, inView } = useInView({
    triggerOnce: true, // Only trigger once when component becomes visible
    threshold: 0.1, // 10% of the component needs to be visible
    initialInView: true // Force initial render to speed up map loading
  });
  
  // Error state for map loading
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  
  // Log when the component becomes visible
  useEffect(() => {
    if (inView) {
      console.log("Map component is now visible, loading Google Maps");
    }
  }, [inView]);

  // Log the API key being used
  useEffect(() => {
    console.log(`Using API key: ${apiKey ? "✅ Provided" : "❌ Missing"}`);
  }, [apiKey]);

  // Access toast for user notifications
  const { toast } = useToast();
  
  // Render the map or error state
  if (!inView) {
    return (
      <div ref={ref} className="h-[400px] w-full flex items-center justify-center">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }
  
  // Show error state if there was a problem
  if (mapLoadError) {
    // Determine if this is a domain restriction issue
    const isDomainIssue = mapLoadError.toLowerCase().includes('domain');
    
    return (
      <div ref={ref} className="h-[400px] w-full flex flex-col items-center justify-center bg-gray-100 rounded-md p-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-2" />
        <h3 className="text-lg font-semibold">Map Loading Error</h3>
        <p className="text-sm text-center text-gray-600 max-w-md">
          {mapLoadError}
        </p>
        
        {isDomainIssue && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md max-w-md">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">How to fix this issue:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Access your Google Cloud Console</li>
                  <li>Navigate to "API & Services" &gt; "Credentials"</li>
                  <li>Find your Maps API key and edit the restrictions</li>
                  <li>Add this application's domain to the allowed domains</li>
                  <li>Include both HTTP and HTTPS variants if needed</li>
                </ol>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setMapLoadError(null)}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          
          {isDomainIssue && (
            <Button 
              variant="default"
              onClick={() => {
                toast({
                  title: "Fallback Mode Activated",
                  description: "Using simple location list instead of map view. Fix the API key to restore full functionality.",
                  duration: 5000,
                });
                setMapLoadError(null);
                setShowFallbackView(true); // Switch to fallback view
              }}
            >
              Use Fallback View
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Show fallback view if that mode is active
  if (showFallbackView) {
    return (
      <div ref={ref} className="w-full h-[400px] overflow-y-auto">
        <div className="p-4 border rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Location List View (Fallback)</h3>
            <div className="text-xs text-gray-500 flex items-center">
              <Info className="h-3 w-3 mr-1" />
              <span>Map view unavailable - Check API key</span>
            </div>
          </div>
          
          {filteredMaintenances.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No maintenance locations to display
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMaintenances.map((maintenance, index) => {
                // Status color based on maintenance status
                const statusColor = 
                  maintenance.status === "completed" ? "bg-green-100 border-green-200 text-green-800" : 
                  maintenance.status === "in_progress" ? "bg-blue-100 border-blue-200 text-blue-800" :
                  maintenance.status === "cancelled" ? "bg-red-100 border-red-200 text-red-800" : 
                  "bg-yellow-100 border-yellow-200 text-yellow-800";
                
                return (
                  <div 
                    key={maintenance.id} 
                    className={`border rounded-md overflow-hidden transition-all ${statusColor}`}
                  >
                    <div className="p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            {maintenance.client.user.name}
                          </div>
                          <div className="text-xs truncate max-w-[200px]">
                            {maintenance.client.address || 'No address available'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs capitalize font-medium">
                        {maintenance.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="p-3 border-t bg-white/75">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Date:</span> {
                            new Date(maintenance.scheduleDate).toLocaleDateString()
                          }
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {
                            maintenance.type.replace('_', ' ')
                          }
                        </div>
                        <div>
                          <span className="font-medium">Technician:</span> {
                            maintenance.technician?.user?.name || 'Not assigned'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Notes:</span> {
                            maintenance.notes?.substring(0, 20) || 'None'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFallbackView(false)}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try Map View Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show the map if no errors and not in fallback mode
  return (
    <div ref={ref} className="w-full">
      <LoadScript 
        googleMapsApiKey={apiKey}
        libraries={libraries}
        onError={(error) => {
          console.error("Google Maps Script Error:", error);
          
          // Enhanced error logging
          if (error) {
            console.error("Google Maps error details:", {
              message: error.message,
              type: typeof error,
              toString: String(error)
            });
            
            // Try to determine if it's a domain restriction issue
            const errorStr = String(error).toLowerCase();
            const isDomainIssue = errorStr.includes('api key') || 
                                  errorStr.includes('apikey') || 
                                  errorStr.includes('domain') || 
                                  errorStr.includes('referer') || 
                                  errorStr.includes('url');
            
            if (isDomainIssue) {
              setMapLoadError("Domain restriction error: The Google Maps API key is restricted to specific domains that don't include this application's URL. Please update the API key settings in the Google Cloud Console to include this domain.");
            } else {
              setMapLoadError("There was a problem loading Google Maps: " + String(error).substring(0, 150));
            }
          } else {
            setMapLoadError("Unknown Google Maps loading error. Please check your network connection and try again.");
          }
        }}
        onLoad={() => console.log("Google Maps Script loaded successfully")}
        loadingElement={<div className="h-[400px] w-full flex items-center justify-center"><Skeleton className="h-[400px] w-full" /></div>}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={10}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{ 
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }}
        >
          {/* Display markers for all maintenance locations */}
          {filteredMaintenances.map((maintenance, index) => {
            // Only show if we have valid coordinates
            if (!maintenance.client.latitude || !maintenance.client.longitude) {
              return null;
            }
            
            // Color based on status
            const getMarkerColor = () => {
              if (maintenance.status === "completed") return "#10b981"; // green
              if (maintenance.status === "in_progress") return "#3b82f6"; // blue
              if (maintenance.status === "cancelled") return "#ef4444"; // red
              return "#eab308"; // yellow for scheduled
            };
            
            return (
              <Marker
                key={maintenance.id}
                position={{
                  lat: maintenance.client.latitude,
                  lng: maintenance.client.longitude
                }}
                onClick={() => setSelectedLocation(index)}
                icon={{
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                  fillColor: getMarkerColor(),
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: "#ffffff",
                  scale: 1.5,
                  anchor: { x: 12, y: 22 }
                }}
              />
            );
          })}
          
          {/* Display info window for selected location */}
          {selectedLocation !== null && filteredMaintenances[selectedLocation] && (
            <InfoWindow
              position={{
                lat: filteredMaintenances[selectedLocation].client.latitude || defaultCenter.lat,
                lng: filteredMaintenances[selectedLocation].client.longitude || defaultCenter.lng
              }}
              onCloseClick={() => setSelectedLocation(null)}
              options={{ maxWidth: 300 }}
            >
              <div className="p-1 max-w-[280px]">
                <h3 className="font-semibold">{filteredMaintenances[selectedLocation].client.user.name}</h3>
                <p className="text-sm text-gray-600 truncate">{filteredMaintenances[selectedLocation].client.address || 'No address'}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      filteredMaintenances[selectedLocation].status === "completed" ? "bg-green-500" : 
                      filteredMaintenances[selectedLocation].status === "in_progress" ? "bg-blue-500" :
                      filteredMaintenances[selectedLocation].status === "cancelled" ? "bg-red-500" : "bg-yellow-500"
                    }`}></span>
                    <span className="text-xs font-medium capitalize">{filteredMaintenances[selectedLocation].status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Type:</span> {filteredMaintenances[selectedLocation].type.replace('_', ' ')}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Date:</span> {new Date(filteredMaintenances[selectedLocation].scheduleDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}