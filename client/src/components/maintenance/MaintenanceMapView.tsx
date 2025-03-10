import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerClusterer, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation } from "wouter";
import { CalendarIcon, MapPin, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner"; 
import { getGoogleMapsApiKey, loadGoogleMapsApi } from "@/lib/googleMapsUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MaintenanceWithDetails, 
  getStatusClasses, 
  formatDate 
} from "@/lib/types";

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
}

export function MaintenanceMapView({ maintenances, isLoading = false }: MaintenanceMapViewProps) {
  const [, navigate] = useLocation();
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const key = await getGoogleMapsApiKey();
        setGoogleMapsApiKey(key);
      } catch (error) {
        console.error("Failed to load Google Maps API key:", error);
      }
    };
    
    fetchApiKey();
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: ['places']
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
      if (maintenance.client?.latitude && maintenance.client?.longitude) {
        bounds.extend({
          lat: maintenance.client.latitude,
          lng: maintenance.client.longitude
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
    <div className="w-full h-full">
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
                maintenance.client?.latitude && maintenance.client?.longitude && (
                  <Marker
                    key={maintenance.id}
                    position={{
                      lat: maintenance.client.latitude,
                      lng: maintenance.client.longitude
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
          maintenance.client?.latitude && maintenance.client?.longitude && (
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
              lat: selectedMaintenance.client.latitude || defaultCenter.lat,
              lng: selectedMaintenance.client.longitude || defaultCenter.lng
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
                  <p><span className="font-medium">Address:</span> {selectedMaintenance.client.address || "No address"}</p>
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
  );
}