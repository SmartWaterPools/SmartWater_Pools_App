import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, MarkerClusterer, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, MapPin, Clock, User, Route, Filter, Briefcase, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner"; 
import { useGoogleMaps } from "../../contexts/GoogleMapsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
  lat: 33.448376,
  lng: -82.041256
};

type ViewFilter = 'all_maintenances' | 'all_work_orders' | 'today_stops' | 'today_tomorrow' | 'by_technician' | 'by_route' | 'by_priority' | 'by_status';

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
  { value: 'all_maintenances', label: 'All Maintenances' },
  { value: 'all_work_orders', label: 'All Work Orders' },
  { value: 'today_stops', label: "Today's Stops" },
  { value: 'today_tomorrow', label: 'Today + Tomorrow' },
  { value: 'by_technician', label: 'By Technician' },
  { value: 'by_route', label: 'By Route' },
  { value: 'by_priority', label: 'By Priority' },
  { value: 'by_status', label: 'By Status' },
];

interface DisplayCard {
  id: number;
  type: 'maintenance' | 'work_order' | 'route_stop';
  title: string;
  address: string;
  date: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  technicianName?: string;
  priority?: string;
  subtitle?: string;
  original: any;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateOnly(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
}

interface MaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading?: boolean;
  selectedView?: string;
  selectedTechnician?: number | null;
  selectedDay?: string | null;
  workOrders?: any[];
  routes?: any[];
  technicians?: any[];
  onViewChange?: (view: string) => void;
  onTechnicianChange?: (techId: number | null) => void;
  selectedRouteId?: number | null;
  onRouteChange?: (routeId: number | null) => void;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceMapView({ 
  maintenances, 
  isLoading = false,
  selectedView = 'all_maintenances',
  selectedTechnician,
  selectedDay,
  workOrders = [],
  routes = [],
  technicians = [],
  onViewChange,
  onTechnicianChange,
  selectedRouteId,
  onRouteChange,
  onStatusUpdate,
  isUpdatingStatus,
  selectedMaintenance: propSelectedMaintenance
}: MaintenanceMapViewProps) {
  const [, navigate] = useLocation();
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(propSelectedMaintenance || null);
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Update selected maintenance when prop changes
  useEffect(() => {
    if (propSelectedMaintenance) {
      setSelectedMaintenance(propSelectedMaintenance);
    }
  }, [propSelectedMaintenance]);

  const { apiKey, isLoaded } = useGoogleMaps();

  const { data: routeAssignments = [] } = useQuery<any[]>({
    queryKey: [`/api/bazza/routes/${selectedRouteId}/assignments`],
    enabled: selectedView === 'by_route' && !!selectedRouteId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: routeStops = [] } = useQuery<any[]>({
    queryKey: [`/api/bazza/routes/${selectedRouteId}/stops`],
    enabled: selectedView === 'by_route' && !!selectedRouteId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: clientRecordsList = [] } = useQuery<{ id: number; userId: number; name: string; companyName?: string }[]>({
    queryKey: ['/api/clients/client-records'],
    staleTime: 5 * 60 * 1000,
  });

  const clientNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of clientRecordsList) {
      map[c.id] = c.name || c.companyName || `Client #${c.id}`;
    }
    return map;
  }, [clientRecordsList]);

  const clientCoordMap = useMemo(() => {
    const map: Record<number, { lat: number; lng: number }> = {};
    for (const m of maintenances) {
      const clientId = (m.client as any)?.id || m.client?.client?.id;
      const lat = (m.client as any)?.latitude;
      const lng = (m.client as any)?.longitude;
      if (clientId && lat && lng && !map[clientId]) {
        map[clientId] = { lat, lng };
      }
    }
    return map;
  }, [maintenances]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);

  const navigateToMaintenance = (id: number) => {
    navigate(`/maintenance/${id}`);
  };

  const displayCards = useMemo((): DisplayCard[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);

    const maintenanceToCard = (m: MaintenanceWithDetails): DisplayCard => ({
      id: m.id,
      type: 'maintenance',
      title: (m.client as any)?.name || m.client?.user?.name || 'Client',
      address: (m.client as any)?.address || m.client?.user?.address || m.client?.client?.address || 'No address',
      date: m.scheduleDate,
      status: (m as any).isRouted ? 'routed' : m.status,
      latitude: (m.client as any)?.latitude,
      longitude: (m.client as any)?.longitude,
      technicianName: (m.technician as any)?.name || m.technician?.user?.name,
      original: m,
    });

    const workOrderToCard = (wo: any): DisplayCard => {
      let lat = wo.latitude || null;
      let lng = wo.longitude || null;
      if (!lat && !lng && wo.clientId && clientCoordMap[wo.clientId]) {
        lat = clientCoordMap[wo.clientId].lat;
        lng = clientCoordMap[wo.clientId].lng;
      }
      return {
        id: wo.id,
        type: 'work_order',
        title: wo.title || `WO #${wo.id}`,
        address: wo.address || 'No address',
        date: wo.scheduledDate || '',
        status: wo.status || 'pending',
        latitude: lat,
        longitude: lng,
        priority: wo.priority,
        original: wo,
      };
    };

    const futureMaintenances = maintenances.filter(m => {
      const d = parseDateOnly(m.scheduleDate);
      return d >= todayStr;
    });

    switch (selectedView) {
      case 'all_maintenances':
        return futureMaintenances.map(maintenanceToCard);

      case 'all_work_orders':
        return workOrders.map(workOrderToCard);

      case 'today_stops': {
        const todayM = maintenances.filter(m => parseDateOnly(m.scheduleDate) === todayStr).map(maintenanceToCard);
        const todayWO = workOrders.filter(wo => wo.scheduledDate && parseDateOnly(wo.scheduledDate) === todayStr).map(workOrderToCard);
        return [...todayM, ...todayWO];
      }

      case 'today_tomorrow': {
        const rangeM = maintenances.filter(m => {
          const d = parseDateOnly(m.scheduleDate);
          return d === todayStr || d === tomorrowStr;
        }).map(maintenanceToCard);
        const rangeWO = workOrders.filter(wo => {
          if (!wo.scheduledDate) return false;
          const d = parseDateOnly(wo.scheduledDate);
          return d === todayStr || d === tomorrowStr;
        }).map(workOrderToCard);
        return [...rangeM, ...rangeWO];
      }

      case 'by_technician':
        if (!selectedTechnician) return futureMaintenances.map(maintenanceToCard);
        return futureMaintenances
          .filter(m => m.technicianId === selectedTechnician)
          .map(maintenanceToCard);

      case 'by_route': {
        if (!selectedRouteId) return futureMaintenances.map(maintenanceToCard);
        
        // Create a map of assignments by stop ID for quick lookup
        const assignmentsByStopId = new Map<number, any>();
        routeAssignments.forEach((a: any) => {
          if (a.routeStopId) {
            assignmentsByStopId.set(a.routeStopId, a);
          }
        });

        // Create a map of client coordinates for stops that don't have direct coordinates
        const clientCoordMapForStops: Record<number, { lat: number; lng: number }> = {};
        maintenances.forEach(m => {
          const clientId = (m.client as any)?.id || m.client?.client?.id;
          const lat = (m.client as any)?.latitude;
          const lng = (m.client as any)?.longitude;
          if (clientId && lat && lng && !clientCoordMapForStops[clientId]) {
            clientCoordMapForStops[clientId] = { lat, lng };
          }
        });

        // Convert route stops to cards
        const stopCards = routeStops.map((stop: any): DisplayCard => {
          const assignment = assignmentsByStopId.get(stop.id);
          
          // Parse coordinates - they come as strings from API but need to be numbers
          let latitude: number | null = null;
          let longitude: number | null = null;

          if (stop.addressLat && stop.addressLng) {
            latitude = typeof stop.addressLat === 'string' ? parseFloat(stop.addressLat) : stop.addressLat;
            longitude = typeof stop.addressLng === 'string' ? parseFloat(stop.addressLng) : stop.addressLng;
          }

          // If no coordinates from stop but we have a client, try to use client coordinates
          if ((latitude === null || longitude === null) && stop.clientId && clientCoordMapForStops[stop.clientId]) {
            latitude = clientCoordMapForStops[stop.clientId].lat;
            longitude = clientCoordMapForStops[stop.clientId].lng;
          }

          // If there's an assignment with a maintenance, show maintenance details
          if (assignment?.maintenanceId && assignment.maintenance) {
            const maintenance = assignment.maintenance;
            return {
              id: stop.id,
              type: 'maintenance',
              title: (maintenance.client as any)?.name || maintenance.client?.user?.name || 'Client',
              address: (maintenance.client as any)?.address || maintenance.client?.user?.address || maintenance.client?.client?.address || 'No address',
              date: maintenance.scheduleDate,
              status: maintenance.status,
              latitude,
              longitude,
              technicianName: (maintenance.technician as any)?.name || maintenance.technician?.user?.name,
              subtitle: `Stop #${stop.orderIndex || stop.position || 'N/A'} - ${clientNameMap[stop.clientId] || `Client #${stop.clientId}`}`,
              original: maintenance,
            };
          }

          // If there's an assignment but no maintenance yet, show a placeholder
          if (assignment) {
            return {
              id: stop.id,
              type: 'route_stop',
              title: `Stop #${stop.orderIndex || stop.position || 'N/A'}`,
              subtitle: clientNameMap[stop.clientId] || `Client #${stop.clientId}`,
              address: stop.customInstructions || stop.notes || 'No address provided',
              date: '',
              status: 'assigned',
              latitude,
              longitude,
              original: stop,
            };
          }

          // No assignment - show basic stop info
          return {
            id: stop.id,
            type: 'route_stop',
            title: `Stop #${stop.orderIndex || stop.position || 'N/A'}`,
            subtitle: clientNameMap[stop.clientId] || `Client #${stop.clientId}`,
            address: stop.customInstructions || stop.notes || 'No address provided',
            date: '',
            status: 'unassigned',
            latitude,
            longitude,
            original: stop,
          };
        });

        return stopCards;
      }

      case 'by_priority':
        if (filterPriority === 'all') return workOrders.map(workOrderToCard);
        return workOrders
          .filter(wo => wo.priority?.toLowerCase() === filterPriority.toLowerCase())
          .map(workOrderToCard);

      case 'by_status':
        if (filterStatus === 'all') return futureMaintenances.map(maintenanceToCard);
        return maintenances
          .filter(m => m.status.toLowerCase() === filterStatus.toLowerCase())
          .map(maintenanceToCard);

      default:
        return futureMaintenances.map(maintenanceToCard);
    }
  }, [maintenances, workOrders, selectedView, selectedTechnician, selectedRouteId, routes, filterPriority, filterStatus, routeAssignments, routeStops, clientCoordMap, clientNameMap]);

  const bounds = useMemo(() => {
    if (!displayCards?.length || !isLoaded || typeof google === 'undefined' || !google.maps) {
      return null;
    }
    
    try {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;

      displayCards.forEach(card => {
        if (card.latitude && card.longitude) {
          bounds.extend({ lat: card.latitude, lng: card.longitude });
          hasValidCoordinates = true;
        }
      });

      return hasValidCoordinates ? bounds : null;
    } catch (error) {
      console.error("Error computing map bounds:", error);
      return null;
    }
  }, [displayCards, isLoaded]);

  useEffect(() => {
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds);
      if (displayCards.length === 1) {
        mapInstance.setZoom(14);
      }
    }
  }, [mapInstance, bounds, displayCards.length]);

  // Show loading state when the map isn't loaded or when data is loading
  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center h-[600px] bg-gray-50 border rounded-lg">
        <Spinner size="lg" />
        <span className="ml-2 text-gray-500">Loading map...</span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col justify-center items-center h-[600px] bg-gray-50 border rounded-lg">
        <p className="text-red-500 mb-2">Google Maps API key is not configured.</p>
        <p className="text-sm text-gray-600">Please add your Google Maps API key to environment variables.</p>
      </div>
    );
  }

  const navigateToRoutes = () => {
    navigate("/maintenance/routes");
  };

  const handleCardClick = (card: DisplayCard) => {
    setSelectedCard(card);
    if (card.type === 'maintenance') {
      setSelectedMaintenance(card.original);
    } else {
      setSelectedMaintenance(null);
    }
    if (mapInstance && card.latitude && card.longitude) {
      mapInstance.panTo({ lat: card.latitude, lng: card.longitude });
      mapInstance.setZoom(15);
    }
  };

  const activeLabel = VIEW_OPTIONS.find(o => o.value === selectedView)?.label || 'All Maintenances';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full h-full">
      <div className="lg:col-span-1 bg-gray-50 p-3 rounded-lg border overflow-y-auto h-[600px]">
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filter View</span>
            </div>
            <button 
              onClick={navigateToRoutes}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors py-1 px-2 rounded-md flex items-center"
            >
              <Route className="h-3.5 w-3.5 mr-1" />
              <span>Routes</span>
            </button>
          </div>
          <Select value={selectedView} onValueChange={(val) => onViewChange?.(val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedView === 'by_technician' && (
            <Select 
              value={selectedTechnician ? String(selectedTechnician) : 'all'} 
              onValueChange={(val) => onTechnicianChange?.(val === 'all' ? null : Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((tech: any) => (
                  <SelectItem key={tech.id} value={String(tech.id)}>
                    {tech.name || tech.user?.name || `Tech #${tech.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedView === 'by_route' && (
            <Select 
              value={selectedRouteId ? String(selectedRouteId) : 'all'} 
              onValueChange={(val) => onRouteChange?.(val === 'all' ? null : Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map((route: any) => (
                  <SelectItem key={route.id} value={String(route.id)}>
                    {route.name} ({route.dayOfWeek})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedView === 'by_priority' && (
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          )}

          {selectedView === 'by_status' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">{activeLabel}</h2>
          <Badge variant="secondary" className="text-xs">{displayCards.length}</Badge>
        </div>

        {(() => {
          const noLocationCount = displayCards.filter(c => !c.latitude || !c.longitude).length;
          return noLocationCount > 0 ? (
            <div className="flex items-center gap-1.5 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{noLocationCount} item{noLocationCount > 1 ? 's' : ''} without map location</span>
            </div>
          ) : null;
        })()}

        {displayCards.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No items found
          </div>
        ) : (
          <div className="space-y-2">
            {displayCards.map(card => (
              <Card 
                key={`${card.type}-${card.id}`}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedCard?.id === card.id && selectedCard?.type === card.type 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => handleCardClick(card)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {card.type === 'work_order' && (
                        <Briefcase className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{card.title}</h3>
                        {card.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {card.priority && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {card.priority}
                        </Badge>
                      )}
                      <Badge className={`${getStatusClasses(card.status).bg} ${getStatusClasses(card.status).text} text-[10px] px-1.5`}>
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs">
                    {card.date && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{formatDate(card.date)}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                      <span className="truncate">{card.address}</span>
                    </div>
                    {card.technicianName && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{card.technicianName}</span>
                      </div>
                    )}
                  </div>
                  {card.type === 'maintenance' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToMaintenance(card.id);
                      }}
                      className="w-full mt-2 py-1 px-2 bg-primary text-primary-foreground text-xs rounded-sm hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </button>
                  )}
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
        <MarkerClusterer>
          {(clusterer) => (
            <div>
              {displayCards.map((card) => {
                return card.latitude && card.longitude ? (
                  <Marker
                    key={`${card.type}-${card.id}`}
                    position={{ lat: card.latitude, lng: card.longitude }}
                    onClick={() => handleCardClick(card)}
                    clusterer={clusterer}
                    icon={
                      card.type === 'work_order' ? {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      } : card.type === 'route_stop' ? {
                        url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                      } : undefined
                    }
                  />
                ) : null;
              })}
            </div>
          )}
        </MarkerClusterer>

        {selectedCard && selectedCard.latitude && selectedCard.longitude && (
          <InfoWindow
            position={{ lat: selectedCard.latitude, lng: selectedCard.longitude }}
            onCloseClick={() => { setSelectedCard(null); setSelectedMaintenance(null); }}
          >
            <Card className="w-72 border-none shadow-none">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{selectedCard.title}</h3>
                  <Badge className={`${getStatusClasses(selectedCard.status).bg} ${getStatusClasses(selectedCard.status).text}`}>
                    {selectedCard.status}
                  </Badge>
                </div>
                <div className="text-sm mb-2">
                  <p><span className="font-medium">Address:</span> {selectedCard.address}</p>
                  {selectedCard.date && (
                    <p><span className="font-medium">Date:</span> {formatDate(selectedCard.date)}</p>
                  )}
                  {selectedCard.technicianName && (
                    <p><span className="font-medium">Technician:</span> {selectedCard.technicianName}</p>
                  )}
                  {selectedCard.priority && (
                    <p><span className="font-medium">Priority:</span> {selectedCard.priority}</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {selectedCard.type === 'maintenance' && (
                    <button 
                      onClick={() => navigateToMaintenance(selectedCard.id)}
                      className="flex-1 py-1 px-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </button>
                  )}
                  <button 
                    onClick={() => navigateToRoutes()}
                    className="py-1 px-2 bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm rounded-md flex items-center transition-colors"
                  >
                    <Route className="h-3.5 w-3.5 mr-1" />
                    Routes
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