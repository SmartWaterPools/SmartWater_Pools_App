import { useState, Suspense, lazy, useEffect } from "react";
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
  List
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
import { LazyMaintenanceListView } from "../components/maintenance/LazyMaintenanceListView";
import { LazyMaintenanceMapView } from "../components/maintenance/LazyMaintenanceMapView";
import TechnicianRoutesView from "../components/bazza/FixedTechnicianRoutesView";
import { RouteFormDialog } from "../components/bazza/RouteFormDialog";
import { MaintenanceForm } from "../components/maintenance/MaintenanceForm";
import { MaintenanceReportForm } from "../components/maintenance/MaintenanceReportForm";
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

export default function Maintenance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [maintenanceReportOpen, setMaintenanceReportOpen] = useState(false);
  const [selectedReportMaintenance, setSelectedReportMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [selectedView, setSelectedView] = useState<string>("calendar");
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [route, setRoute] = useState<BazzaRoute | undefined>(undefined);

  // Fetch technicians
  const { 
    data: technicians, 
    isLoading: techniciansLoading, 
    error: techniciansError 
  } = useQuery<any[]>({
    queryKey: ["/api/technicians-with-users"],
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 2, // Only retry twice to avoid infinite loops if authentication fails
    retryDelay: 1000, // Wait 1 second between retries,
    select: (data) => {
      console.log("Raw technicians data from API:", data);
      if (Array.isArray(data)) {
        console.log("Received technician count:", data.length);
        console.log("Technician data example:", 
          data.slice(0, 2).map(tech => ({
            id: tech.id,
            name: tech?.user?.name, 
            active: tech.active,
            hasUser: !!tech.user,
            userId: tech.userId
          }))
        );
      }
      return data;
    }
  });
  
  // Log technician data loading status separately to avoid TypeScript errors
  useEffect(() => {
    if (technicians) {
      console.log("Successfully loaded technicians:", technicians?.length || 0);
      
      // Add more detailed logging to inspect the technician data structure
      if (Array.isArray(technicians) && technicians.length > 0) {
        console.log("First technician object (full):", technicians[0]);
        
        // Log all technicians in a more compact format
        console.log("All technicians summary:", 
          technicians.map(t => ({
            id: t.id, 
            userId: t.userId,
            user: t.user ? {
              id: t.user.id,
              name: t.user.name || "[No name]",
              email: t.user.email || "[No email]"
            } : "[No user]",
            active: t.active
          }))
        );
      } else {
        console.log("Technician data not in expected array format or empty");
      }
    }
    if (techniciansError) {
      console.error("Error loading technicians:", techniciansError);
      // Don't show toast here - it creates a poor UX when not logged in
    }
  }, [technicians, techniciansError]);
  
  // Debug technicians loading
  useEffect(() => {
    console.log("Technicians data:", { 
      loading: techniciansLoading, 
      count: Array.isArray(technicians) ? technicians.length : 0,
      error: techniciansError ? (techniciansError as Error).message : null 
    });
  }, [technicians, techniciansLoading, techniciansError]);

  // Fetch maintenances
  const { data: maintenances, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenances"],
    select: (data) => {
      console.log("Raw maintenance data from API:", data);
      
      // Enhanced debugging for March 9, 2025 appointments
      const march9Records = data.filter(m => {
        const dateStr = m.scheduleDate || '';
        if (typeof dateStr === 'string' && dateStr.includes('2025-03-09')) {
          console.log(`Found March 9 record - ID: ${m.id}, Date: ${dateStr}`);
          return true;
        }
        return false;
      });
      
      if (march9Records.length > 0) {
        console.log(`Found ${march9Records.length} maintenance records for March 9, 2025:`);
        march9Records.forEach(m => {
          console.log(`- ID: ${m.id}, Client: ${m.client?.user?.name}, Status: ${m.status}`);
          console.log(`  Date value: "${m.scheduleDate}" (${typeof m.scheduleDate})`);
        });
      } else {
        console.log("No March 9, 2025 maintenance records found in API response");
      }
      
      return data;
    }
  });

  // Filter maintenances based on search and status
  const filteredMaintenances = maintenances?.filter(maintenance => {
    console.log("Filtering maintenance record:", maintenance.id, maintenance);
    
    // If date filter is applied, only show maintenances for that date
    if (date) {
      // Parse the date explicitly to ensure proper comparison
      try {
        console.log(`Comparing maintenance date "${maintenance.scheduleDate}" with filter date "${format(date, 'yyyy-MM-dd')}"`);
        
        // For scheduleDate strings, we need to make sure we're comparing consistently
        let maintenanceDateForComparison;
        
        if (typeof maintenance.scheduleDate === 'string' && maintenance.scheduleDate.length <= 10) {
          // It's just a date string, convert both to YYYY-MM-DD for comparison
          const formattedFilterDate = format(date, 'yyyy-MM-dd');
          console.log(`String comparison: "${maintenance.scheduleDate}" vs "${formattedFilterDate}"`);
          
          // Direct string comparison for dates in YYYY-MM-DD format
          if (maintenance.scheduleDate !== formattedFilterDate) {
            console.log(`Date filter excluded maintenance #${maintenance.id} - date strings don't match`);
            return false;
          }
        } else {
          // Parse the schedule date and use date-fns for comparison
          const scheduleDate = new Date(maintenance.scheduleDate);
          console.log(`Date object comparison: ${scheduleDate.toISOString()} vs ${date.toISOString()}`);
          
          if (!isSameDay(scheduleDate, date)) {
            console.log(`Date filter excluded maintenance #${maintenance.id} - not same day`);
            return false;
          }
        }
      } catch (e) {
        console.error("Error parsing date:", maintenance.scheduleDate, e);
        return false;
      }
    }
    
    // Apply status filter if not set to "all"
    if (statusFilter !== "all" && maintenance.status !== statusFilter) {
      console.log(`Status filter excluded maintenance #${maintenance.id} - status ${maintenance.status} != ${statusFilter}`);
      return false;
    }
    
    // Apply search filter to client name
    if (searchTerm && !maintenance.client.user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      console.log(`Search filter excluded maintenance #${maintenance.id} - name doesn't match "${searchTerm}"`);
      return false;
    }
    
    console.log(`Maintenance #${maintenance.id} passed all filters`);
    return true;
  });

  // Mutation to update maintenance status
  const updateMaintenanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/maintenances/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Maintenance updated",
        description: "The maintenance status has been updated successfully.",
      });
      setIsUpdatingStatus(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update maintenance",
        description: "There was an error updating the maintenance status. Please try again.",
        variant: "destructive",
      });
      setIsUpdatingStatus(false);
    }
  });

  // Update status handler
  const handleStatusUpdate = (maintenance: MaintenanceWithDetails, newStatus: string) => {
    setSelectedMaintenance(maintenance);
    setIsUpdatingStatus(true);
    updateMaintenanceMutation.mutate({ id: maintenance.id, status: newStatus });
  };

  // Open maintenance report form - supports both dialog and page navigation
  const handleMaintenanceReportOpen = (maintenance: MaintenanceWithDetails, usePage = false) => {
    if (usePage) {
      // Use the maintenance report page
      navigate(`/maintenance-report/${maintenance.id}`);
    } else {
      // Use the dialog form
      setSelectedReportMaintenance(maintenance);
      setMaintenanceReportOpen(true);
    }
  };

  // Month navigation handlers
  const handlePreviousMonth = () => {
    setMonth(subMonths(month, 1));
  };

  const handleNextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDate(undefined);
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 flex justify-between items-center border-b">
                  <span className="text-sm font-medium">Filter by date</span>
                  {date && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearDateFilter}
                      className="h-8 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
          </div>
        </div>
      </div>



      <Tabs 
        defaultValue="calendar" 
        className="mb-6"
        onValueChange={(value) => setSelectedView(value)}
      >
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="calendar" className="flex items-center gap-2" onClick={() => setSelectedView("calendar")}>
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2" onClick={() => {
            setSelectedView("list");
            navigate("/maintenance/list");
          }}>
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2" onClick={() => {
            setSelectedView("map");
            navigate("/maintenance/map");
          }}>
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
                {date && (
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(date, "PPP")}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-2 p-0"
                      onClick={clearDateFilter}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
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

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-6">
              <LazyMaintenanceListView
                maintenances={filteredMaintenances || []}
                isLoading={isLoading}
                onStatusUpdate={handleStatusUpdate}
                isUpdatingStatus={isUpdatingStatus}
                selectedMaintenance={selectedMaintenance}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <Card>
            <CardContent className="p-6">
              <LazyMaintenanceMapView
                maintenances={filteredMaintenances || []}
                isLoading={isLoading}
                selectedView={selectedView}
                selectedTechnician={selectedTechnician}
                selectedDay={selectedDay}
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
              <TechnicianRoutesView 
                technicians={(() => {
                  // Filter and map technicians with proper name handling
                  const filteredTechs = Array.isArray(technicians) ? 
                    technicians
                      .filter((t: any) => t && (t.active !== false))
                      .map((t: any) => ({
                        id: t.id,
                        name: t.user?.name || `Technician ${t.id}`,
                        userId: t.userId,
                        active: t.active
                      })) : [];
                      
                  console.log("Properly transformed techs for routes view:", filteredTechs);
                  return filteredTechs;
                })()}
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
                  try {
                    console.log("Add Route button clicked - opening form dialog");
                    setRoute(undefined);
                    setIsRouteFormOpen(true);
                  } catch (error) {
                    console.error("Error opening route form:", error);
                    toast({
                      title: "Error",
                      description: "There was an error opening the route form. Please try again.",
                      variant: "destructive",
                    });
                  }
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
            queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
            queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
            setOpen(false);
            toast({
              title: "Maintenance scheduled",
              description: "The maintenance has been scheduled successfully.",
            });
          }}
        />
      )}
      
      {/* Maintenance Report Form Dialog */}
      {maintenanceReportOpen && selectedReportMaintenance && (
        <MaintenanceReportForm
          open={maintenanceReportOpen}
          onOpenChange={setMaintenanceReportOpen}
          maintenanceId={selectedReportMaintenance.id}
          clientId={selectedReportMaintenance.clientId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
            queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
            setMaintenanceReportOpen(false);
            toast({
              title: "Maintenance report submitted",
              description: "The maintenance report has been submitted successfully.",
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
          technicians={Array.isArray(technicians) 
            ? technicians
                .filter((t: any) => t && (t.active !== false))
                .map((t: any) => {
                  // Debug each technician object
                  console.log(`Processing technician for route form: ${t.id}`, t);
                  
                  // Always prioritize getting name from user object
                  const name = (t.user && typeof t.user === 'object' && t.user.name) 
                    ? t.user.name 
                    : (t.name || `Technician ${t.id}`);
                  
                  console.log(`Technician ${t.id} name resolved as: "${name}"`);
                  
                  return {
                    id: t.id,
                    name: name,
                    userId: t.userId,
                    active: t.active
                  };
                })
            : []
          }
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/bazza/routes"] });
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