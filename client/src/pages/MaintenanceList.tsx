import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CalendarDays, Map, ListFilter, PlusCircle, Route, Search, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { LazyMaintenanceListView } from "../components/maintenance/LazyMaintenanceListView";
import { Spinner } from "../components/ui/spinner";
import { BazzaRoute, MaintenanceWithDetails } from "../lib/types";
import { TechnicianRoutesView } from "../components/bazza/TechnicianRoutesView";
import { RouteDetailView } from "../components/bazza/RouteDetailView";
import { RouteFormDialog } from "../components/bazza/RouteFormDialog";
import { useBazzaRoutes } from "../hooks/useBazzaRoutes";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { deleteBazzaRoute } from "../services/bazzaService";
import { useToast } from "../hooks/use-toast";

interface MaintenanceListProps {
  defaultTab?: 'list' | 'routes';
}

export default function MaintenanceList({ defaultTab = 'list' }: MaintenanceListProps) {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // State for selected technician
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  
  // State for filter by day
  const [filterDay, setFilterDay] = useState<string>('all');
  
  // State for selected route and route form dialog
  const [selectedRoute, setSelectedRoute] = useState<BazzaRoute | null>(null);
  const [isViewingRouteDetails, setIsViewingRouteDetails] = useState(false);
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<BazzaRoute | undefined>(undefined);
  
  // State for active tab - use the defaultTab prop or current URL path
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'routes'>(() => {
    // If URL is /maintenance/routes, set the tab to 'routes' regardless of defaultTab
    if (location === '/maintenance/routes') {
      return 'routes';
    }
    // Otherwise, use the defaultTab prop
    return defaultTab;
  });
  
  // Fetch maintenances for list view with error handling
  const { 
    data: maintenances = [],
    isLoading: isMaintenancesLoading,
    error: maintenancesError
  } = useQuery({ 
    queryKey: ['/api/maintenances'], 
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const errorObj = error as any;
      if (errorObj?.status === 401 || errorObj?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Fetch technicians for routes view with error handling
  const { 
    data: technicians = [] as { id: number; name: string }[],
    isLoading: isTechniciansLoading,
    error: techniciansError
  } = useQuery({ 
    queryKey: ['/api/technicians'], 
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const errorObj = error as any;
      if (errorObj?.status === 401 || errorObj?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Delete route mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBazzaRoute(id),
    onSuccess: () => {
      toast({
        title: "Route deleted",
        description: "The route has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes/technician'] });
      setSelectedRoute(null);
      setIsViewingRouteDetails(false);
    },
    onError: (error) => {
      console.error("Error deleting route:", error);
      toast({
        title: "Error",
        description: "Failed to delete the route. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Effect to synchronize URL with active tab
  useEffect(() => {
    if (activeTab === 'routes' && location !== '/maintenance/routes') {
      navigate('/maintenance/routes', { replace: true });
    } else if (activeTab === 'list' && location !== '/maintenance/list' && location !== '/maintenance') {
      navigate('/maintenance/list', { replace: true });
    }
  }, [activeTab, location, navigate]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    if (value === 'list' || value === 'routes') {
      setActiveTab(value);
    }
  };
  
  // Handle route selection
  const handleRouteSelect = (route: BazzaRoute) => {
    setSelectedRoute(route);
    setIsViewingRouteDetails(true);
  };
  
  // Handle add route click
  const handleAddRouteClick = () => {
    console.log("Add Route button clicked - MaintenanceList");
    setRouteToEdit(undefined);
    setIsRouteFormOpen(true);
  };
  
  // Handle edit route click
  const handleEditRouteClick = (route: BazzaRoute) => {
    setRouteToEdit(route);
    setIsRouteFormOpen(true);
  };
  
  // Handle delete route click
  const handleDeleteRoute = (id: number) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handle route form close
  const handleRouteFormClose = () => {
    setIsRouteFormOpen(false);
    setRouteToEdit(undefined);
  };
  
  // Handle route form submit
  const handleRouteFormSubmit = () => {
    setIsRouteFormOpen(false);
    setRouteToEdit(undefined);
    // Invalidate queries to refetch routes
    queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes/technician'] });
  };
  
  // Handle back button click in route details view
  const handleBackToRoutes = () => {
    setSelectedRoute(null);
    setIsViewingRouteDetails(false);
  };
  
  // Handle day change
  const handleDayChange = (day: string) => {
    setFilterDay(day);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Maintenance Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/maintenance/map')}>
            <Map className="h-4 w-4 mr-2" />
            Map View
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/maintenance')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="w-full sm:max-w-sm">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue={activeTab} onValueChange={handleTabChange} value={activeTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="list">
                <ListFilter className="h-4 w-4 mr-2" />
                Maintenance List
              </TabsTrigger>
              <TabsTrigger value="routes">
                <Route className="h-4 w-4 mr-2" />
                Technician Routes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-0">
              {isMaintenancesLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : maintenancesError ? (
                <div className="text-center text-red-500 py-10">
                  {(maintenancesError as Error)?.message?.includes('Unauthorized') 
                    ? "You need to log in to view maintenance data." 
                    : "Failed to load maintenances. Please try again."}
                </div>
              ) : (
                <LazyMaintenanceListView 
                  maintenances={maintenances as MaintenanceWithDetails[]} 
                  isLoading={false}
                />
              )}
            </TabsContent>
            
            <TabsContent value="routes" className="mt-0">
              {isViewingRouteDetails && selectedRoute ? (
                <RouteDetailView 
                  route={selectedRoute}
                  onBack={handleBackToRoutes}
                  onEdit={() => handleEditRouteClick(selectedRoute)}
                  onDelete={() => handleDeleteRoute(selectedRoute.id)}
                  onAddStop={() => alert("Add stop functionality coming soon!")}
                  isDeleting={deleteMutation.isPending}
                />
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button 
                      onClick={handleAddRouteClick} 
                      variant="default" 
                      className="ml-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Route
                    </Button>
                  </div>
                  
                  {isTechniciansLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <Spinner size="lg" />
                    </div>
                  ) : techniciansError ? (
                    <div className="text-center text-red-500 py-10">
                      {(techniciansError as Error)?.message?.includes('Unauthorized') 
                        ? "You need to log in to view technician data." 
                        : "Failed to load technicians. Please try again."}
                    </div>
                  ) : (
                    <TechnicianRoutesView 
                      technicians={Array.isArray(technicians) 
                        ? technicians.map((t: any) => ({
                            id: t.id,
                            name: t.user?.name || `Technician ${t.id}`,
                            userId: t.userId,
                            active: t.active
                          }))
                        : []
                      }
                      maintenances={maintenances as MaintenanceWithDetails[]}
                      selectedTechnicianId={selectedTechnicianId}
                      onTechnicianSelect={setSelectedTechnicianId}
                      onRouteSelect={handleRouteSelect}
                      onAddRouteClick={handleAddRouteClick}
                      selectedDay={filterDay}
                      onDayChange={handleDayChange}
                    />
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Force the RouteFormDialog to render when isRouteFormOpen is true */}
      <RouteFormDialog
        isOpen={isRouteFormOpen}
        onClose={handleRouteFormClose}
        onSubmit={handleRouteFormSubmit}
        route={routeToEdit}
        technicians={Array.isArray(technicians) 
          ? technicians.map((t: any) => ({
              id: t.id,
              name: t.user?.name || `Technician ${t.id}`,
              userId: t.userId,
              active: t.active
            }))
          : []
        }
      />
    </div>
  );
}