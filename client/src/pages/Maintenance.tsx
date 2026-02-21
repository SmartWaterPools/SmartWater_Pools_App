import { useState, Suspense, lazy, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  CalendarIcon, 
  PlusCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  User,
  MoreHorizontal,
  Check,
  XCircle,
  Loader2,
  Clock,
  ClipboardList,
  FileText,
  FileBarChart2,
  Map,
  ListFilter,
  RefreshCw,
  Truck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Calendar } from "../components/ui/calendar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { MaintenanceCalendar } from "../components/maintenance/MaintenanceCalendar";
import { LazyMaintenanceMapView } from "../components/maintenance/LazyMaintenanceMapView";
import { useBazzaRoutes } from "../hooks/useBazzaRoutes";
import TechnicianRoutesView from "../components/bazza/FixedTechnicianRoutesView";
import { RouteFormDialog } from "../components/bazza/RouteFormDialog";
import { MaintenanceForm } from "../components/maintenance/MaintenanceForm";
import { 
  MaintenanceWithDetails, 
  formatDate, 
  getStatusClasses,
  formatMaintenanceType,
  BazzaRoute
} from "../lib/types";
import { format, addMonths, subMonths, isSameDay, isToday, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

interface MaintenanceProps {
  defaultTab?: 'calendar' | 'map' | 'routes';
}

export default function Maintenance({ defaultTab = 'calendar' }: MaintenanceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [route, setRoute] = useState<BazzaRoute | undefined>(undefined);
  
  const [mapFilterView, setMapFilterView] = useState<string>('all_maintenances');
  const [mapSelectedTechnician, setMapSelectedTechnician] = useState<number | null>(null);
  const [mapSelectedRouteId, setMapSelectedRouteId] = useState<number | null>(null);
  
  // Determine initial view based on URL path or defaultTab prop
  const getInitialView = (): string => {
    if (location === '/maintenance/map') return 'map';
    if (location === '/maintenance/list') return 'calendar';
    if (location === '/maintenance/routes') return 'routes';
    if (location === '/maintenance/calendar') return 'calendar';
    return defaultTab;
  };
  
  const [selectedView, setSelectedView] = useState<string>(getInitialView);
  
  useEffect(() => {
    if (location === '/maintenance/list') {
      navigate('/maintenance/calendar', { replace: true });
    }
  }, [location, navigate]);

  // Check Google Calendar connection status
  const { data: calendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-calendar/connection-status"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // State for tracking calendar sync progress
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Fetch technicians
  const { 
    data: technicians, 
  } = useQuery<any[]>({
    queryKey: ["/api/technicians-with-users"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
  
  const { routes } = useBazzaRoutes();

  // Memoized transformation of technicians with filtering and name fallback
  const transformedTechnicians = useMemo(() => {
    if (!Array.isArray(technicians)) return [];
    return technicians
      .filter((t: any) => t && t.active !== false)
      .map((t: any) => ({
        id: t.id,
        name: t.user?.name || `Technician ${t.id}`,
        userId: t.userId,
        active: t.active,
      }));
  }, [technicians]);

  const { data: allWorkOrders } = useQuery<any[]>({
    queryKey: ['/api/work-orders'],
    staleTime: 60 * 1000,
  });

  // Fetch work orders with category="maintenance" - these are the maintenance items
  // Using category query param ensures server-side filtering and client data hydration
  const { data: maintenanceWorkOrders, isLoading, error: workOrdersError } = useQuery<any[]>({
    queryKey: ["/api/work-orders", { category: "maintenance" }],
    queryFn: async () => {
      const response = await fetch("/api/work-orders?category=maintenance", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch maintenance work orders");
      const data = await response.json();
      return data;
    }
  });
  
  // Convert work orders to MaintenanceWithDetails format for display in all views
  const allMaintenances: MaintenanceWithDetails[] = (maintenanceWorkOrders || []).map((wo: any) => ({
    id: wo.id,
    clientId: wo.clientId || 0,
    technicianId: wo.technicianId,
    scheduleDate: wo.scheduledDate || '', // The API returns scheduledDate in camelCase
    completionDate: wo.status === 'completed' ? wo.completedAt : null,
    type: wo.priority || 'maintenance', // Use priority or default to maintenance
    status: wo.status === 'pending' ? 'scheduled' : wo.status,
    notes: wo.description || '',
    createdAt: wo.createdAt,
    updatedAt: wo.updatedAt,
    // Work order specific fields for display
    workOrderId: wo.id,
    workOrderTitle: wo.title,
    client: wo.client ? {
      id: wo.client.id || wo.clientId || 0,
      name: wo.client.user?.name || wo.client.companyName || wo.title || 'Maintenance Work Order',
      email: wo.client.user?.email || '',
      address: wo.client.user?.address || wo.location || '',
      phone: wo.client.user?.phone || undefined,
      latitude: wo.client.latitude || null,
      longitude: wo.client.longitude || null
    } : {
      id: wo.clientId || 0,
      name: wo.title || 'Maintenance Work Order',
      email: '',
      address: wo.location || '',
      phone: undefined,
      latitude: null,
      longitude: null
    }
  } as MaintenanceWithDetails & { workOrderId?: number; workOrderTitle?: string }));

  // Filter maintenances based on search and status (includes work orders)
  const filteredMaintenances = allMaintenances?.filter(maintenance => {
    // Apply status filter if not set to "all"
    if (statusFilter !== "all" && maintenance.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter to client name (with null guards for work orders)
    const clientName = (maintenance.client as any)?.user?.name || (maintenance.client as any)?.name || maintenance.notes || '';
    if (searchTerm && !clientName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Mutation to update work order status (maintenance work orders)
  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/work-orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Status updated",
        description: "The maintenance work order status has been updated.",
      });
      setIsUpdatingStatus(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: "There was an error updating the status. Please try again.",
        variant: "destructive",
      });
      setIsUpdatingStatus(false);
    }
  });

  // Update status handler - now updates work orders directly
  const handleStatusUpdate = (maintenance: MaintenanceWithDetails, newStatus: string) => {
    setSelectedMaintenance(maintenance);
    setIsUpdatingStatus(true);
    // Map maintenance status to work order status
    const workOrderStatus = newStatus === 'scheduled' ? 'pending' : newStatus;
    updateWorkOrderMutation.mutate({ id: maintenance.id, status: workOrderStatus });
  };

  // Open work order details for the maintenance item
  const handleMaintenanceReportOpen = (maintenance: MaintenanceWithDetails, usePage = false) => {
    // Navigate to work order detail page
    navigate(`/work-orders/${maintenance.id}`);
  };

  // Month navigation handlers
  const handlePreviousMonth = () => {
    setMonth(subMonths(month, 1));
  };

  const handleNextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Maintenance</h1>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative w-full sm:w-auto">
            <Input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter !== "all" ? (
                    <span className="capitalize">{statusFilter.replace('_', ' ')}</span>
                  ) : (
                    "Status"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("scheduled")}>
                  Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Schedule Maintenance
            </Button>
            {calendarStatus?.connected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Sync Calendar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={async () => {
                      if (allMaintenances.length === 0) {
                        toast({
                          title: "No maintenance items",
                          description: "There are no maintenance work orders to sync.",
                        });
                        return;
                      }
                      setIsSyncingCalendar(true);
                      let successCount = 0;
                      let failCount = 0;
                      for (const m of allMaintenances) {
                        try {
                          await apiRequest('POST', '/api/google-calendar/sync-work-order', {
                            id: m.id,
                            title: (m as any).workOrderTitle || (m as any).title || 'Maintenance',
                            description: m.notes || '',
                            scheduledDate: m.scheduleDate,
                            location: (m.client as any)?.user?.address || (m.client as any)?.address || '',
                            clientName: (m.client as any)?.user?.name || (m.client as any)?.name || 'N/A'
                          });
                          successCount++;
                        } catch {
                          failCount++;
                        }
                      }
                      setIsSyncingCalendar(false);
                      toast({
                        title: "Calendar Sync Complete",
                        description: `${successCount} synced successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
                      });
                    }}
                    disabled={isSyncingCalendar}
                  >
                    {isSyncingCalendar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync All to Google Calendar
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>



      <Tabs 
        value={selectedView}
        className="mb-6"
        onValueChange={(value) => {
          setSelectedView(value);
          const urlMap: Record<string, string> = {
            calendar: '/maintenance/calendar',
            map: '/maintenance/map',
            routes: '/maintenance/routes'
          };
          navigate(urlMap[value] || '/maintenance');
        }}
      >
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Map</span>
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            <span className="hidden sm:inline">Routes</span>
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <MaintenanceCalendar 
                  maintenances={filteredMaintenances || []} 
                  month={month}
                  onStatusUpdate={handleStatusUpdate}
                  isUpdatingStatus={isUpdatingStatus}
                  selectedMaintenance={selectedMaintenance}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <Card>
            <CardContent className="p-6">
              <LazyMaintenanceMapView
                maintenances={allMaintenances || []}
                isLoading={isLoading}
                selectedView={mapFilterView}
                onViewChange={setMapFilterView}
                selectedTechnician={mapSelectedTechnician}
                onTechnicianChange={setMapSelectedTechnician}
                selectedRouteId={mapSelectedRouteId}
                onRouteChange={setMapSelectedRouteId}
                selectedDay={selectedDay}
                workOrders={allWorkOrders || []}
                routes={routes || []}
                technicians={technicians || []}
                onStatusUpdate={handleStatusUpdate}
                isUpdatingStatus={isUpdatingStatus}
                selectedMaintenance={selectedMaintenance}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Technician Routes</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate('/dispatch')}
                >
                  <Truck className="h-4 w-4" />
                  View Dispatch Board
                </Button>
              </div>
              <TechnicianRoutesView 
                technicians={transformedTechnicians}
                maintenances={filteredMaintenances || []}
                selectedTechnicianId={selectedTechnician}
                onTechnicianSelect={setSelectedTechnician}
                onRouteSelect={(selectedRoute) => {
                  // Handle route selection if needed
                  setRoute(selectedRoute);
                  toast({
                    title: "Route selected",
                    description: `Selected route: ${selectedRoute.name}`,
                  });
                }}
                onAddRouteClick={() => {
                  setRoute(undefined);
                  setIsRouteFormOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Maintenance Form Dialog */}
      {open && (
        <MaintenanceForm 
          open={open} 
          onOpenChange={setOpen} 
          initialDate={new Date()}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
            setOpen(false);
            toast({
              title: "Maintenance scheduled",
              description: "The maintenance work order has been created successfully.",
            });
          }}
        />
      )}
      
      {/* Route Form Dialog */}
      {isRouteFormOpen && (
        <RouteFormDialog
          isOpen={isRouteFormOpen}
          onClose={() => setIsRouteFormOpen(false)}
          route={route}
          technicians={transformedTechnicians}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/bazza/routes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/bazza/routes/technician"] });
            setIsRouteFormOpen(false);
            toast({
              title: route ? "Route updated" : "Route created",
              description: route 
                ? "The route has been updated successfully." 
                : "The new route has been created successfully.",
            });
          }}
        />
      )}
    </div>
  );
}