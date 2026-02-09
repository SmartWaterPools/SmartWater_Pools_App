import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useBazzaRoutes } from "../hooks/useBazzaRoutes";
import { CalendarDays, Map, ListFilter, PlusCircle, Search, Route } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { LazyMaintenanceMapView } from "../components/maintenance/LazyMaintenanceMapView";
import { Spinner } from "../components/ui/spinner";
import { BazzaRoute, MaintenanceWithDetails } from "../lib/types";
import TechnicianRoutesView from "../components/bazza/FixedTechnicianRoutesView";

export default function MaintenanceMap() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState("all_maintenances");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const { routes, isRoutesLoading, routesError } = useBazzaRoutes();

  const { data: maintenances, isLoading, error } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ['/api/maintenances'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<any[]>({
    queryKey: ['/api/technicians'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: workOrders } = useQuery<any[]>({
    queryKey: ['/api/work-orders'],
    staleTime: 5 * 60 * 1000,
  });

  const allMaintenances = maintenances || [];

  const handleAddMaintenance = () => {
    navigate("/maintenance/add");
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

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" onClick={() => navigate("/maintenance")}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="list" onClick={() => navigate("/maintenance/list")}>
            <ListFilter className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="routes" onClick={() => {
              console.log("Navigating directly to MaintenanceList");
              // Instead of relying on sessionStorage, create a dedicated route
              navigate("/maintenance/routes");
            }}>
            <Route className="h-4 w-4 mr-2" />
            Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-0">
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">Maintenance Map</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing today's and upcoming maintenance appointments
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <LazyMaintenanceMapView
                maintenances={allMaintenances}
                isLoading={isLoading}
                selectedView={selectedView}
                selectedTechnician={selectedTechnicianId}
                workOrders={workOrders || []}
                routes={routes || []}
                technicians={technicians || []}
                onViewChange={setSelectedView}
                onTechnicianChange={setSelectedTechnicianId}
                selectedRouteId={selectedRouteId}
                onRouteChange={setSelectedRouteId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes tab content is handled in MaintenanceList.tsx */}
      </Tabs>
    </div>
  );
}