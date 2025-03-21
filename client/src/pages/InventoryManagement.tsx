import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { AlertCircle, Warehouse, Truck, BarChart4, Package, ArrowRightLeft, Clipboard, PlusCircle, Edit, Trash, Search, RefreshCw } from 'lucide-react';

// Define InventoryItem type
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  inStock: number;
  imageUrl: string | null;
  isActive: boolean;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  createdAt: string;
  updatedAt: string;
}

// Define Warehouse type
interface Warehouse {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string | null;
  isActive: boolean;
}

// Define TechnicianVehicle type
interface TechnicianVehicle {
  id: number;
  technicianId: number;
  name: string;
  type: string;
  status: string;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
}

// Inventory Transfer types
type TransferType = 'warehouse_to_warehouse' | 'warehouse_to_vehicle' | 'vehicle_to_warehouse' | 'vehicle_to_vehicle';
type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

interface InventoryTransfer {
  id: number;
  transferType: TransferType;
  sourceLocationId: number;
  destinationLocationId: number;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
  scheduledDate: string | null;
  completionDate: string | null;
  initiatedByUserId: number;
  completedByUserId: number | null;
  notes: string | null;
}

// Schema for inventory item form
const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  sku: z.string().min(1, { message: "SKU is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  description: z.string().nullable().optional(),
  unit: z.string().min(1, { message: "Unit is required" }),
  unitPrice: z.coerce.number().min(0, { message: "Price must be a positive number" }),
  inStock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer" }),
  minStockLevel: z.coerce.number().int().min(0).nullable().optional(),
  maxStockLevel: z.coerce.number().int().min(0).nullable().optional(),
  reorderPoint: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

// Schema for warehouse form
const warehouseSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  zipCode: z.string().min(1, { message: "Zip code is required" }),
  phoneNumber: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

// Schema for transfer form
const transferSchema = z.object({
  transferType: z.enum(['warehouse_to_warehouse', 'warehouse_to_vehicle', 'vehicle_to_warehouse', 'vehicle_to_vehicle']),
  sourceLocationId: z.coerce.number().int().positive(),
  destinationLocationId: z.coerce.number().int().positive(),
  scheduledDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch inventory items
  const {
    data: inventoryItems,
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useQuery({
    queryKey: ['/api/inventory/items'],
    queryFn: () => apiRequest('/api/inventory/items'),
  });

  // Fetch warehouses
  const {
    data: warehouses,
    isLoading: isLoadingWarehouses,
    error: warehousesError,
    refetch: refetchWarehouses
  } = useQuery({
    queryKey: ['/api/inventory/warehouses'],
    queryFn: () => apiRequest('/api/inventory/warehouses'),
  });

  // Fetch technician vehicles
  const {
    data: vehicles,
    isLoading: isLoadingVehicles,
    error: vehiclesError
  } = useQuery({
    queryKey: ['/api/inventory/vehicles'],
    queryFn: () => apiRequest('/api/inventory/technician-vehicles'),
  });

  // Fetch transfers
  const {
    data: transfers,
    isLoading: isLoadingTransfers,
    error: transfersError,
    refetch: refetchTransfers
  } = useQuery({
    queryKey: ['/api/inventory/transfers'],
    queryFn: () => apiRequest('/api/inventory/transfers'),
  });

  // Item form
  const itemForm = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      description: '',
      unit: 'each',
      unitPrice: 0,
      inStock: 0,
      minStockLevel: null,
      maxStockLevel: null,
      reorderPoint: null,
      isActive: true,
    },
  });

  // Warehouse form
  const warehouseForm = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phoneNumber: '',
      isActive: true,
    },
  });

  // Transfer form
  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transferType: 'warehouse_to_warehouse',
      sourceLocationId: 0,
      destinationLocationId: 0,
      scheduledDate: null,
      notes: '',
    },
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: (data: InventoryItemFormValues) => 
      apiRequest('/api/inventory/items', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
      setIsAddItemOpen(false);
      itemForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormValues) => 
      apiRequest('/api/inventory/warehouses', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/warehouses'] });
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      setIsAddWarehouseOpen(false);
      warehouseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create warehouse",
        variant: "destructive",
      });
    },
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: (data: TransferFormValues) => 
      apiRequest('/api/inventory/transfers', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/transfers'] });
      toast({
        title: "Success",
        description: "Transfer created successfully",
      });
      setIsAddTransferOpen(false);
      transferForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transfer",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/inventory/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onAddItemSubmit = (data: InventoryItemFormValues) => {
    createItemMutation.mutate(data);
  };

  const onAddWarehouseSubmit = (data: WarehouseFormValues) => {
    createWarehouseMutation.mutate(data);
  };

  const onAddTransferSubmit = (data: TransferFormValues) => {
    createTransferMutation.mutate(data);
  };

  // Transfer logic for destination selection
  const handleTransferTypeChange = (value: string) => {
    transferForm.setValue('transferType', value as TransferType);
    transferForm.setValue('sourceLocationId', 0);
    transferForm.setValue('destinationLocationId', 0);
  };

  // Filter items based on search query
  const filteredItems = inventoryItems?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex space-x-2">
          {activeTab === 'items' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchItems()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {activeTab === 'warehouses' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchWarehouses()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {activeTab === 'transfers' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchTransfers()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="items" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="items" className="flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Items
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center">
            <Warehouse className="h-4 w-4 mr-2" />
            Warehouses
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center">
            <Truck className="h-4 w-4 mr-2" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfers
          </TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>Manage your inventory items</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    className="w-[250px] pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsAddItemOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingItems ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : itemsError ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                  <p className="text-destructive">Failed to load inventory items</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems?.length ? (
                        filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={item.inStock <= (item.reorderPoint || 0) ? "text-destructive font-medium" : ""}>
                                {item.inStock}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.isActive ? "default" : "secondary"}>
                                {item.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedItem(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive/90"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this item?')) {
                                      deleteItemMutation.mutate(item.id);
                                    }
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No inventory items found. {searchQuery && "Try a different search query."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses tab */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Warehouses</CardTitle>
                <CardDescription>Manage your warehouses and storage locations</CardDescription>
              </div>
              <Button onClick={() => setIsAddWarehouseOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingWarehouses ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : warehousesError ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                  <p className="text-destructive">Failed to load warehouses</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Zip</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses?.length ? (
                        warehouses.map((warehouse) => (
                          <TableRow key={warehouse.id}>
                            <TableCell className="font-medium">{warehouse.name}</TableCell>
                            <TableCell>{warehouse.address}</TableCell>
                            <TableCell>{warehouse.city}</TableCell>
                            <TableCell>{warehouse.state}</TableCell>
                            <TableCell>{warehouse.zipCode}</TableCell>
                            <TableCell>
                              <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                                {warehouse.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            No warehouses found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Technician Vehicles</CardTitle>
              <CardDescription>View and manage technician vehicles for inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVehicles ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : vehiclesError ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                  <p className="text-destructive">Failed to load technician vehicles</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Make/Model</TableHead>
                        <TableHead>License Plate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles?.length ? (
                        vehicles.map((vehicle) => (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-medium">{vehicle.name}</TableCell>
                            <TableCell>Tech #{vehicle.technicianId}</TableCell>
                            <TableCell>{vehicle.type}</TableCell>
                            <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                            <TableCell>{vehicle.licensePlate || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={vehicle.status === 'active' ? "default" : "secondary"}>
                                {vehicle.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            No technician vehicles found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers tab */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Transfers</CardTitle>
                <CardDescription>Manage inventory movement between locations</CardDescription>
              </div>
              <Button onClick={() => setIsAddTransferOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Transfer
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : transfersError ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                  <p className="text-destructive">Failed to load transfers</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers?.length ? (
                        transfers.map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>{transfer.transferType.replace(/_/g, ' ')}</TableCell>
                            <TableCell>Location #{transfer.sourceLocationId}</TableCell>
                            <TableCell>Location #{transfer.destinationLocationId}</TableCell>
                            <TableCell>
                              {transfer.scheduledDate 
                                ? new Date(transfer.scheduledDate).toLocaleDateString() 
                                : 'Not scheduled'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  transfer.status === 'completed' 
                                    ? 'default' 
                                    : transfer.status === 'in_transit' 
                                    ? 'outline' 
                                    : transfer.status === 'cancelled' 
                                    ? 'destructive' 
                                    : 'secondary'
                                }
                              >
                                {transfer.status.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Clipboard className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            No transfers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Inventory Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>
              Create a new inventory item with details.
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onAddItemSubmit)} className="space-y-4">
              <FormField
                control={itemForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chemicals">Chemicals</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="parts">Parts</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                        <SelectItem value="supplies">Supplies</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="gallon">Gallon</SelectItem>
                          <SelectItem value="lb">Pound</SelectItem>
                          <SelectItem value="oz">Ounce</SelectItem>
                          <SelectItem value="liter">Liter</SelectItem>
                          <SelectItem value="kg">Kilogram</SelectItem>
                          <SelectItem value="package">Package</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={itemForm.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>In Stock</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Level</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Optional" 
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="reorderPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Optional" 
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Item description (optional)" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive items won't appear in inventory lists
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createItemMutation.isPending}>
                  {createItemMutation.isPending ? "Creating..." : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Warehouse Dialog */}
      <Dialog open={isAddWarehouseOpen} onOpenChange={setIsAddWarehouseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
            <DialogDescription>
              Create a new warehouse or storage location.
            </DialogDescription>
          </DialogHeader>
          <Form {...warehouseForm}>
            <form onSubmit={warehouseForm.handleSubmit(onAddWarehouseSubmit)} className="space-y-4">
              <FormField
                control={warehouseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={warehouseForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Zip code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={warehouseForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Phone number" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive warehouses won't be available for transfers
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createWarehouseMutation.isPending}>
                  {createWarehouseMutation.isPending ? "Creating..." : "Create Warehouse"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Transfer Dialog */}
      <Dialog open={isAddTransferOpen} onOpenChange={setIsAddTransferOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Inventory Transfer</DialogTitle>
            <DialogDescription>
              Move inventory between warehouses and technician vehicles.
            </DialogDescription>
          </DialogHeader>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(onAddTransferSubmit)} className="space-y-4">
              <FormField
                control={transferForm.control}
                name="transferType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Type</FormLabel>
                    <Select 
                      onValueChange={(value) => handleTransferTypeChange(value)} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transfer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="warehouse_to_warehouse">Warehouse to Warehouse</SelectItem>
                        <SelectItem value="warehouse_to_vehicle">Warehouse to Vehicle</SelectItem>
                        <SelectItem value="vehicle_to_warehouse">Vehicle to Warehouse</SelectItem>
                        <SelectItem value="vehicle_to_vehicle">Vehicle to Vehicle</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={transferForm.control}
                  name="sourceLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Location</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transferForm.getValues('transferType') === 'warehouse_to_warehouse' || 
                           transferForm.getValues('transferType') === 'warehouse_to_vehicle' ? (
                             warehouses?.map((warehouse) => (
                               <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                 {warehouse.name}
                               </SelectItem>
                             ))
                           ) : (
                             vehicles?.map((vehicle) => (
                               <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                 {vehicle.name}
                               </SelectItem>
                             ))
                           )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transferForm.control}
                  name="destinationLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Location</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transferForm.getValues('transferType') === 'warehouse_to_warehouse' || 
                           transferForm.getValues('transferType') === 'vehicle_to_warehouse' ? (
                             warehouses?.map((warehouse) => (
                               <SelectItem 
                                 key={warehouse.id} 
                                 value={warehouse.id.toString()}
                                 disabled={warehouse.id === transferForm.getValues('sourceLocationId')}
                               >
                                 {warehouse.name}
                               </SelectItem>
                             ))
                           ) : (
                             vehicles?.map((vehicle) => (
                               <SelectItem 
                                 key={vehicle.id} 
                                 value={vehicle.id.toString()}
                                 disabled={vehicle.id === transferForm.getValues('sourceLocationId')}
                               >
                                 {vehicle.name}
                               </SelectItem>
                             ))
                           )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={transferForm.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transferForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this transfer" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createTransferMutation.isPending}>
                  {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;