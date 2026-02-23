import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GoogleMap, MarkerClusterer, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, MapPin, Clock, User, Route, Filter, Briefcase, Info, MousePointer2, Square, Move, X, CheckSquare, ChevronDown, ChevronUp, HelpCircle, Pencil } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner"; 
import { useGoogleMaps } from "../../contexts/GoogleMapsContext";
import { Button } from "../../components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { 
  MaintenanceWithDetails, 
  getStatusClasses, 
  formatDate 
} from "../../lib/types";

const containerStyle = {
  width: '100%',
  height: '100%',
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

type MapTool = 'pointer' | 'select_rect' | 'select_lasso';

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

function createNumberedMarkerIcon(number: number, color: string, isSelected: boolean): string {
  const bgColor = isSelected ? '#1d4ed8' : color;
  const borderColor = isSelected ? '#1e40af' : darkenColor(color);
  const size = isSelected ? 36 : 32;
  const fontSize = number > 99 ? 10 : number > 9 ? 11 : 13;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${bgColor}" stroke="${borderColor}" stroke-width="2" filter="url(#shadow)"/>
      <text x="${size/2}" y="${size/2 + 1}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="${fontSize}">${number}</text>
      <polygon points="${size/2 - 5},${size - 2} ${size/2},${size + 6} ${size/2 + 5},${size - 2}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function darkenColor(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - 40);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
  const b = Math.max(0, (num & 0x0000FF) - 40);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function getMarkerColor(card: DisplayCard): string {
  switch (card.status.toLowerCase()) {
    case 'scheduled': return '#22c55e';
    case 'in_progress': return '#f59e0b';
    case 'completed': return '#6b7280';
    case 'pending': return '#f97316';
    case 'routed': return '#8b5cf6';
    case 'assigned': return '#3b82f6';
    case 'unassigned': return '#ef4444';
    default: return '#3b82f6';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'maintenance': return '#22c55e';
    case 'work_order': return '#3b82f6';
    case 'route_stop': return '#f97316';
    default: return '#6b7280';
  }
}

function isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > point.lng) !== (yj > point.lng)) && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
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

function MapLegend({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden" style={{ minWidth: isExpanded ? 280 : 'auto' }}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Map Key</span>
        </div>
        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Marker Types</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 border border-green-600 flex-shrink-0" />
                <span className="text-xs text-gray-600">Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600 flex-shrink-0" />
                <span className="text-xs text-gray-600">Work Order</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-600 flex-shrink-0" />
                <span className="text-xs text-gray-600">Route Stop</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Status Colors</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Routed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Unassigned</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Map Tools</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MousePointer2 className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Click markers for details</span>
              </div>
              <div className="flex items-center gap-2">
                <Square className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Rectangle select stops</span>
              </div>
              <div className="flex items-center gap-2">
                <Pencil className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Freehand draw to select</span>
              </div>
              <div className="flex items-center gap-2">
                <Move className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">Group move selected stops</span>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">Numbered markers show stop order. Click any number for appointment details.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MapToolbar({ activeTool, onToolChange, selectedCount, onClearSelection, onMoveSelected }: {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onMoveSelected: () => void;
}) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-1.5 flex items-center gap-1">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToolChange('pointer')}
              className={`p-2 rounded-md transition-colors ${activeTool === 'pointer' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Pointer Tool</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToolChange('select_rect')}
              className={`p-2 rounded-md transition-colors ${activeTool === 'select_rect' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Square className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Rectangle Select</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToolChange('select_lasso')}
              className={`p-2 rounded-md transition-colors ${activeTool === 'select_lasso' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Freehand Select</p></TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {selectedCount > 0 && (
          <>
            <div className="flex items-center gap-1 px-2">
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">{selectedCount} selected</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onMoveSelected}
                  className="p-2 rounded-md hover:bg-green-100 text-green-600 transition-colors"
                >
                  <Move className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Move Selected</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClearSelection}
                  className="p-2 rounded-md hover:bg-red-100 text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Clear Selection</p></TooltipContent>
            </Tooltip>
          </>
        )}
      </TooltipProvider>
    </div>
  );
}

function AppointmentDetailDialog({ card, open, onClose, onNavigate }: {
  card: DisplayCard | null;
  open: boolean;
  onClose: () => void;
  onNavigate: (id: number) => void;
}) {
  if (!card) return null;
  
  const original = card.original;
  const statusClasses = getStatusClasses(card.status);
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {card.type === 'work_order' && <Briefcase className="h-4 w-4 text-blue-500" />}
            {card.type === 'maintenance' && <CalendarIcon className="h-4 w-4 text-green-500" />}
            {card.type === 'route_stop' && <Route className="h-4 w-4 text-orange-500" />}
            <span>{card.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${statusClasses.bg} ${statusClasses.text}`}>
              {card.status}
            </Badge>
            {card.priority && (
              <Badge variant="outline" className={
                card.priority.toLowerCase() === 'high' ? 'border-red-300 text-red-700' :
                card.priority.toLowerCase() === 'medium' ? 'border-amber-300 text-amber-700' :
                'border-gray-300 text-gray-600'
              }>
                {card.priority} priority
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {card.type.replace('_', ' ')}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Address</p>
                <p className="text-gray-500">{card.address}</p>
              </div>
            </div>

            {card.date && (
              <div className="flex items-start gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Scheduled Date</p>
                  <p className="text-gray-500">{formatDate(card.date)}</p>
                </div>
              </div>
            )}

            {card.technicianName && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Technician</p>
                  <p className="text-gray-500">{card.technicianName}</p>
                </div>
              </div>
            )}

            {card.subtitle && (
              <div className="flex items-start gap-2">
                <Route className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Route Position</p>
                  <p className="text-gray-500">{card.subtitle}</p>
                </div>
              </div>
            )}

            {original?.serviceType && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Service Type</p>
                  <p className="text-gray-500">{original.serviceType}</p>
                </div>
              </div>
            )}

            {original?.notes && (
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Notes</p>
                  <p className="text-gray-500 text-xs">{original.notes}</p>
                </div>
              </div>
            )}

            {original?.estimatedDuration && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Duration</p>
                  <p className="text-gray-500">{original.estimatedDuration} min</p>
                </div>
              </div>
            )}
          </div>

          {card.type === 'maintenance' && (
            <Button
              onClick={() => onNavigate(card.id)}
              className="w-full"
              size="sm"
            >
              View Full Details
            </Button>
          )}
          {card.type === 'work_order' && (
            <Button
              onClick={() => onNavigate(card.id)}
              className="w-full"
              size="sm"
            >
              View Work Order
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
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
  
  const [activeTool, setActiveTool] = useState<MapTool>('pointer');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [detailDialogCard, setDetailDialogCard] = useState<DisplayCard | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ lat: number; lng: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ lat: number; lng: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ lat: number; lng: number }[]>([]);
  const lassoOverlayRef = useRef<google.maps.Polyline | null>(null);
  const rectOverlayRef = useRef<google.maps.Rectangle | null>(null);
  
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetRoute, setMoveTargetRoute] = useState<string>('');
  const [moveTargetTech, setMoveTargetTech] = useState<string>('');

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

  const { data: clientRecordsList = [] } = useQuery<{ id: number; userId: number; name: string; companyName?: string; address?: string; latitude?: number; longitude?: number }[]>({
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

  const clientAddressMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of clientRecordsList) {
      if (c.address) map[c.id] = c.address;
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

  const navigateToItem = (card: DisplayCard) => {
    if (card.type === 'maintenance') {
      navigate(`/maintenance/${card.id}`);
    } else if (card.type === 'work_order') {
      navigate(`/work-orders/${card.id}`);
    }
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
        
        const assignmentsByStopId = new Map<number, any>();
        routeAssignments.forEach((a: any) => {
          if (a.routeStopId) {
            assignmentsByStopId.set(a.routeStopId, a);
          }
        });

        const clientCoordMapForStops: Record<number, { lat: number; lng: number }> = {};
        maintenances.forEach(m => {
          const clientId = (m.client as any)?.id || m.client?.client?.id;
          const lat = (m.client as any)?.latitude;
          const lng = (m.client as any)?.longitude;
          if (clientId && lat && lng && !clientCoordMapForStops[clientId]) {
            clientCoordMapForStops[clientId] = { lat, lng };
          }
        });

        const stopCards = routeStops.map((stop: any): DisplayCard => {
          const assignment = assignmentsByStopId.get(stop.id);
          
          let latitude: number | null = null;
          let longitude: number | null = null;

          if (stop.addressLat && stop.addressLng) {
            latitude = typeof stop.addressLat === 'string' ? parseFloat(stop.addressLat) : stop.addressLat;
            longitude = typeof stop.addressLng === 'string' ? parseFloat(stop.addressLng) : stop.addressLng;
          }

          if ((latitude === null || longitude === null) && stop.clientId && clientCoordMapForStops[stop.clientId]) {
            latitude = clientCoordMapForStops[stop.clientId].lat;
            longitude = clientCoordMapForStops[stop.clientId].lng;
          }

          if ((latitude === null || longitude === null) && stop.clientId) {
            const cr = clientRecordsList.find(c => c.id === stop.clientId);
            if (cr?.latitude && cr?.longitude) {
              latitude = cr.latitude;
              longitude = cr.longitude;
            }
          }

          const stopClientName = clientNameMap[stop.clientId] || `Client #${stop.clientId}`;
          const stopClientAddress = clientAddressMap[stop.clientId] || stop.customInstructions || stop.notes || 'No address provided';

          if (assignment?.maintenanceId && assignment.maintenance) {
            const maintenance = assignment.maintenance;
            return {
              id: stop.id,
              type: 'maintenance',
              title: stopClientName,
              address: stopClientAddress,
              date: maintenance.scheduleDate,
              status: maintenance.status,
              latitude,
              longitude,
              technicianName: (maintenance.technician as any)?.name || maintenance.technician?.user?.name,
              subtitle: `Stop #${stop.orderIndex || stop.position || 'N/A'}`,
              original: maintenance,
            };
          }

          if (assignment) {
            return {
              id: stop.id,
              type: 'route_stop',
              title: stopClientName,
              subtitle: `Stop #${stop.orderIndex || stop.position || 'N/A'}`,
              address: stopClientAddress,
              date: '',
              status: 'assigned',
              latitude,
              longitude,
              original: stop,
            };
          }

          return {
            id: stop.id,
            type: 'route_stop',
            title: stopClientName,
            subtitle: `Stop #${stop.orderIndex || stop.position || 'N/A'}`,
            address: stopClientAddress,
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
  }, [maintenances, workOrders, selectedView, selectedTechnician, selectedRouteId, routes, filterPriority, filterStatus, routeAssignments, routeStops, clientCoordMap, clientNameMap, clientAddressMap, clientRecordsList]);

  const cardKey = (card: DisplayCard) => `${card.type}-${card.id}`;

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

  const handleToolChange = useCallback((tool: MapTool) => {
    setActiveTool(tool);
    if (tool === 'pointer') {
      cleanupDrawingOverlays();
    }
    if (mapInstance) {
      mapInstance.setOptions({ draggable: tool === 'pointer' });
    }
  }, [mapInstance]);

  const cleanupDrawingOverlays = useCallback(() => {
    if (lassoOverlayRef.current) {
      lassoOverlayRef.current.setMap(null);
      lassoOverlayRef.current = null;
    }
    if (rectOverlayRef.current) {
      rectOverlayRef.current.setMap(null);
      rectOverlayRef.current = null;
    }
    setDrawStart(null);
    setDrawEnd(null);
    setLassoPoints([]);
    setIsDrawing(false);
  }, []);

  const selectCardsInBounds = useCallback((bounds: google.maps.LatLngBounds) => {
    const newSelected = new Set(selectedCardIds);
    displayCards.forEach(card => {
      if (card.latitude && card.longitude) {
        const pos = new google.maps.LatLng(card.latitude, card.longitude);
        if (bounds.contains(pos)) {
          newSelected.add(cardKey(card));
        }
      }
    });
    setSelectedCardIds(newSelected);
  }, [displayCards, selectedCardIds]);

  const selectCardsInPolygon = useCallback((polygon: { lat: number; lng: number }[]) => {
    if (polygon.length < 3) return;
    const newSelected = new Set(selectedCardIds);
    displayCards.forEach(card => {
      if (card.latitude && card.longitude) {
        if (isPointInPolygon({ lat: card.latitude, lng: card.longitude }, polygon)) {
          newSelected.add(cardKey(card));
        }
      }
    });
    setSelectedCardIds(newSelected);
  }, [displayCards, selectedCardIds]);

  const handleMapMouseDown = useCallback((e: google.maps.MapMouseEvent) => {
    if (activeTool === 'pointer' || !e.latLng) return;
    
    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setIsDrawing(true);
    setDrawStart(point);

    if (activeTool === 'select_rect') {
      setDrawEnd(point);
      if (rectOverlayRef.current) {
        rectOverlayRef.current.setMap(null);
      }
      rectOverlayRef.current = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(point, point),
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        strokeColor: '#3b82f6',
        strokeWeight: 2,
        strokeOpacity: 0.6,
        map: mapInstance,
        clickable: false,
      });
    } else if (activeTool === 'select_lasso') {
      setLassoPoints([point]);
      if (lassoOverlayRef.current) {
        lassoOverlayRef.current.setMap(null);
      }
      lassoOverlayRef.current = new google.maps.Polyline({
        path: [point],
        strokeColor: '#3b82f6',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        map: mapInstance,
        clickable: false,
      });
    }
  }, [activeTool, mapInstance]);

  const handleMapMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !e.latLng) return;

    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (activeTool === 'select_rect' && drawStart) {
      setDrawEnd(point);
      if (rectOverlayRef.current) {
        const sw = { lat: Math.min(drawStart.lat, point.lat), lng: Math.min(drawStart.lng, point.lng) };
        const ne = { lat: Math.max(drawStart.lat, point.lat), lng: Math.max(drawStart.lng, point.lng) };
        rectOverlayRef.current.setBounds(new google.maps.LatLngBounds(sw, ne));
      }
    } else if (activeTool === 'select_lasso') {
      setLassoPoints(prev => [...prev, point]);
      if (lassoOverlayRef.current) {
        const path = lassoOverlayRef.current.getPath();
        path.push(new google.maps.LatLng(point.lat, point.lng));
      }
    }
  }, [isDrawing, activeTool, drawStart]);

  const handleMapMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (activeTool === 'select_rect' && drawStart && drawEnd) {
      const sw = { lat: Math.min(drawStart.lat, drawEnd.lat), lng: Math.min(drawStart.lng, drawEnd.lng) };
      const ne = { lat: Math.max(drawStart.lat, drawEnd.lat), lng: Math.max(drawStart.lng, drawEnd.lng) };
      const bounds = new google.maps.LatLngBounds(sw, ne);
      selectCardsInBounds(bounds);
    } else if (activeTool === 'select_lasso' && lassoPoints.length >= 3) {
      selectCardsInPolygon(lassoPoints);
    }

    setTimeout(() => {
      cleanupDrawingOverlays();
    }, 300);
  }, [isDrawing, activeTool, drawStart, drawEnd, lassoPoints, selectCardsInBounds, selectCardsInPolygon, cleanupDrawingOverlays]);

  const handleMarkerClick = useCallback((card: DisplayCard) => {
    if (activeTool !== 'pointer') {
      const key = cardKey(card);
      setSelectedCardIds(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return;
    }
    
    setDetailDialogCard(card);
    setDetailDialogOpen(true);
    setSelectedCard(card);
    if (card.type === 'maintenance') {
      setSelectedMaintenance(card.original);
    } else {
      setSelectedMaintenance(null);
    }
  }, [activeTool]);

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

  const handleCardDoubleClick = (card: DisplayCard) => {
    setDetailDialogCard(card);
    setDetailDialogOpen(true);
  };

  const clearSelection = () => {
    setSelectedCardIds(new Set());
  };

  const handleMoveSelected = () => {
    setShowMoveDialog(true);
  };

  const executeMoveSelected = () => {
    setShowMoveDialog(false);
    setSelectedCardIds(new Set());
  };

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

  const activeLabel = VIEW_OPTIONS.find(o => o.value === selectedView)?.label || 'All Maintenances';

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full" style={{ height: '680px' }}>
        <div className="lg:col-span-1 bg-gray-50 p-3 rounded-lg border overflow-y-auto">
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

          {selectedCardIds.size > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <CheckSquare className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700 font-medium">{selectedCardIds.size} selected</span>
              <button onClick={clearSelection} className="ml-auto text-xs text-blue-500 hover:text-blue-700">
                Clear
              </button>
            </div>
          )}

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
              {displayCards.map((card, index) => {
                const key = cardKey(card);
                const isSelected = selectedCardIds.has(key);
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                        : selectedCard?.id === card.id && selectedCard?.type === card.type 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleCardClick(card)}
                    onDoubleClick={() => handleCardDoubleClick(card)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: getMarkerColor(card) }}>
                            {index + 1}
                          </div>
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
                      <div className="mt-2 flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailDialogCard(card);
                            setDetailDialogOpen(true);
                          }}
                          className="flex-1 py-1 px-2 bg-primary text-primary-foreground text-xs rounded-sm hover:bg-primary/90 transition-colors"
                        >
                          View Details
                        </button>
                        {activeTool !== 'pointer' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCardIds(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                            className={`py-1 px-2 text-xs rounded-sm transition-colors ${
                              isSelected 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? 'Deselect' : 'Select'}
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="lg:col-span-3 relative rounded-lg overflow-hidden border">
          <div className="absolute top-3 left-3 z-10">
            <MapToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              selectedCount={selectedCardIds.size}
              onClearSelection={clearSelection}
              onMoveSelected={handleMoveSelected}
            />
          </div>
          
          <div className="absolute top-3 right-3 z-10" style={{ maxWidth: '300px' }}>
            <MapLegend isExpanded={legendExpanded} onToggle={() => setLegendExpanded(!legendExpanded)} />
          </div>

          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={7}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              fullscreenControl: true,
              mapTypeControl: true,
              draggable: activeTool === 'pointer',
              draggableCursor: activeTool === 'pointer' ? undefined : 'crosshair',
            }}
          >
            <MarkerClusterer>
              {(clusterer) => (
                <div>
                  {displayCards.map((card, index) => {
                    if (!card.latitude || !card.longitude) return null;
                    const key = cardKey(card);
                    const isSelected = selectedCardIds.has(key);
                    const color = getMarkerColor(card);
                    
                    return (
                      <Marker
                        key={key}
                        position={{ lat: card.latitude, lng: card.longitude }}
                        onClick={() => handleMarkerClick(card)}
                        clusterer={clusterer}
                        icon={{
                          url: createNumberedMarkerIcon(index + 1, color, isSelected),
                          scaledSize: new google.maps.Size(isSelected ? 36 : 32, isSelected ? 44 : 40),
                          anchor: new google.maps.Point(isSelected ? 18 : 16, isSelected ? 44 : 40),
                        }}
                        zIndex={isSelected ? 1000 : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </MarkerClusterer>

            {showRoutes && null}
          </GoogleMap>
        </div>
      </div>

      <AppointmentDetailDialog
        card={detailDialogCard}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setDetailDialogCard(null);
        }}
        onNavigate={(id) => {
          setDetailDialogOpen(false);
          if (detailDialogCard?.type === 'maintenance') {
            navigate(`/maintenance/${id}`);
          } else if (detailDialogCard?.type === 'work_order') {
            navigate(`/work-orders/${id}`);
          }
        }}
      />

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Move className="h-4 w-4" />
              Move {selectedCardIds.size} Selected Stops
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose where to move the selected stops. You can assign them to a different route or technician.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Assign to Route</label>
                <Select value={moveTargetRoute} onValueChange={setMoveTargetRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Route</SelectItem>
                    {routes.map((route: any) => (
                      <SelectItem key={route.id} value={String(route.id)}>
                        {route.name} ({route.dayOfWeek})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Assign to Technician</label>
                <Select value={moveTargetTech} onValueChange={setMoveTargetTech}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians.map((tech: any) => (
                      <SelectItem key={tech.id} value={String(tech.id)}>
                        {tech.name || tech.user?.name || `Tech #${tech.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={executeMoveSelected}>
                Move Stops
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}