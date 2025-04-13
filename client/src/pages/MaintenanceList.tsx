import { useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, Map, ListFilter, PlusCircle, Route, Search } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "../lib/queryClient";
import { deleteBazzaRoute } from "../services/bazzaService";
import { useToast } from "../hooks/use-toast";

export default function MaintenanceList() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for selected technician
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  
  // State for selected route and route form dialog
  const [selectedRoute, setSelectedRoute] = useState<BazzaRoute | null>(null);
  const [isViewingRouteDetails, setIsViewingRouteDetails] = useState(false);
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<BazzaRoute | undefined>(undefined);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'list' | 'routes'>('list');

  // Fetch maintenance data
  const { data: maintenances, isLoading, error } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ['/api/maintenances'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch technicians data - simplified for this example
  const { data: technicians = [] } = useQuery<{id: number; name: string}[]>({
    queryKey: ['/api/technicians'],
    // Fallback mock data (you would need to implement the real API)
    queryFn: () => Promise.resolve([
      { id: 1, name: 'John Smith' },
      { id: 2, name: 'Sarah Johnson' },
      { id: 3, name: 'Mike Davis' }
    ]),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch clients data - simplified for this example
  const { data: clients = [] } = useQuery<{id: number; name: string}[]>({
    queryKey: ['/api/clients'],
    // Fallback mock data (you would need to implement the real API)
    queryFn: () => Promise.resolve([
      { id: 1, name: 'Oceanside Resort' },
      { id: 2, name: 'Mountain View Hotel' },
      { id: 3, name: 'Sunshine Apartments' }
    ]),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Delete route mutation
  const deleteMutation = useMutation({
    mutationFn: (routeId: number) => deleteBazzaRoute(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      toast({
        title: 'Route deleted',
        description: 'The route has been deleted successfully.',
      });
      setSelectedRoute(null);
      setIsViewingRouteDetails(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete route: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  });

  // Handle route deletion
  const handleDeleteRoute = (routeId: number) => {
    deleteMutation.mutate(routeId);
  };

  // Filter maintenances based on search term
  const filteredMaintenances = maintenances?.filter(maintenance => {
    const clientName = maintenance.client.user?.name?.toLowerCase() || "";
    const clientAddress = maintenance.client.address?.toLowerCase() || "";
    const searchLower = searchTerm.toLowerCase();
    
    return clientName.includes(searchLower) || 
           clientAddress.includes(searchLower) ||
           maintenance.type?.toLowerCase().includes(searchLower) ||
           maintenance.status.toLowerCase().includes(searchLower);
  }) || [];

  // Filter maintenances by technician
  const technicianFilteredMaintenances = selectedTechnicianId 
    ? filteredMaintenances.filter(m => m.technicianId === selectedTechnicianId)
    : filteredMaintenances;

  const handleAddMaintenance = () => {
    navigate("/maintenance/add");
  };

  const handleAddRoute = () => {
    setRouteToEdit(undefined);
    setIsRouteFormOpen(true);
  };

  const handleEditRoute = (route: BazzaRoute) => {
    setRouteToEdit(route);
    setIsRouteFormOpen(true);
  };

  const handleStatusUpdate = (maintenance: MaintenanceWithDetails, newStatus: string) => {
    // This will be implemented when we add status update functionality
    console.log(`Updating maintenance ${maintenance.id} status to ${newStatus}`);
  };

  const handleTabChange = (value: string) => {
    if (value === 'list' || value === 'routes') {
      setActiveTab(value);
      // Reset route details view when switching tabs
      setIsViewingRouteDetails(false);
      setSelectedRoute(null);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>Error loading maintenance data. Please try again later.</p>
              <p className="text-sm mt-2">{(error as Error)?.message || "Unknown error"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 md:mb-0">Maintenance Schedule</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search maintenance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={handleAddMaintenance}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Maintenance
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" onClick={() => navigate("/maintenance")}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="map" onClick={() => navigate("/maintenance/map")}>
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list">
            <ListFilter className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="routes">
            <Route className="h-4 w-4 mr-2" />
            Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">Maintenance List</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-[600px] bg-gray-50 rounded-lg">
                  <Spinner size="lg" />
                  <span className="ml-2">Loading maintenance data...</span>
                </div>
              ) : (
                <LazyMaintenanceListView
                  maintenances={technicianFilteredMaintenances}
                  isLoading={isLoading}
                  onStatusUpdate={handleStatusUpdate}
                  isUpdatingStatus={false}
                  selectedMaintenance={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="mt-0">
          {isViewingRouteDetails && selectedRoute ? (
            <RouteDetailView
              route={selectedRoute}
              onBack={() => {
                setIsViewingRouteDetails(false);
                setSelectedRoute(null);
              }}
              onEdit={handleEditRoute}
              onDelete={handleDeleteRoute}
              technicians={technicians}
              clients={clients}
            />
          ) : (
            <TechnicianRoutesView
              technicians={technicians}
              maintenances={maintenances || []}
              selectedTechnicianId={selectedTechnicianId}
              onTechnicianSelect={setSelectedTechnicianId}
              onRouteSelect={(route) => {
                setSelectedRoute(route);
                setIsViewingRouteDetails(true);
              }}
              onAddRouteClick={handleAddRoute}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Route Form Dialog */}
      {isRouteFormOpen && (
        <RouteFormDialog
          isOpen={isRouteFormOpen}
          onClose={() => {
            setIsRouteFormOpen(false);
            setRouteToEdit(undefined);
          }}
          route={routeToEdit}
          technicians={technicians}
          onSuccess={(route) => {
            // If we were viewing route details and edited the route, update the selected route
            if (isViewingRouteDetails && selectedRoute && selectedRoute.id === route.id) {
              setSelectedRoute(route);
            }
          }}
        />
      )}
    </div>
  );
}