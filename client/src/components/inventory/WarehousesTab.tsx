import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Warehouse,
  Edit,
  MoreHorizontal,
  Trash2,
  Plus,
  MapPin,
  Phone as PhoneIcon,
  Search,
  Loader2,
} from "lucide-react";

interface WarehouseData {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  managerId: number | null;
  organizationId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface WarehousesTabProps {
  onAddWarehouse?: () => void;
  showAddDialog?: boolean;
  onAddDialogClose?: () => void;
}

const warehouseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zipCode: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  isActive: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export default function WarehousesTab({ onAddWarehouse, showAddDialog, onAddDialogClose }: WarehousesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);

  useEffect(() => {
    if (showAddDialog) {
      setEditingWarehouse(null);
      setDialogOpen(true);
      onAddDialogClose?.();
    }
  }, [showAddDialog]);

  const { data: warehouses = [], isLoading } = useQuery<WarehouseData[]>({
    queryKey: ["/api/inventory/warehouses"],
  });

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseFormValues) => {
      return apiRequest("POST", "/api/inventory/warehouses", {
        ...data,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Warehouse created", description: "New warehouse has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      closeDialog();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create warehouse. ${error.message}`, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WarehouseFormValues }) => {
      return apiRequest("PATCH", `/api/inventory/warehouses/${id}`, {
        ...data,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Warehouse updated", description: "Warehouse has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      closeDialog();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update warehouse. ${error.message}`, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory/warehouses/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Warehouse deleted", description: "Warehouse has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete warehouse. ${error.message}`, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!search) return warehouses;
    const searchLower = search.toLowerCase();
    return warehouses.filter((w) =>
      w.name.toLowerCase().includes(searchLower) ||
      (w.address && w.address.toLowerCase().includes(searchLower)) ||
      (w.city && w.city.toLowerCase().includes(searchLower))
    );
  }, [warehouses, search]);

  function openAddDialog() {
    setEditingWarehouse(null);
    form.reset({
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      isActive: true,
    });
    setDialogOpen(true);
    onAddWarehouse?.();
  }

  function openEditDialog(warehouse: WarehouseData) {
    setEditingWarehouse(warehouse);
    form.reset({
      name: warehouse.name,
      address: warehouse.address || "",
      city: warehouse.city || "",
      state: warehouse.state || "",
      zipCode: warehouse.zipCode || "",
      phone: warehouse.phone || "",
      isActive: warehouse.isActive,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingWarehouse(null);
    form.reset();
  }

  function onSubmit(values: WarehouseFormValues) {
    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  function formatCityStateZip(w: WarehouseData) {
    const parts = [w.city, w.state].filter(Boolean);
    let result = parts.join(", ");
    if (w.zipCode) result += (result ? " " : "") + w.zipCode;
    return result || "-";
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Warehouse className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No warehouses found</p>
              <p className="text-sm">Try adjusting your search or add a new warehouse.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City/State/Zip</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div className="font-medium">{warehouse.name}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {warehouse.address || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCityStateZip(warehouse)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {warehouse.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                            {warehouse.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(warehouse)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(warehouse.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((warehouse) => (
                  <Card key={warehouse.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{warehouse.name}</h4>
                            <Badge variant={warehouse.isActive ? "default" : "secondary"} className="text-xs">
                              {warehouse.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {warehouse.address && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {warehouse.address}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {formatCityStateZip(warehouse)}
                          </div>
                          {warehouse.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <PhoneIcon className="h-3 w-3" />
                              {warehouse.phone}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(warehouse)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(warehouse.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
            <DialogDescription>
              {editingWarehouse
                ? "Update the warehouse details below."
                : "Fill in the details to add a new warehouse location."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this warehouse as active or inactive.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingWarehouse ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this warehouse? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
