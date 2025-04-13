import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerClusterer, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation } from "wouter";
import { CalendarIcon, MapPin, Clock, User } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner"; 
import { useGoogleMaps } from "../../contexts/GoogleMapsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { 
  MaintenanceWithDetails, 
  getStatusClasses, 
  formatDate 
} from "../../lib/types";

const containerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 33.448376, // Default to Central Florida
  lng: -82.041256
};

interface MaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading?: boolean;
  selectedView?: string;
  selectedTechnician?: number | null;
  selectedDay?: string | null;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceMapView({ 
  maintenances, 
  isLoading = false,
  selectedView,
  selectedTechnician,
  selectedDay,
  onStatusUpdate,
  isUpdatingStatus,
  selectedMaintenance: propSelectedMaintenance
}: MaintenanceMapViewProps) {
  const [, navigate] = useLocation();
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(propSelectedMaintenance || null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  
  // Update selected maintenance when prop changes
  useEffect(() => {
    if (propSelectedMaintenance) {
      setSelectedMaintenance(propSelectedMaintenance);
    }
  }, [propSelectedMaintenance]);

  // Use our GoogleMapsContext to get the API key
  const { apiKey, isLoaded: apiKeyLoaded } = useGoogleMaps();
  
  useEffect(() => {
    console.log("MaintenanceMapView: Using API key from context:", apiKey ? "Valid key" : "Empty key");
    if (apiKey) {
      setGoogleMapsApiKey(apiKey);
    }
  }, [apiKey]);

  // Only initialize the Google Maps loader once when using the GoogleMapsContext
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: ['places'],
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);

  const navigateToMaintenance = (id: number) => {
    navigate(`/maintenance/${id}`);
  };

  // Compute the map bounds based on maintenance locations
  const bounds = useMemo(() => {
    if (!maintenances?.length || !isLoaded) return null;
    
    const bounds = new google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    maintenances.forEach(maintenance => {
      if (maintenance.client?.client?.latitude && maintenance.client?.client?.longitude) {
        bounds.extend({
          lat: maintenance.client.client.latitude,
          lng: maintenance.client.client.longitude
        });
        hasValidCoordinates = true;
      }
    });

    return hasValidCoordinates ? bounds : null;
  }, [maintenances, isLoaded]);

  // Fit map to bounds when markers or map changes
  useEffect(() => {
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds);
      
      // If we only have one location, zoom out a bit
      if (maintenances.length === 1) {
        mapInstance.setZoom(14);
      }
    }
  }, [mapInstance, bounds, maintenances.length]);

  // Show loading state when the map isn't loaded or when data is loading
  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center h-[600px] bg-gray-50 border rounded-lg">
        <Spinner size="lg" />
        <span className="ml-2 text-gray-500">Loading map...</span>
      </div>
    );
  }

  if (!googleMapsApiKey) {
    return (
      <div className="flex flex-col justify-center items-center h-[600px] bg-gray-50 border rounded-lg">
        <p className="text-red-500 mb-2">Google Maps API key is not configured.</p>
        <p className="text-sm text-gray-600">Please add your Google Maps API key to environment variables.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full h-full">
      {/* Side panel with maintenance cards */}
      <div className="lg:col-span-1 bg-gray-50 p-3 rounded-lg border overflow-y-auto h-[600px]">
        <h2 className="text-base font-semibold mb-3">Scheduled Maintenances</h2>
        {maintenances.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No scheduled maintenances
          </div>
        ) : (
          <div className="space-y-3">
            {maintenances.map(maintenance => (
              <Card 
                key={maintenance.id}
                className={`cursor-pointer transition-all duration-200 ${selectedMaintenance?.id === maintenance.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
                onClick={() => {
                  setSelectedMaintenance(maintenance);
                  if (mapInstance && maintenance.client?.client?.latitude && maintenance.client?.client?.longitude) {
                    mapInstance.panTo({
                      lat: maintenance.client.client.latitude,
                      lng: maintenance.client.client.longitude
                    });
                    mapInstance.setZoom(15);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm">{maintenance.client?.user?.name || "Client"}</h3>
                    <Badge className={`${getStatusClasses(maintenance.status).bg} ${getStatusClasses(maintenance.status).text} text-xs`}>
                      {maintenance.status}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      <span>{formatDate(maintenance.scheduleDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      <span>{maintenance.startTime ? new Date(maintenance.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Flexible'}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      <span className="truncate">{maintenance.client?.client?.address || "No address"}</span>
                    </div>
                    {maintenance.technician && (
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        <span>{maintenance.technician.user?.name || "Assigned Technician"}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToMaintenance(maintenance.id);
                    }}
                    className="w-full mt-2 py-1 px-2 bg-primary text-primary-foreground text-xs rounded-sm hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Map container */}
      <div className="lg:col-span-3">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={7}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
        }}
      >
        {/* Marker Clusterer */}
        <MarkerClusterer>
          {(clusterer) => (
            <div>
              {maintenances.map((maintenance) => (
                maintenance.client?.client?.latitude && maintenance.client?.client?.longitude && (
                  <Marker
                    key={maintenance.id}
                    position={{
                      lat: maintenance.client.client.latitude,
                      lng: maintenance.client.client.longitude
                    }}
                    onClick={() => setSelectedMaintenance(maintenance)}
                    clusterer={clusterer}
                  />
                )
              ))}
            </div>
          )}
        </MarkerClusterer>

        {/* Tooltips on markers */}
        {maintenances.map((maintenance) => (
          maintenance.client?.client?.latitude && maintenance.client?.client?.longitude && (
            <TooltipProvider key={`tooltip-${maintenance.id}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1000px', // Off-screen
                      top: '-1000px'
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-medium">{maintenance.client.user?.name || "Client"}</div>
                  <div className="text-xs">{formatDate(maintenance.scheduleDate)}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        ))}

        {/* Info Window for selected maintenance */}
        {selectedMaintenance && selectedMaintenance.client && (
          <InfoWindow
            position={{
              lat: selectedMaintenance.client.client?.latitude || defaultCenter.lat,
              lng: selectedMaintenance.client.client?.longitude || defaultCenter.lng
            }}
            onCloseClick={() => setSelectedMaintenance(null)}
          >
            <Card className="w-72 border-none shadow-none">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{selectedMaintenance.client.user?.name || "Client"}</h3>
                  <Badge 
                    className={`${getStatusClasses(selectedMaintenance.status).bg} ${getStatusClasses(selectedMaintenance.status).text}`}
                  >
                    {selectedMaintenance.status}
                  </Badge>
                </div>
                <div className="text-sm mb-2">
                  <p><span className="font-medium">Address:</span> {selectedMaintenance.client.client?.address || "No address"}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(selectedMaintenance.scheduleDate)}</p>
                  {selectedMaintenance.startTime && (
                    <p><span className="font-medium">Time:</span> {new Date(selectedMaintenance.startTime).toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="mt-3">
                  <button 
                    onClick={() => navigateToMaintenance(selectedMaintenance.id)}
                    className="w-full py-1 px-3 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </CardContent>
            </Card>
          </InfoWindow>
        )}

        {/* Route lines would go here when showRoutes is true */}
        {showRoutes && (
          // Implementation for route lines will come later
          null
        )}
      </GoogleMap>
      </div>
    </div>
  );
}