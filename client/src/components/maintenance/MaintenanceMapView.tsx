import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatDate, getStatusClasses, MaintenanceWithDetails } from '../../lib/types';
import { Check, Play, X, MapPin, Info, Calendar, User, Clock } from 'lucide-react';

// Map container styles
const containerStyle = {
  width: '100%',
  height: '600px',
};

// Default map center (will be updated based on maintenance locations)
const defaultCenter = {
  lat: 34.0522, // Los Angeles as default
  lng: -118.2437,
};

type MaintenanceMapViewProps = {
  maintenances: MaintenanceWithDetails[];
  selectedView: string;
  selectedTechnician: string | null;
  selectedDay: string | null;
  onStatusUpdate: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus: boolean;
  selectedMaintenance: MaintenanceWithDetails | null;
};

export function MaintenanceMapView({
  maintenances,
  selectedView,
  selectedTechnician,
  selectedDay,
  onStatusUpdate,
  isUpdatingStatus,
  selectedMaintenance,
}: MaintenanceMapViewProps) {
  // State for selected markers and map center
  const [selectedMarker, setSelectedMarker] = useState<MaintenanceWithDetails | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterTech, setFilterTech] = useState<string>("all");
  
  // Define type for technician data
  interface Technician {
    id: number;
    user: {
      id: number;
      name: string;
    };
  }

  // Fetch technicians for filtering
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ['/api/technicians'],
    enabled: selectedView === 'map', // Only fetch when map view is active
  });

  // Format day for display
  const formatDay = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    } catch (e) {
      console.error('Error formatting day:', e);
      return 'Unknown';
    }
  };

  // Get all unique days from maintenances
  const uniqueDays = React.useMemo(() => {
    const days = new Set<string>();
    
    maintenances.forEach(maintenance => {
      try {
        const day = formatDay(maintenance.scheduleDate || maintenance.schedule_date || '');
        days.add(day);
      } catch (e) {
        console.error('Error adding day:', e);
      }
    });
    
    return Array.from(days).sort();
  }, [maintenances]);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NODE_ENV === 'production'
      ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
      : 'AIzaSyB3mCrj1qCOz6wCAxPqBq3gEd9VXt_gUYk', // Fallback for development
  });

  // Filter maintenances based on selected filters
  const filteredMaintenances = React.useMemo(() => {
    return maintenances.filter(maintenance => {
      // Filter by technician if selected
      if (filterTech !== 'all' && maintenance.technicianId?.toString() !== filterTech) {
        return false;
      }
      
      // Filter by day if selected
      if (filterDay !== 'all') {
        const maintenanceDay = formatDay(maintenance.scheduleDate || maintenance.schedule_date || '');
        if (maintenanceDay !== filterDay) {
          return false;
        }
      }
      
      return true;
    });
  }, [maintenances, filterTech, filterDay]);

  // Calculate map center based on maintenance locations
  useEffect(() => {
    if (filteredMaintenances.length > 0) {
      let validLocations = filteredMaintenances.filter(m => 
        m.client?.latitude && m.client?.longitude
      );
      
      if (validLocations.length > 0) {
        const sumLat = validLocations.reduce((sum, m) => sum + (m.client?.latitude || 0), 0);
        const sumLng = validLocations.reduce((sum, m) => sum + (m.client?.longitude || 0), 0);
        
        setMapCenter({
          lat: sumLat / validLocations.length,
          lng: sumLng / validLocations.length,
        });
      }
    }
  }, [filteredMaintenances]);

  // Handle marker click
  const handleMarkerClick = useCallback((maintenance: MaintenanceWithDetails) => {
    setSelectedMarker(maintenance);
  }, []);

  // Handle info window close
  const handleInfoWindowClose = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  // Format a maintenance type for display
  const formatMaintenanceType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loadError) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
        <h3 className="text-lg font-medium mb-2">Error Loading Google Maps</h3>
        <p>There was an error loading the Google Maps API. Please check your API key and try again.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
        </div>
        <Card className="p-4 mt-4">
          <Skeleton className="h-[600px] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {uniqueDays.map(day => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <Select value={filterTech} onValueChange={setFilterTech}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians && technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>{tech.user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0 mt-4 overflow-hidden">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={10}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: true,
          }}
        >
          {filteredMaintenances.map((maintenance) => {
            if (!maintenance.client?.latitude || !maintenance.client?.longitude) {
              return null; // Skip markers without valid coordinates
            }
            
            return (
              <MarkerF
                key={maintenance.id}
                position={{
                  lat: maintenance.client.latitude,
                  lng: maintenance.client.longitude,
                }}
                onClick={() => handleMarkerClick(maintenance)}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: maintenance.status === 'completed' 
                    ? '#16a34a' // Green for completed
                    : maintenance.status === 'in_progress' 
                      ? '#2563eb' // Blue for in progress
                      : maintenance.status === 'cancelled'
                        ? '#dc2626' // Red for cancelled
                        : '#f59e0b', // Amber for scheduled
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: '#ffffff',
                  scale: 1.5,
                  // Use a simpler anchor format compatible with the API
                  anchor: new window.google.maps.Point(12, 24),
                }}
                label={{
                  text: `${maintenance.id}`,
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              />
            );
          })}

          {selectedMarker && selectedMarker.client?.latitude && selectedMarker.client?.longitude && (
            <InfoWindowF
              position={{
                lat: selectedMarker.client.latitude,
                lng: selectedMarker.client.longitude,
              }}
              onCloseClick={handleInfoWindowClose}
            >
              <div className="p-1" style={{ maxWidth: 200 }}>
                <div className="text-sm font-semibold mb-1">{selectedMarker.client?.user?.name}</div>
                <div className="text-xs text-gray-600 mb-2">{selectedMarker.client?.address}</div>
                <div className="flex flex-col gap-1 text-xs mb-2">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(new Date(selectedMarker.scheduleDate || selectedMarker.schedule_date || ''))}
                  </div>
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {selectedMarker.technician?.user?.name || 'Unassigned'}
                  </div>
                  <div className="flex items-center">
                    <Info className="w-3 h-3 mr-1" />
                    {formatMaintenanceType(selectedMarker.type)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge className={getStatusClasses(selectedMarker.status).bg}>
                    {selectedMarker.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex gap-1 mt-2">
                  {selectedMarker.status !== 'completed' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs w-full"
                      disabled={isUpdatingStatus && selectedMaintenance?.id === selectedMarker.id}
                      onClick={() => onStatusUpdate(selectedMarker, 'completed')}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                  {selectedMarker.status !== 'in_progress' && selectedMarker.status !== 'completed' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs w-full"
                      disabled={isUpdatingStatus && selectedMaintenance?.id === selectedMarker.id}
                      onClick={() => onStatusUpdate(selectedMarker, 'in_progress')}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </Card>

      <div className="bg-muted p-3 rounded-lg mt-4">
        <h3 className="text-sm font-medium mb-2">Map Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-xs">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span className="text-xs">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-xs">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceMapView;