import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { Loader2, MapPin, RefreshCw, Search, History, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TechnicianWithLocation } from '../types/fleetmatics';

// Define additional interfaces for Google Maps components
interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  vehicles: TechnicianWithLocation[];
  showSearchArea?: boolean;
  searchAreaCenter?: { lat: number; lng: number };
  searchAreaRadius?: number;
  selectedVehicle?: number | null;
  onVehicleSelect?: (vehicleId: number) => void;
  historyPath?: Array<{ lat: number; lng: number }>;
}

interface LocationHistoryRequest {
  vehicleId: number;
  startDate: string;
  endDate: string;
}

export default function VehicleTracking() {
  const { toast } = useToast();
  const { isLoaded: mapsLoaded, GoogleMap, Marker, InfoWindow, Circle, Polyline } = useGoogleMaps();
  
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 28.0, lng: -82.0 }); // Tampa, FL area
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // seconds
  const [searchRadius, setSearchRadius] = useState<number>(10); // miles
  const [searchLat, setSearchLat] = useState<string>('');
  const [searchLng, setSearchLng] = useState<string>('');
  const [showSearchArea, setShowSearchArea] = useState<boolean>(false);
  const [historyDateRange, setHistoryDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [showHistoryPath, setShowHistoryPath] = useState<boolean>(false);
  const [historyPath, setHistoryPath] = useState<Array<{ lat: number; lng: number }>>([]);
  
  // Query to get all vehicles with location data
  const {
    data: vehicles,
    isLoading: isLoadingVehicles,
    error: vehiclesError,
    refetch: refetchVehicles
  } = useQuery({
    queryKey: ['/api/fleetmatics/locations'],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false
  });
  
  // Mutation to search vehicles in area
  const {
    mutate: searchVehiclesInArea,
    isPending: isSearching,
    data: searchResults
  } = useMutation({
    mutationFn: async () => {
      const lat = parseFloat(searchLat);
      const lng = parseFloat(searchLng);
      
      if (isNaN(lat) || isNaN(lng) || searchRadius <= 0) {
        throw new Error('Please enter valid coordinates and search radius');
      }
      
      return fetch(`/api/fleetmatics/vehicles-in-area?latitude=${lat}&longitude=${lng}&radius=${searchRadius}`).then(res => res.json());
    },
    onSuccess: (data) => {
      if (data.vehicles && data.vehicles.length > 0) {
        setMapCenter({ lat: data.center.latitude, lng: data.center.longitude });
        setShowSearchArea(true);
        toast({
          title: "Search complete",
          description: `Found ${data.vehicles.length} vehicles in the area.`,
        });
      } else {
        toast({
          title: "No vehicles found",
          description: "No vehicles were found in the specified area.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message || "An error occurred while searching for vehicles.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to get vehicle history
  const {
    mutate: getVehicleHistory,
    isPending: isLoadingHistory,
  } = useMutation({
    mutationFn: async (request: LocationHistoryRequest) => {
      return fetch(`/api/fleetmatics/history/${request.vehicleId}?startDate=${request.startDate}&endDate=${request.endDate}`).then(res => res.json());
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        // Convert the location history to path coordinates
        const path = data.map((point: any) => ({
          lat: point.latitude,
          lng: point.longitude
        }));
        
        setHistoryPath(path);
        setShowHistoryPath(true);
        
        // Center the map on the first point
        if (path.length > 0) {
          setMapCenter(path[0]);
        }
        
        toast({
          title: "History loaded",
          description: `Loaded ${data.length} location points.`,
        });
      } else {
        toast({
          title: "No history found",
          description: "No location history found for the selected period.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "History load failed",
        description: error.message || "An error occurred while loading vehicle history.",
        variant: "destructive",
      });
    },
  });
  
  // Function to get the vehicle by ID
  const getVehicleById = (id: number) => {
    if (!vehicles) return null;
    return vehicles.find((vehicle: TechnicianWithLocation) => vehicle.id === id);
  };
  
  // Auto-refresh handling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        refetchVehicles();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, refetchVehicles]);
  
  // Center map on selected vehicle
  useEffect(() => {
    if (selectedVehicle) {
      const vehicle = getVehicleById(selectedVehicle);
      if (vehicle && vehicle.lastKnownLatitude && vehicle.lastKnownLongitude) {
        setMapCenter({ 
          lat: vehicle.lastKnownLatitude, 
          lng: vehicle.lastKnownLongitude 
        });
        setMapZoom(14);
      }
    }
  }, [selectedVehicle, vehicles]);
  
  // Function to load vehicle history
  const loadVehicleHistory = () => {
    if (!selectedVehicle) {
      toast({
        title: "No vehicle selected",
        description: "Please select a vehicle to view its history.",
        variant: "destructive",
      });
      return;
    }
    
    const request: LocationHistoryRequest = {
      vehicleId: selectedVehicle,
      startDate: historyDateRange.start,
      endDate: historyDateRange.end
    };
    
    getVehicleHistory(request);
  };
  
  // Function to clear history display
  const clearHistoryDisplay = () => {
    setShowHistoryPath(false);
    setHistoryPath([]);
  };
  
  // Handle vehicle marker click
  const handleVehicleMarkerClick = (vehicleId: number) => {
    setSelectedVehicle(vehicleId);
    setActiveInfoWindow(vehicleId);
  };
  
  // Format the last update time
  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const updateDate = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return updateDate.toLocaleDateString();
  };
  
  // Render the Google Map with vehicle markers
  const renderMap = () => {
    if (!mapsLoaded) {
      return (
        <div className="h-[400px] flex items-center justify-center bg-slate-100 rounded-md">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    return (
      <div className="h-[400px] rounded-md overflow-hidden">
        {GoogleMap && (
          <GoogleMap
            center={mapCenter}
            zoom={mapZoom}
            mapContainerStyle={{ width: '100%', height: '100%' }}
            options={{
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {/* Search Area Circle */}
            {showSearchArea && searchResults && Circle && (
              <Circle
                center={{ 
                  lat: searchResults.center.latitude, 
                  lng: searchResults.center.longitude 
                }}
                radius={searchResults.radiusMiles * 1609.34} // Convert miles to meters
                options={{
                  fillColor: 'rgba(66, 133, 244, 0.2)',
                  fillOpacity: 0.3,
                  strokeColor: '#4285F4',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            )}
            
            {/* Vehicle markers */}
            {vehicles && vehicles.map((vehicle: TechnicianWithLocation) => (
              <div key={`marker-${vehicle.id}`}>
                {Marker && vehicle.lastKnownLatitude && vehicle.lastKnownLongitude && (
                  <Marker
                    position={{ 
                      lat: vehicle.lastKnownLatitude, 
                      lng: vehicle.lastKnownLongitude 
                    }}
                    onClick={() => handleVehicleMarkerClick(vehicle.id)}
                    icon={{
                      url: selectedVehicle === vehicle.id ? 
                        'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' : 
                        'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: { width: 32, height: 32 } as google.maps.Size,
                    }}
                  >
                    {/* Info Window */}
                    {InfoWindow && activeInfoWindow === vehicle.id && (
                      <InfoWindow
                        position={{ 
                          lat: vehicle.lastKnownLatitude, 
                          lng: vehicle.lastKnownLongitude 
                        }}
                        onCloseClick={() => setActiveInfoWindow(null)}
                      >
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-sm">{vehicle.name}</h3>
                          <p className="text-xs">{vehicle.make} {vehicle.model}</p>
                          {vehicle.address && (
                            <p className="text-xs mt-1">{vehicle.address}</p>
                          )}
                          <p className="text-xs mt-1">
                            Updated: {formatLastUpdate(vehicle.lastLocationUpdate as string)}
                          </p>
                          <div className="mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-7 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryDateRange({
                                  start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                  end: new Date().toISOString().split('T')[0]
                                });
                                loadVehicleHistory();
                              }}
                            >
                              <History className="h-3 w-3 mr-1" />
                              View 24h History
                            </Button>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                )}
              </div>
            ))}
            
            {/* History path polyline */}
            {showHistoryPath && historyPath.length > 0 && Polyline && (
              <Polyline
                path={historyPath}
                options={{
                  strokeColor: '#4285F4',
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>
    );
  };
  
  // List of vehicles with details
  const renderVehicleList = () => {
    if (isLoadingVehicles) {
      return (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (vehiclesError) {
      return (
        <div className="py-4 text-center">
          <p className="text-red-500">Error loading vehicles</p>
        </div>
      );
    }
    
    if (!vehicles || vehicles.length === 0) {
      return (
        <div className="py-4 text-center">
          <p className="text-gray-500">No vehicles found with location data</p>
        </div>
      );
    }
    
    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Last Known Location</TableHead>
              <TableHead>Last Update</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle: TechnicianWithLocation) => (
              <TableRow 
                key={`table-${vehicle.id}`}
                className={selectedVehicle === vehicle.id ? 'bg-blue-50' : ''}
              >
                <TableCell className="font-medium">
                  <div>
                    {vehicle.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {vehicle.make} {vehicle.model}
                  </div>
                </TableCell>
                <TableCell>
                  {vehicle.lastKnownLatitude && vehicle.lastKnownLongitude ? (
                    <div>
                      <div className="text-xs">
                        {vehicle.address || 'Address unavailable'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {vehicle.lastKnownLatitude.toFixed(6)}, {vehicle.lastKnownLongitude.toFixed(6)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No location data</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.lastLocationUpdate ? (
                    formatLastUpdate(vehicle.lastLocationUpdate as string)
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVehicleMarkerClick(vehicle.id)}
                    className="h-8 px-2"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="sr-only md:not-sr-only">Locate</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Vehicle Tracking</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Live Vehicle Map</CardTitle>
                <CardDescription>
                  Track the real-time location of your service vehicles
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchVehicles()}
                  disabled={isLoadingVehicles}
                  className="flex items-center"
                >
                  {isLoadingVehicles ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <label
                    htmlFor="auto-refresh"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Auto-refresh
                  </label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Tabs defaultValue="map" className="w-full">
                <TabsList>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                  <TabsTrigger value="search">Search Area</TabsTrigger>
                  <TabsTrigger value="history">Vehicle History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="map" className="space-y-4">
                  {renderMap()}
                  <div className="mt-4">
                    {renderVehicleList()}
                  </div>
                </TabsContent>
                
                <TabsContent value="search" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Search Vehicles in Area</CardTitle>
                      <CardDescription>
                        Find vehicles within a specified radius of a location
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Latitude</label>
                          <Input
                            type="text"
                            value={searchLat}
                            onChange={(e) => setSearchLat(e.target.value)}
                            placeholder="e.g. 28.0395"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Longitude</label>
                          <Input
                            type="text"
                            value={searchLng}
                            onChange={(e) => setSearchLng(e.target.value)}
                            placeholder="e.g. -82.5146"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Radius (miles)</label>
                          <Input
                            type="number"
                            value={searchRadius}
                            onChange={(e) => setSearchRadius(parseInt(e.target.value) || 0)}
                            min={1}
                            max={100}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => searchVehiclesInArea()}
                          disabled={isSearching || !searchLat || !searchLng || searchRadius <= 0}
                          className="flex items-center"
                        >
                          {isSearching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="mr-2 h-4 w-4" />
                          )}
                          Search
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {searchResults && searchResults.vehicles && (
                    <div>
                      <h3 className="font-medium mb-2">Search Results</h3>
                      {renderMap()}
                      
                      <div className="mt-4">
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Distance</TableHead>
                                <TableHead>Last Update</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {searchResults.vehicles.map((vehicle: TechnicianWithLocation) => (
                                <TableRow key={`search-${vehicle.id}`}>
                                  <TableCell className="font-medium">
                                    <div>
                                      {vehicle.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {vehicle.make} {vehicle.model}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {/* Distance calculation would be done on server */}
                                    <span className="text-sm">Within {searchRadius} miles</span>
                                  </TableCell>
                                  <TableCell>
                                    {vehicle.lastLocationUpdate ? (
                                      formatLastUpdate(vehicle.lastLocationUpdate as string)
                                    ) : (
                                      <span className="text-gray-400">Never</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleVehicleMarkerClick(vehicle.id)}
                                      className="h-8 px-2"
                                    >
                                      <MapPin className="h-4 w-4 mr-1" />
                                      <span className="sr-only md:not-sr-only">Locate</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vehicle Location History</CardTitle>
                      <CardDescription>
                        View the movement history of a selected vehicle
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Vehicle</label>
                          <Select value={selectedVehicle?.toString() || ''} onValueChange={(value) => setSelectedVehicle(Number(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {vehicles && vehicles.map((vehicle: TechnicianWithLocation) => (
                                <SelectItem key={`select-${vehicle.id}`} value={vehicle.id.toString()}>
                                  {vehicle.name} - {vehicle.make} {vehicle.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Start Date</label>
                          <Input
                            type="date"
                            value={historyDateRange.start}
                            onChange={(e) => setHistoryDateRange({...historyDateRange, start: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">End Date</label>
                          <Input
                            type="date"
                            value={historyDateRange.end}
                            onChange={(e) => setHistoryDateRange({...historyDateRange, end: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end space-x-2">
                        {showHistoryPath && (
                          <Button
                            variant="outline"
                            onClick={clearHistoryDisplay}
                            className="flex items-center"
                          >
                            Clear Path
                          </Button>
                        )}
                        <Button
                          onClick={loadVehicleHistory}
                          disabled={isLoadingHistory || !selectedVehicle}
                          className="flex items-center"
                        >
                          {isLoadingHistory ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <History className="mr-2 h-4 w-4" />
                          )}
                          Load History
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {showHistoryPath && historyPath.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Location History</h3>
                      {renderMap()}
                      
                      <div className="mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>History Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-sm font-medium">Points:</span>
                                  <span className="text-sm ml-2">{historyPath.length}</span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Period:</span>
                                  <span className="text-sm ml-2">
                                    {new Date(historyDateRange.start).toLocaleDateString()} - {new Date(historyDateRange.end).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Vehicle:</span>
                                  <span className="text-sm ml-2">
                                    {selectedVehicle ? getVehicleById(selectedVehicle)?.name : 'None selected'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}