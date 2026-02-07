import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package2, 
  Warehouse, 
  Truck,
  ArrowLeftRight,
  PlusCircle, 
  Loader2, 
  AlertCircle,
  BarChart
} from "lucide-react";
import { InventoryItemForm } from "@/components/business/InventoryItemForm";

import ItemsTab from "../components/inventory/ItemsTab";
import WarehousesTab from "../components/inventory/WarehousesTab";
import VehiclesTab from "../components/inventory/VehiclesTab";
import TransfersTab from "../components/inventory/TransfersTab";
import ReportsTab from "../components/inventory/ReportsTab";

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("items");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  
  const { data: inventorySummary, isLoading: loadingInventory } = useQuery({
    queryKey: ['/api/inventory/summary'],
    retry: 1,
    enabled: true
  });

  function handleNewItem() {
    setEditingItem(null);
    setShowItemForm(true);
  }

  function handleEditItem(item: any) {
    setEditingItem(item);
    setShowItemForm(true);
  }

  function handleCloseItemForm() {
    setShowItemForm(false);
    setEditingItem(null);
  }
  
  return (
    <div className="container py-4 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage your inventory items, warehouses, vehicles, and transfers.
        </p>
      </div>
      
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
          
          <div className="flex gap-2">
            {activeTab === "items" && (
              <Button size="sm" className="flex items-center gap-2" onClick={handleNewItem}>
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Item</span>
              </Button>
            )}
            {activeTab === "warehouses" && (
              <Button size="sm" className="flex items-center gap-2" onClick={() => setShowAddWarehouse(true)}>
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Warehouse</span>
              </Button>
            )}
            {activeTab === "vehicles" && (
              <Button size="sm" className="flex items-center gap-2" onClick={() => setShowAddVehicle(true)}>
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Vehicle</span>
              </Button>
            )}
            {activeTab === "transfers" && (
              <Button size="sm" className="flex items-center gap-2" onClick={() => setShowAddTransfer(true)}>
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Transfer</span>
              </Button>
            )}
          </div>
        </div>
        
        <TabsContent value="items" className="p-0 mt-4">
          <ItemsTab onAddItem={handleNewItem} onEditItem={handleEditItem} />
        </TabsContent>
        
        <TabsContent value="warehouses" className="p-0 mt-4">
          <WarehousesTab showAddDialog={showAddWarehouse} onAddDialogClose={() => setShowAddWarehouse(false)} />
        </TabsContent>
        
        <TabsContent value="vehicles" className="p-0 mt-4">
          <VehiclesTab showAddDialog={showAddVehicle} onAddDialogClose={() => setShowAddVehicle(false)} />
        </TabsContent>
        
        <TabsContent value="transfers" className="p-0 mt-4">
          <TransfersTab showAddDialog={showAddTransfer} onAddDialogClose={() => setShowAddTransfer(false)} />
        </TabsContent>
        
        <TabsContent value="reports" className="p-0 mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>

      {showItemForm && (
        <InventoryItemForm
          itemToEdit={editingItem}
          onClose={handleCloseItemForm}
          apiBasePath="/api/inventory/items"
        />
      )}
    </div>
  );
}
