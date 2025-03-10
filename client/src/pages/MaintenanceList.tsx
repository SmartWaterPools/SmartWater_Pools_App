import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CalendarDays, Map, ListFilter, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LazyMaintenanceListView } from "@/components/maintenance/LazyMaintenanceListView";
import { Spinner } from "@/components/ui/spinner";
import { MaintenanceWithDetails } from "@/lib/types";

export default function MaintenanceList() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch maintenance data
  const { data: maintenances, isLoading, error } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ['/api/maintenances'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  const handleAddMaintenance = () => {
    navigate("/maintenance/add");
  };

  const handleStatusUpdate = (maintenance: MaintenanceWithDetails, newStatus: string) => {
    // This will be implemented when we add status update functionality
    console.log(`Updating maintenance ${maintenance.id} status to ${newStatus}`);
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

      <Tabs defaultValue="list" className="w-full">
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
                  maintenances={filteredMaintenances}
                  isLoading={isLoading}
                  onStatusUpdate={handleStatusUpdate}
                  isUpdatingStatus={false}
                  selectedMaintenance={null}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}