import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, Barcode, Boxes, Package, RotateCw, Save, Truck } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";
import { INVENTORY_LOCATION_TYPES, TRANSFER_STATUS, TRANSFER_TYPES } from "@shared/schema";

// Type to represent warehouse entity
interface Warehouse {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
}

// Type to represent vehicle entity
interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  technicianId: number;
}

// Type to represent inventory item
interface InventoryItem {
  id: number;
  name: string;
  category: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  unitCost?: number;
  reorderPoint?: number;
  idealStock?: number;
}

// Type to represent warehouse inventory entity
interface WarehouseInventory {
  id: number;
  warehouseId: number;
  inventoryItemId: number;
  quantity: number;
  item?: InventoryItem;
}

// Type to represent vehicle inventory entity
interface VehicleInventory {
  id: number;
  vehicleId: number;
  inventoryItemId: number;
  quantity: number;
  item?: InventoryItem;
}

// Type to represent transfer item
interface TransferItem {
  inventoryItemId: number;
  quantity: number;
  name: string;
  barcode?: string;
}

// Type to represent transfer form state
interface TransferFormState {
  transferType: typeof TRANSFER_TYPES[number];
  status: typeof TRANSFER_STATUS[number];
  sourceType: typeof INVENTORY_LOCATION_TYPES[number];
  destinationType: typeof INVENTORY_LOCATION_TYPES[number];
  sourceId: number | null;
  destinationId: number | null;
  notes: string;
  items: TransferItem[];
}

// Mapping of transfer types to human-readable names
const TRANSFER_TYPE_NAMES: Record<string, string> = {
  'warehouse_to_warehouse': 'Warehouse to Warehouse',
  'warehouse_to_vehicle': 'Warehouse to Vehicle',
  'vehicle_to_warehouse': 'Vehicle to Warehouse',
  'vehicle_to_vehicle': 'Vehicle to Vehicle',
  'warehouse_to_client': 'Warehouse to Client',
  'vehicle_to_client': 'Vehicle to Client'
};

export function InventoryTransfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferFormState>({
    transferType: 'warehouse_to_vehicle',
    status: 'pending',
    sourceType: 'warehouse',
    destinationType: 'vehicle',
    sourceId: null,
    destinationId: null,
    notes: '',
    items: []
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/inventory/warehouses/active'],
    staleTime: 60000
  });
  
  // Fetch vehicles
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['/api/inventory/vehicles'],
    staleTime: 60000
  });

  // Fetch inventory items 
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory/items'],
    staleTime: 60000
  });

  // Fetch source inventory based on source type and ID
  const { data: sourceInventory = [] } = useQuery<(WarehouseInventory | VehicleInventory)[]>({
    queryKey: [
      transferForm.sourceType === 'warehouse' 
        ? `/api/inventory/warehouses/${transferForm.sourceId}/inventory` 
        : `/api/inventory/vehicles/${transferForm.sourceId}/inventory`
    ],
    enabled: !!transferForm.sourceId,
    staleTime: 30000
  });

  // Mutation for creating a transfer
  const createTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create transfer');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Created",
        description: "Inventory transfer has been successfully created."
      });
      
      // Reset form
      setTransferForm({
        transferType: 'warehouse_to_vehicle',
        status: 'pending',
        sourceType: 'warehouse',
        destinationType: 'vehicle',
        sourceId: null,
        destinationId: null,
        notes: '',
        items: []
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/transfers'] });
      if (transferForm.sourceType === 'warehouse') {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/inventory/warehouses/${transferForm.sourceId}/inventory`] 
        });
      } else {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/inventory/vehicles/${transferForm.sourceId}/inventory`] 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle form changes
  const handleChange = (field: keyof TransferFormState, value: any) => {
    setTransferForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      
      // Update source and destination types based on transfer type
      if (field === 'transferType') {
        const [source, destination] = value.split('_to_');
        updatedForm.sourceType = source as typeof INVENTORY_LOCATION_TYPES[number];
        updatedForm.destinationType = destination as typeof INVENTORY_LOCATION_TYPES[number];
        
        // Reset source and destination IDs when types change
        updatedForm.sourceId = null;
        updatedForm.destinationId = null;
      }
      
      return updatedForm;
    });
  };

  // Add item to transfer
  const addItem = (item: InventoryItem, quantity: number = 1) => {
    // Check if we already have this item
    const existingItemIndex = transferForm.items.findIndex(i => i.inventoryItemId === item.id);
    
    setTransferForm(prev => {
      const newItems = [...prev.items];
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
      } else {
        // Add new item
        newItems.push({
          inventoryItemId: item.id,
          quantity,
          name: item.name,
          barcode: item.barcode
        });
      }
      
      return { ...prev, items: newItems };
    });
  };

  // Remove item from transfer
  const removeItem = (index: number) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    setTransferForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], quantity };
      return { ...prev, items: newItems };
    });
  };

  // Handle barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    // Find item by barcode
    const item = inventoryItems.find(item => item.barcode === barcode);
    
    if (item) {
      addItem(item);
      toast({
        title: "Item Added",
        description: `${item.name} added to transfer.`
      });
    } else {
      toast({
        title: "Item Not Found",
        description: `No item found with barcode ${barcode}.`,
        variant: "destructive"
      });
    }
  };

  // Submit transfer
  const handleSubmit = () => {
    if (!transferForm.sourceId || !transferForm.destinationId) {
      toast({
        title: "Validation Error",
        description: "Please select source and destination.",
        variant: "destructive"
      });
      return;
    }
    
    if (transferForm.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to transfer.",
        variant: "destructive"
      });
      return;
    }
    
    const transferData = {
      transferType: transferForm.transferType,
      status: transferForm.status,
      notes: transferForm.notes,
      sourceId: transferForm.sourceId,
      destinationId: transferForm.destinationId,
      transferItems: transferForm.items.map(item => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity
      }))
    };
    
    createTransferMutation.mutate(transferData);
  };

  // Get location options based on type
  const getLocationOptions = (locationType: typeof INVENTORY_LOCATION_TYPES[number]) => {
    if (locationType === 'warehouse') {
      return warehouses.map((warehouse: Warehouse) => (
        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
          {warehouse.name}
        </SelectItem>
      ));
    } else if (locationType === 'vehicle') {
      return vehicles.map((vehicle: Vehicle) => (
        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
          {vehicle.name} ({vehicle.licensePlate})
        </SelectItem>
      ));
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            Create Inventory Transfer
          </CardTitle>
          <CardDescription>
            Transfer inventory items between warehouses, vehicles, and client sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transferType">Transfer Type</Label>
                <Select
                  value={transferForm.transferType}
                  onValueChange={(value) => handleChange('transferType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transfer type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {TRANSFER_TYPE_NAMES[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={transferForm.status}
                  onValueChange={(value) => handleChange('status', value as typeof TRANSFER_STATUS[number])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_STATUS.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1">
                <Label htmlFor="source">
                  {transferForm.sourceType === 'warehouse' ? (
                    <span className="flex items-center gap-1"><Boxes className="h-4 w-4" /> Source Warehouse</span>
                  ) : (
                    <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Source Vehicle</span>
                  )}
                </Label>
                <Select
                  value={transferForm.sourceId?.toString() || ''}
                  onValueChange={(value) => handleChange('sourceId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${transferForm.sourceType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getLocationOptions(transferForm.sourceType)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="self-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
              
              <div className="flex-1">
                <Label htmlFor="destination">
                  {transferForm.destinationType === 'warehouse' ? (
                    <span className="flex items-center gap-1"><Boxes className="h-4 w-4" /> Destination Warehouse</span>
                  ) : transferForm.destinationType === 'vehicle' ? (
                    <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Destination Vehicle</span>
                  ) : (
                    <span className="flex items-center gap-1"><Package className="h-4 w-4" /> Client Site</span>
                  )}
                </Label>
                <Select
                  value={transferForm.destinationId?.toString() || ''}
                  onValueChange={(value) => handleChange('destinationId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${transferForm.destinationType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getLocationOptions(transferForm.destinationType)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={transferForm.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any notes about this transfer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Transfer Items
            </CardTitle>
            <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1">
                  <Barcode className="h-4 w-4" />
                  Scan Barcode
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan Inventory Barcode</DialogTitle>
                </DialogHeader>
                <BarcodeScanner 
                  onScan={(result) => {
                    handleBarcodeScanned(result);
                    // Keep the dialog open to allow multiple scans
                  }}
                  onClose={() => setIsBarcodeDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Add items to be transferred. Items can be added by scanning barcodes or selecting from inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="source" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="source">Source Inventory</TabsTrigger>
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="selected">Selected Items ({transferForm.items.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="source" className="min-h-[200px]">
              {!transferForm.sourceId ? (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a source warehouse or vehicle
                </div>
              ) : sourceInventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items found in the selected source
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 bg-muted p-2 rounded-t-md">
                    <div className="col-span-5 font-medium">Item</div>
                    <div className="col-span-3 font-medium">Category</div>
                    <div className="col-span-2 font-medium text-center">Available</div>
                    <div className="col-span-2 font-medium text-right">Action</div>
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {sourceInventory.map((inventoryItem: WarehouseInventory | VehicleInventory) => (
                      <div key={inventoryItem.id} className="grid grid-cols-12 p-2 items-center">
                        <div className="col-span-5 truncate">{inventoryItem.item?.name}</div>
                        <div className="col-span-3 text-muted-foreground capitalize">
                          {inventoryItem.item?.category}
                        </div>
                        <div className="col-span-2 text-center">{inventoryItem.quantity}</div>
                        <div className="col-span-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => inventoryItem.item && addItem(inventoryItem.item)}
                            disabled={inventoryItem.quantity <= 0}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="min-h-[200px]">
              {inventoryItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items found
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 bg-muted p-2 rounded-t-md">
                    <div className="col-span-5 font-medium">Item</div>
                    <div className="col-span-3 font-medium">Category</div>
                    <div className="col-span-2 font-medium">SKU/Barcode</div>
                    <div className="col-span-2 font-medium text-right">Action</div>
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {inventoryItems.map((item: InventoryItem) => (
                      <div key={item.id} className="grid grid-cols-12 p-2 items-center">
                        <div className="col-span-5 truncate">{item.name}</div>
                        <div className="col-span-3 text-muted-foreground capitalize">
                          {item.category}
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground truncate">
                          {item.barcode || item.sku || '-'}
                        </div>
                        <div className="col-span-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => addItem(item)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="selected" className="min-h-[200px]">
              {transferForm.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added to transfer yet
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 bg-muted p-2 rounded-t-md">
                    <div className="col-span-5 font-medium">Item</div>
                    <div className="col-span-3 font-medium">Quantity</div>
                    <div className="col-span-4 font-medium text-right">Actions</div>
                  </div>
                  <div className="divide-y">
                    {transferForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 p-2 items-center">
                        <div className="col-span-5 truncate">{item.name}</div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="h-8 w-24"
                          />
                        </div>
                        <div className="col-span-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={
              !transferForm.sourceId || 
              !transferForm.destinationId || 
              transferForm.items.length === 0 ||
              createTransferMutation.isPending
            }
            className="ml-auto gap-1"
          >
            <Save className="h-4 w-4" />
            {createTransferMutation.isPending ? 'Creating Transfer...' : 'Create Transfer'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default InventoryTransfer;