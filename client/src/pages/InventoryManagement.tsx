import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package2, 
  Warehouse, 
  Truck,
  ArrowLeftRight,
  PlusCircle, 
  Loader2, 
  AlertCircle,
  Clipboard,
  ClipboardCheck,
  BarChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tab components
import ItemsTab from "../components/inventory/ItemsTab";
import WarehousesTab from "../components/inventory/WarehousesTab";
import VehiclesTab from "../components/inventory/VehiclesTab";
import TransfersTab from "../components/inventory/TransfersTab";
import ReportsTab from "../components/inventory/ReportsTab";

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("items");
  const { toast } = useToast();
  
  // Queries for inventory summary data
  const { data: inventorySummary, isLoading: loadingInventory } = useQuery({
    queryKey: ['/api/inventory/summary'],
    retry: 1,
    enabled: true
  });
  
  // Placeholder for unavailable components
  const PlaceholderTab = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg p-8">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-center">{title} Feature Coming Soon</h3>
      <p className="text-muted-foreground text-center mt-2">
        This functionality is currently under development and will be available soon.
      </p>
    </div>
  );
  
  return (
    <div className="container py-4 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage your inventory items, warehouses, vehicles, and transfers.
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inventorySummary?.totalItems || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Unique inventory items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inventorySummary?.totalWarehouses || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inventorySummary?.totalVehicles || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Technician vehicles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inventorySummary?.pendingTransfers || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {loadingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                inventorySummary?.lowStockItems || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Items to reorder</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Tabs */}
      <Tabs defaultValue="items" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              <span className="hidden sm:inline">Items</span>
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span className="hidden sm:inline">Warehouses</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transfers</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Action buttons based on active tab */}
          <div className="flex gap-2">
            {activeTab === "items" && (
              <Button size="sm" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Item</span>
              </Button>
            )}
            {activeTab === "warehouses" && (
              <Button size="sm" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Warehouse</span>
              </Button>
            )}
            {activeTab === "vehicles" && (
              <Button size="sm" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Vehicle</span>
              </Button>
            )}
            {activeTab === "transfers" && (
              <>
                <Button size="sm" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">New Transfer</span>
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
              </>
            )}
            {activeTab === "reports" && (
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>
        
        <TabsContent value="items" className="p-0 mt-4">
          <ItemsTab />
        </TabsContent>
        
        <TabsContent value="warehouses" className="p-0 mt-4">
          <WarehousesTab />
        </TabsContent>
        
        <TabsContent value="vehicles" className="p-0 mt-4">
          <VehiclesTab />
        </TabsContent>
        
        <TabsContent value="transfers" className="p-0 mt-4">
          <TransfersTab />
        </TabsContent>
        
        <TabsContent value="reports" className="p-0 mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}